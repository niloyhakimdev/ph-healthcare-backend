 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import status from "http-status";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";

const handleStripeWebhookEvent = catchAsync(async (req : Request, res : Response) => {
    const signature = req.headers['stripe-signature'] as string
    const webhookSecret = envVars.STRIPE.STRIPE_WEBHOOK_SECRET;

    if(!signature || !webhookSecret){
        console.error("Missing Stripe signature or webhook secret");
        return res.status(status.BAD_REQUEST).json({message : "Missing Stripe signature or webhook secret"})
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (error : any) {
        console.error("Error processing Stripe webhook:", error);
        return res.status(status.BAD_REQUEST).json({message : "Error processing Stripe webhook"})
    }

    try {
        const result = await PaymentService.handlerStripeWebhookEvent(event);

        sendResponse(res, {
            httpStatusCode : status.OK,
            success : true,
            message : "Stripe webhook event processed successfully",
            data : result
        })
    } catch (error) {
        console.error("Error handling Stripe webhook event:", error);
        sendResponse(res, {
            httpStatusCode : status.INTERNAL_SERVER_ERROR,
            success : false,
            message : "Error handling Stripe webhook event"
        })
    }
})

const confirmCheckoutSessionPayment = catchAsync(async (req: Request, res: Response) => {
    const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";
    const fallbackAppointmentId =
        typeof req.query.appointment_id === "string" ? req.query.appointment_id : "";
    const fallbackPaymentId =
        typeof req.query.payment_id === "string" ? req.query.payment_id : "";

    const redirectUrl = new URL(`${envVars.FRONTEND_URL}/dashboard/payment/success`);

    if (sessionId) {
        redirectUrl.searchParams.set("session_id", sessionId);
    }

    try {
        const result = await PaymentService.confirmCheckoutSessionPayment(sessionId);

        redirectUrl.searchParams.set("appointment_id", result.appointmentId);
        redirectUrl.searchParams.set("payment_id", result.paymentId);
        redirectUrl.searchParams.set("payment_status", result.paymentStatus);
    } catch (error) {
        console.error("Error confirming Stripe checkout session payment:", error);

        if (fallbackAppointmentId) {
            redirectUrl.searchParams.set("appointment_id", fallbackAppointmentId);
        }

        if (fallbackPaymentId) {
            redirectUrl.searchParams.set("payment_id", fallbackPaymentId);
        }

        redirectUrl.searchParams.set("payment_status", "UNPAID");
        redirectUrl.searchParams.set("confirmation_error", "true");
    }

    return res.redirect(redirectUrl.toString());
});

export const PaymentController = {
    handleStripeWebhookEvent,
    confirmCheckoutSessionPayment,
}
