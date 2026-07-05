import z from "zod";

const createReviewZodSchema = z.object({
    appointmentId: z.uuid("Appointment ID must be a valid UUID"),
    rating: z.number("Rating must be a number").min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
    comment: z.string("Comment must be a string").max(1000, "Comment cannot exceed 1000 characters").optional()
});

const updateReviewZodSchema = z.object({
    rating: z.number("Rating must be a number").min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5").optional(),
    comment: z.string("Comment must be a string").max(1000, "Comment cannot exceed 1000 characters").optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update a review"
});

export const ReviewValidation = {
    createReviewZodSchema,
    updateReviewZodSchema
};
