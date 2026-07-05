/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import Stripe from "stripe";
import { PaymentStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { stripe } from "../../config/stripe.config";
import { prisma } from "../../lib/prisma";

const getCheckoutMetadata = (session: Stripe.Checkout.Session) => {
    const appointmentId = session.metadata?.appointmentId;
    const paymentId = session.metadata?.paymentId;

    if (!appointmentId || !paymentId) {
        throw new AppError(status.BAD_REQUEST, "Missing appointmentId or paymentId in checkout session metadata.");
    }

    return {
        appointmentId,
        paymentId,
    };
};

const syncCheckoutSessionPayment = async (
    session: Stripe.Checkout.Session,
    stripeEventId?: string,
) => {
    const { appointmentId, paymentId } = getCheckoutMetadata(session);
    const paymentStatus =
        session.payment_status === "paid" ? PaymentStatus.PAID : PaymentStatus.UNPAID;

    const appointment = await prisma.appointment.findUnique({
        where: {
            id: appointmentId,
        },
        include: {
            payment: true,
        },
    });

    if (!appointment) {
        throw new AppError(status.NOT_FOUND, `Appointment with id ${appointmentId} not found.`);
    }

    if (!appointment.payment || appointment.payment.id !== paymentId) {
        throw new AppError(status.NOT_FOUND, `Payment with id ${paymentId} not found for appointment ${appointmentId}.`);
    }

    await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
            where: {
                id: appointmentId,
            },
            data: {
                paymentStatus,
            },
        });

        await tx.payment.update({
            where: {
                id: paymentId,
            },
            data: {
                ...(stripeEventId ? { stripeEventId } : {}),
                status: paymentStatus,
                paymentGatewayData: session as any,
            },
        });
    });

    return {
        appointmentId,
        paymentId,
        paymentStatus,
    };
};

const confirmCheckoutSessionPayment = async (sessionId: string) => {
    if (!sessionId) {
        throw new AppError(status.BAD_REQUEST, "Stripe checkout session id is required.");
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
        throw new AppError(status.NOT_FOUND, "Stripe checkout session not found.");
    }

    return syncCheckoutSessionPayment(session);
};

const handlerStripeWebhookEvent = async (event: Stripe.Event) => {
    const existingPayment = await prisma.payment.findFirst({
        where: {
            stripeEventId: event.id,
        },
    });

    if (existingPayment) {
        console.log(`Event ${event.id} already processed. Skipping`);
        return { message: `Event ${event.id} already processed. Skipping` };
    }

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const result = await syncCheckoutSessionPayment(session, event.id);

            console.log(
                `Processed checkout.session.completed for appointment ${result.appointmentId} and payment ${result.paymentId}`,
            );
            break;
        }
        case "checkout.session.expired": {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log(`Checkout session ${session.id} expired. Payment remains unpaid.`);
            break;
        }
        case "payment_intent.payment_failed": {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log(`Payment intent ${paymentIntent.id} failed. Payment remains unpaid.`);
            break;
        }
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return { message: `Webhook Event ${event.id} processed successfully` };
};

export const PaymentService = {
    handlerStripeWebhookEvent,
    confirmCheckoutSessionPayment,
};
