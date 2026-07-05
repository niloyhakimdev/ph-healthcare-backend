import status from "http-status";
import { Prisma, Review } from "../../../generated/prisma/client";
import { AppointmentStatus, Role } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { reviewFilterableFields, reviewIncludeConfig, reviewSearchableFields } from "./review.constant";
import { ICreateReviewPayload, IUpdateReviewPayload } from "./review.interface";
import { getDoctorFromAuthUser, getPatientFromAuthUser, recalculateDoctorAverageRating } from "./review.utils";

const reviewDefaultInclude: Prisma.ReviewInclude = {
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

const buildReviewScope = async (user: IRequestUser) => {
    const where: Prisma.ReviewWhereInput = {};

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

const ensureReviewAccess = async (review: Pick<Review, "doctorId" | "patientId">, user: IRequestUser) => {
    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
        return;
    }

    if (user.role === Role.PATIENT) {
        const patientData = await getPatientFromAuthUser(user);

        if (review.patientId !== patientData.id) {
            throw new AppError(status.FORBIDDEN, "You are not allowed to access this review.");
        }

        return;
    }

    if (user.role === Role.DOCTOR) {
        const doctorData = await getDoctorFromAuthUser(user);

        if (review.doctorId !== doctorData.id) {
            throw new AppError(status.FORBIDDEN, "You are not allowed to access this review.");
        }

        return;
    }

    throw new AppError(status.FORBIDDEN, "You are not allowed to access this review.");
}

const createReview = async (user: IRequestUser, payload: ICreateReviewPayload) => {
    const patientData = await getPatientFromAuthUser(user);

    const appointmentData = await prisma.appointment.findUnique({
        where: {
            id: payload.appointmentId
        },
        include: {
            review: true
        }
    });

    if (!appointmentData) {
        throw new AppError(status.NOT_FOUND, "Appointment not found.");
    }

    if (appointmentData.patientId !== patientData.id) {
        throw new AppError(status.FORBIDDEN, "You can only review your own appointment.");
    }

    if (appointmentData.status !== AppointmentStatus.COMPLETED) {
        throw new AppError(status.BAD_REQUEST, "You can only review completed appointments.");
    }

    if (appointmentData.review) {
        throw new AppError(status.CONFLICT, "A review already exists for this appointment.");
    }

    const review = await prisma.$transaction(async (tx) => {
        const createdReview = await tx.review.create({
            data: {
                appointmentId: appointmentData.id,
                doctorId: appointmentData.doctorId,
                patientId: patientData.id,
                rating: payload.rating,
                comment: payload.comment
            },
            include: reviewDefaultInclude
        });

        await recalculateDoctorAverageRating(appointmentData.doctorId, tx);

        return createdReview;
    });

    return review;
}

const getAllReviews = async (user: IRequestUser, query: IQueryParams) => {
    const scope = await buildReviewScope(user);

    const queryBuilder = new QueryBuilder<Review, Prisma.ReviewWhereInput, Prisma.ReviewInclude>(
        prisma.review,
        query,
        {
            searchableFields: reviewSearchableFields,
            filterableFields: reviewFilterableFields
        }
    );

    const reviews = await queryBuilder
        .search()
        .filter()
        .where(scope)
        .paginate()
        .include(reviewDefaultInclude)
        .sort()
        .fields()
        .dynamicInclude(reviewIncludeConfig)
        .execute();

    return reviews;
}

const getReviewById = async (id: string, user: IRequestUser) => {
    const review = await prisma.review.findUnique({
        where: {
            id
        },
        include: reviewDefaultInclude
    });

    if (!review) {
        throw new AppError(status.NOT_FOUND, "Review not found.");
    }

    await ensureReviewAccess(review, user);

    return review;
}

const updateReview = async (id: string, user: IRequestUser, payload: IUpdateReviewPayload) => {
    const patientData = await getPatientFromAuthUser(user);

    const existingReview = await prisma.review.findUnique({
        where: {
            id
        }
    });

    if (!existingReview) {
        throw new AppError(status.NOT_FOUND, "Review not found.");
    }

    if (existingReview.patientId !== patientData.id) {
        throw new AppError(status.FORBIDDEN, "You can only update your own review.");
    }

    const updatedReview = await prisma.$transaction(async (tx) => {
        const review = await tx.review.update({
            where: {
                id
            },
            data: payload,
            include: reviewDefaultInclude
        });

        await recalculateDoctorAverageRating(existingReview.doctorId, tx);

        return review;
    });

    return updatedReview;
}

const deleteReview = async (id: string, user: IRequestUser) => {
    const existingReview = await prisma.review.findUnique({
        where: {
            id
        }
    });

    if (!existingReview) {
        throw new AppError(status.NOT_FOUND, "Review not found.");
    }

    if (user.role === Role.PATIENT) {
        const patientData = await getPatientFromAuthUser(user);

        if (existingReview.patientId !== patientData.id) {
            throw new AppError(status.FORBIDDEN, "You can only delete your own review.");
        }
    }

    if (user.role === Role.DOCTOR) {
        throw new AppError(status.FORBIDDEN, "Doctors are not allowed to delete reviews.");
    }

    await prisma.$transaction(async (tx) => {
        await tx.review.delete({
            where: {
                id
            }
        });

        await recalculateDoctorAverageRating(existingReview.doctorId, tx);
    });

    return {
        message: "Review deleted successfully"
    };
}

export const ReviewService = {
    createReview,
    getAllReviews,
    getReviewById,
    updateReview,
    deleteReview
};
