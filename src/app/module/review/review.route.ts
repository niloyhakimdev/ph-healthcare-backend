import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

router.post("/", checkAuth(Role.PATIENT), validateRequest(ReviewValidation.createReviewZodSchema), ReviewController.createReview);
router.get("/", checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN), ReviewController.getAllReviews);
router.get("/:id", checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN), ReviewController.getReviewById);
router.patch("/:id", checkAuth(Role.PATIENT), validateRequest(ReviewValidation.updateReviewZodSchema), ReviewController.updateReview);
router.delete("/:id", checkAuth(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN), ReviewController.deleteReview);

export const ReviewRoutes = router;
