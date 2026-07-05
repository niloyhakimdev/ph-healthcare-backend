import { Request, Response } from "express";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const user = req.user;

    const review = await ReviewService.createReview(user, payload);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Review created successfully",
        data: review
    });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const query = req.query;

    const reviews = await ReviewService.getAllReviews(user, query as IQueryParams);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Reviews retrieved successfully",
        data: reviews.data,
        meta: reviews.meta
    });
});

const getReviewById = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const { id } = req.params;

    const review = await ReviewService.getReviewById(id as string, user);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Review retrieved successfully",
        data: review
    });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const { id } = req.params;
    const payload = req.body;

    const review = await ReviewService.updateReview(id as string, user, payload);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Review updated successfully",
        data: review
    });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const { id } = req.params;

    const result = await ReviewService.deleteReview(id as string, user);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Review deleted successfully",
        data: result
    });
});

export const ReviewController = {
    createReview,
    getAllReviews,
    getReviewById,
    updateReview,
    deleteReview
};
