import status from "http-status";
import { v7 as uuidv7 } from "uuid";
import { PaymentStatus, Role } from "../../../generated/prisma/enums";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { AppointmentStatus } from './../../../generated/prisma/enums';
import { IBookAppointmentPayload } from "./appointment.interface";

const buildStripeSuccessRedirectUrl = (appointmentId: string, paymentId: string) =>
    `${envVars.BETTER_AUTH_URL}/api/v1/payments/confirm?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}&payment_id=${paymentId}`;

const buildAppointmentsPageUrl = (appointmentId?: string, error?: string) => {
    const url = new URL(`${envVars.FRONTEND_URL}/dashboard/my-appointments`);

    if (appointmentId) {
        url.searchParams.set("appointmentId", appointmentId);
    }

    if (error) {
        url.searchParams.set("error", error);
    }

    return url.toString();
};

const getPatientFromAuthUser = async (user: IRequestUser) => {
    const patientData =
        await prisma.patient.findUnique({
            where: {
                userId: user.userId
            }
        }) ??
        (
            user.email
                ? await prisma.patient.findUnique({
                    where: {
                        email: user.email
                    }
                })
                : null
        );

    if (!patientData || patientData.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Patient profile not found for this account.");
    }

    return patientData;
}

const getDoctorFromAuthUser = async (user: IRequestUser) => {
    const doctorData =
        await prisma.doctor.findUnique({
            where: {
                userId: user.userId
            }
        }) ??
        (
            user.email
                ? await prisma.doctor.findUnique({
                    where: {
                        email: user.email
                    }
                })
                : null
        );

    if (!doctorData || doctorData.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Doctor profile not found for this account.");
    }

    return doctorData;
}

const getDoctorByIdOrThrow = async (doctorId: string) => {
    const doctorData = await prisma.doctor.findFirst({
        where: {
            id: doctorId,
            isDeleted: false,
        }
    });

    if (!doctorData) {
        throw new AppError(status.NOT_FOUND, "Doctor not found.");
    }

    return doctorData;
}

const getAvailableDoctorScheduleOrThrow = async (doctorId: string, scheduleId: string) => {
    const doctorSchedule = await prisma.doctorSchedules.findUnique({
        where: {
            doctorId_scheduleId: {
                doctorId,
                scheduleId,
            }
        },
        include: {
            schedule: true
        }
    });

    if (!doctorSchedule) {
        throw new AppError(status.NOT_FOUND, "Doctor schedule not found.");
    }

    if (doctorSchedule.isBooked) {
        throw new AppError(status.CONFLICT, "This schedule is already booked.");
    }

    if (doctorSchedule.schedule.startDateTime <= new Date()) {
        throw new AppError(status.BAD_REQUEST, "This schedule is no longer available.");
    }

    return doctorSchedule;
}

// Pay Now Book Appointment
const bookAppointment = async (payload : IBookAppointmentPayload, user : IRequestUser) => {
   const patientData = await getPatientFromAuthUser(user);
   const doctorData = await getDoctorByIdOrThrow(payload.doctorId);
   const doctorSchedule = await getAvailableDoctorScheduleOrThrow(doctorData.id, payload.scheduleId);

    const videoCallingId = String(uuidv7());

    const result = await prisma.$transaction(async (tx) => {
        const appointmentData = await tx.appointment.create({
            data : {
                doctorId : payload.doctorId,
                patientId : patientData.id,
                scheduleId : doctorSchedule.scheduleId,
                videoCallingId,
            }
        });

        await tx.doctorSchedules.update({
            where : {
                doctorId_scheduleId:{
                    doctorId : payload.doctorId,
                    scheduleId : payload.scheduleId,
                }
            },
            data : {
                isBooked : true,
            }
        });

        const transactionId = String(uuidv7());

        const paymentData = await tx.payment.create({
            data : {
                appointmentId : appointmentData.id,
                amount : doctorData.appointmentFee,
                transactionId
            }
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items :[
                {
                    price_data:{
                        currency:"bdt",
                        product_data:{
                            name : `Appointment with Dr. ${doctorData.name}`,
                        },
                        unit_amount : doctorData.appointmentFee * 100,
                    },
                    quantity : 1,
                }
            ],
            metadata:{
                appointmentId : appointmentData.id,
                paymentId : paymentData.id,
            },

            success_url: buildStripeSuccessRedirectUrl(appointmentData.id, paymentData.id),
            cancel_url: buildAppointmentsPageUrl(appointmentData.id, "payment_cancelled"),
        })

        return {
            appointmentData,
            paymentData,
            paymentUrl : session.url,
        };
    });

    return {
        appointment : result.appointmentData,
        payment : result.paymentData,
        paymentUrl : result.paymentUrl,
    };
}

const getMyAppointments = async (user: IRequestUser) => {
    let appointments = [];

    if (user.role === Role.PATIENT) {
        const patientData = await getPatientFromAuthUser(user);
        appointments = await prisma.appointment.findMany({
            where: {
                patientId: patientData.id
            },
            include: {
                doctor: true,
                schedule: true,
                payment: true,
            }
        });
    } else if (user.role === Role.DOCTOR) {
        const doctorData = await getDoctorFromAuthUser(user);
        appointments = await prisma.appointment.findMany({
            where: {
                doctorId: doctorData.id
            },
            include: {
                patient: true,
                schedule: true,
                payment: true,
            }
        });
    } else {
        throw new AppError(status.FORBIDDEN, "You are not allowed to access appointments.");
    }

    return appointments;

}

const changeAppointmentStatus = async (appointmentId: string, appointmentStatus: AppointmentStatus, user: IRequestUser) => {
    const appointmentData = await prisma.appointment.findUniqueOrThrow({
        where: {
            id: appointmentId,
        },
        include: {
            doctor: true
        }
    });

    if (user?.role === Role.DOCTOR) {
        const doctorData = await getDoctorFromAuthUser(user);

        if (doctorData.id !== appointmentData.doctorId) {
            throw new AppError(status.BAD_REQUEST, "This is not your appointment")
        }
    }

    return await prisma.appointment.update({
        where: {
            id: appointmentId
        },
        data: {
            status: appointmentStatus
        }
    })

}

const getMySingleAppointment = async (appointmentId: string, user: IRequestUser) => {

    let appointment;

    if (user.role === Role.PATIENT) {
        const patientData = await getPatientFromAuthUser(user);
        appointment = await prisma.appointment.findFirst({
            where: {
                id: appointmentId,
                patientId: patientData.id
            },
            include: {
                doctor: true,
                schedule: true,
                payment: true,
            }
        });
    } else if (user.role === Role.DOCTOR) {
        const doctorData = await getDoctorFromAuthUser(user);
        appointment = await prisma.appointment.findFirst({
            where: {
                id: appointmentId,
                doctorId: doctorData.id
            },
            include: {
                patient: true,
                schedule: true,
                payment: true,
            }
        });
    }

    if (!appointment) {
        throw new AppError(status.NOT_FOUND, "Appointment not found");
    }

    return appointment;
}

const getAllAppointments = async () => {
    const appointments = await prisma.appointment.findMany({
        include: {
            doctor: true,
            patient: true,
            schedule: true,
            payment: true,
        }
    });
    return appointments;
}

const bookAppointmentWithPayLater = async (payload : IBookAppointmentPayload, user : IRequestUser) => {
    const patientData = await getPatientFromAuthUser(user);
    const doctorData = await getDoctorByIdOrThrow(payload.doctorId);
    const doctorSchedule = await getAvailableDoctorScheduleOrThrow(doctorData.id, payload.scheduleId);

    const videoCallingId = String(uuidv7());

    const result = await prisma.$transaction(async (tx) => {
        const appointmentData = await tx.appointment.create({
            data: {
                doctorId: payload.doctorId,
                patientId: patientData.id,
                scheduleId: doctorSchedule.scheduleId,
                videoCallingId,
            }
        });

        await tx.doctorSchedules.update({
            where: {
                doctorId_scheduleId: {
                    doctorId: payload.doctorId,
                    scheduleId: payload.scheduleId,
                }
            },
            data: {
                isBooked: true,
            }
        });

        const transactionId = String(uuidv7());

        const paymentData = await tx.payment.create({
            data: {
                appointmentId: appointmentData.id,
                amount: doctorData.appointmentFee,
                transactionId,
             }
        });

        return {
            appointment: appointmentData,
            payment: paymentData
        };

    });

    return result;
}

const initiatePayment = async (appointmentId: string, user : IRequestUser) => {
    const patientData = await getPatientFromAuthUser(user);

    const appointmentData = await prisma.appointment.findFirst({
        where: {
            id: appointmentId,
            patientId: patientData.id,
        },
        include: {
            doctor: true,
            payment : true,
        }
    });

    if(!appointmentData){
        throw new AppError(status.NOT_FOUND, "Appointment not found");
    }

    if(!appointmentData.payment){
        throw new AppError(status.NOT_FOUND, "Payment data not found for this appointment");
    }

    if(appointmentData.payment?.status === PaymentStatus.PAID){
        throw new AppError(status.BAD_REQUEST, "Payment already completed for this appointment");
    };

    if(appointmentData.status === AppointmentStatus.CANCELED){
        throw new AppError(status.BAD_REQUEST, "Appointment is canceled");
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: "bdt",
                    product_data: {
                        name: `Appointment with Dr. ${appointmentData.doctor.name}`,
                    },
                    unit_amount: appointmentData.doctor.appointmentFee * 100,
                },
                quantity: 1,
            }
        ],
        metadata: {
            appointmentId: appointmentData.id,
            paymentId: appointmentData.payment.id,
        },

        success_url: buildStripeSuccessRedirectUrl(appointmentData.id, appointmentData.payment.id),
        cancel_url: buildAppointmentsPageUrl(appointmentData.id, "payment_cancelled"),
    })

    return {
        paymentUrl: session.url,
    }
}

const cancelUnpaidAppointments = async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const unpaidAppointments = await prisma.appointment.findMany({
        where: {
            createdAt: {
                lte: thirtyMinutesAgo,
            },
            paymentStatus: PaymentStatus.UNPAID,
        },
    });

    const appointmentToCancel = unpaidAppointments.map(appointment => appointment.id);

    await prisma.$transaction(async (tx) => {

        await tx.appointment.updateMany({
            where: {
                id: {
                    in: appointmentToCancel,
                },
            },
            data: {
                status: AppointmentStatus.CANCELED,
            },
        });

        await tx.payment.deleteMany({
            where: {
                appointmentId: {
                    in: appointmentToCancel,
                },
            },
        });

        for(const unpaidAppointment of unpaidAppointments){
            await tx.doctorSchedules.update({
                where: {
                    doctorId_scheduleId: {
                        doctorId: unpaidAppointment.doctorId,
                        scheduleId: unpaidAppointment.scheduleId,
                    },
                },
                data: {
                    isBooked: false,
                },
            });
        }
    });
}



export const AppointmentService = {
    bookAppointment,
    getMyAppointments,
    changeAppointmentStatus,
    getMySingleAppointment,
    getAllAppointments,
    bookAppointmentWithPayLater,
    initiatePayment,
    cancelUnpaidAppointments,
}
