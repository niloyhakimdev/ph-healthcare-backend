import { Router } from "express";
import { PaymentController } from "./payment.controller";

const router = Router();

router.get("/confirm", PaymentController.confirmCheckoutSessionPayment);

export const PaymentRoutes = router;
