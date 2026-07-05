import status from "http-status";
import { Prisma, Prescription } from "../../../generated/prisma/client";
import { AppointmentStatus, Role } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { prescriptionFilterableFields, prescriptionIncludeConfig, prescriptionSearchableFields } from "./prescription.constant";
import { ICreatePrescriptionPayload, IUpdatePrescriptionPayload } from "./prescription.interface";
import { getDoctorFromAuthUser, getPatientFromAuthUser } from "./prescription.utils";

const prescriptionDefaultInclude: Prisma.PrescriptionInclude = {
    appointment: {
        include: {
            schedule: true,
            doctor: {
                include: {
                    user: true
                }
            },
            patient: {
                include: {
                    user: true
                }
            },
            payment: true,
            review: true
        }
    },
    doctor: {
        include: {
            user: true
        }
    },
    patient: {
        include: {
            user: true
        }
    }
};

const buildPrescriptionScope = async (user: IRequestUser) => {
    const where: Prisma.PrescriptionWhereInput = {};

    if (user.role === Role.PATIENT) {
        const patientData = await getPatientFromAuthUser(user);
        where.patientId = patientData.id;
    }

    if (user.role === Role.DOCTOR) {
        const doctorData = await getDoctorFromAuthUser(user);
        where.doctorId = doctorData.id;
    }

    return where;
}

const ensurePrescriptionAccess = async (prescription: Pick<Prescription, "doctorId" | "patientId">, user: IRequestUser) => {
    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
        return;
    }

    if (user.role === Role.PATIENT) {
        const patientData = await getPatientFromAuthUser(user);

        if (prescription.patientId !== patientData.id) {
            throw new AppError(status.FORBIDDEN, "You are not allowed to access this prescription.");
        }

        return;
    }

    if (user.role === Role.DOCTOR) {
        const doctorData = await getDoctorFromAuthUser(user);

        if (prescription.doctorId !== doctorData.id) {
            throw new AppError(status.FORBIDDEN, "You are not allowed to access this prescription.");
        }

        return;
    }

    throw new AppError(status.FORBIDDEN, "You are not allowed to access this prescription.");
}

const createPrescription = async (user: IRequestUser, payload: ICreatePrescriptionPayload) => {
    const doctorData = await getDoctorFromAuthUser(user);

    const appointmentData = await prisma.appointment.findUnique({
        where: {
            id: payload.appointmentId
        },
        include: {
            prescription: true
        }
    });

    if (!appointmentData) {
        throw new AppError(status.NOT_FOUND, "Appointment not found.");
    }

    if (appointmentData.doctorId !== doctorData.id) {
        throw new AppError(status.FORBIDDEN, "You can only create prescriptions for your own appointments.");
    }

    if (appointmentData.status === AppointmentStatus.CANCELED) {
        throw new AppError(status.BAD_REQUEST, "Cannot create a prescription for a canceled appointment.");
    }

    if (appointmentData.prescription) {
        throw new AppError(status.CONFLICT, "A prescription already exists for this appointment.");
    }

    const prescription = await prisma.prescription.create({
        data: {
            appointmentId: appointmentData.id,
            doctorId: doctorData.id,
            patientId: appointmentData.patientId,
            followUpDate: payload.followUpDate,
            instructions: payload.instructions
        },
        include: prescriptionDefaultInclude
    });

    return prescription;
}

const getAllPrescriptions = async (user: IRequestUser, query: IQueryParams) => {
    const scope = await buildPrescriptionScope(user);

    const queryBuilder = new QueryBuilder<Prescription, Prisma.PrescriptionWhereInput, Prisma.PrescriptionInclude>(
        prisma.prescription,
        query,
        {
            searchableFields: prescriptionSearchableFields,
            filterableFields: prescriptionFilterableFields
        }
    );

    const prescriptions = await queryBuilder
        .search()
        .filter()
        .where(scope)
        .paginate()
        .include(prescriptionDefaultInclude)
        .sort()
        .fields()
        .dynamicInclude(prescriptionIncludeConfig)
        .execute();

    return prescriptions;
}

const getPrescriptionById = async (id: string, user: IRequestUser) => {
    const prescription = await prisma.prescription.findUnique({
        where: {
            id
        },
        include: prescriptionDefaultInclude
    });

    if (!prescription) {
        throw new AppError(status.NOT_FOUND, "Prescription not found.");
    }

    await ensurePrescriptionAccess(prescription, user);

    return prescription;
}

const updatePrescription = async (id: string, user: IRequestUser, payload: IUpdatePrescriptionPayload) => {
    const existingPrescription = await prisma.prescription.findUnique({
        where: {
            id
        }
    });

    if (!existingPrescription) {
        throw new AppError(status.NOT_FOUND, "Prescription not found.");
    }

    if (user.role === Role.DOCTOR) {
        const doctorData = await getDoctorFromAuthUser(user);

        if (existingPrescription.doctorId !== doctorData.id) {
            throw new AppError(status.FORBIDDEN, "You can only update your own prescriptions.");
        }
    }

    const prescription = await prisma.prescription.update({
        where: {
            id
        },
        data: payload,
        include: prescriptionDefaultInclude
    });

    return prescription;
}

const deletePrescription = async (id: string, user: IRequestUser) => {
    const existingPrescription = await prisma.prescription.findUnique({
        where: {
            id
        }
    });

    if (!existingPrescription) {
        throw new AppError(status.NOT_FOUND, "Prescription not found.");
    }

    if (user.role === Role.DOCTOR) {
        const doctorData = await getDoctorFromAuthUser(user);

        if (existingPrescription.doctorId !== doctorData.id) {
            throw new AppError(status.FORBIDDEN, "You can only delete your own prescriptions.");
        }
    }

    await prisma.prescription.delete({
        where: {
            id
        }
    });

    return {
        message: "Prescription deleted successfully"
    };
}

export const PrescriptionService = {
    createPrescription,
    getAllPrescriptions,
    getPrescriptionById,
    updatePrescription,
    deletePrescription
};
