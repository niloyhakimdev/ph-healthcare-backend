import { Prisma } from "../../../generated/prisma/client";

export const prescriptionSearchableFields = [
    "instructions",
    "doctor.user.name",
    "doctor.user.email",
    "patient.user.name",
    "patient.user.email",
    "appointment.id"
];

export const prescriptionFilterableFields = [
    "appointmentId",
    "doctorId",
    "patientId",
    "followUpDate",
    "doctor.user.email",
    "patient.user.email"
];

export const prescriptionIncludeConfig: Partial<Record<keyof Prisma.PrescriptionInclude, Prisma.PrescriptionInclude[keyof Prisma.PrescriptionInclude]>> = {
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
            review: true,
            payment: true
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
