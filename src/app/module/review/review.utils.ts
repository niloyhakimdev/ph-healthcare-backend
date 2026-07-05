import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";

type ReviewDbClient = Prisma.TransactionClient | typeof prisma;

export const getPatientFromAuthUser = async (user: IRequestUser) => {
    if (!user?.userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized: authenticated user is missing.");
    }

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

export const getDoctorFromAuthUser = async (user: IRequestUser) => {
    if (!user?.userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized: authenticated user is missing.");
    }

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

export const recalculateDoctorAverageRating = async (doctorId: string, tx: ReviewDbClient = prisma) => {
    const aggregatedReview = await tx.review.aggregate({
        where: {
            doctorId
        },
        _avg: {
            rating: true
        }
    });

    await tx.doctor.update({
        where: {
            id: doctorId
        },
        data: {
            averageRating: aggregatedReview._avg.rating ?? 0
        }
    });
}
