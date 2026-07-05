import { Prisma } from "../../../generated/prisma/client";

export const reviewSearchableFields = [
    "comment",
    "doctor.user.name",
    "doctor.user.email",
    "patient.user.name",
    "patient.user.email",
    "appointment.id"
];

export const reviewFilterableFields = [
    "rating",
    "doctorId",
    "patientId",
    "appointmentId",
    "doctor.user.email",
    "patient.user.email"
];

export const reviewIncludeConfig: Partial<Record<keyof Prisma.ReviewInclude, Prisma.ReviewInclude[keyof Prisma.ReviewInclude]>> = {
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
            }
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
