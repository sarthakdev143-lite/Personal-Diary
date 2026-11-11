import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { billingChange, type BillingNotice } from "@/lib/billing-state";
import { apiError } from "@/lib/http";
import { getStripe } from "@/lib/stripe";
import { findUserById, findUserByStripeCustomer, updateUser } from "@/lib/users";

export const runtime = "nodejs";

function idOf(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
    return "";
}

function noticeFromEvent(event: Stripe.Event): BillingNotice | null {
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        return {
            kind: "checkout",
            userId: session.metadata?.userId || session.client_reference_id || "",
            customerId: idOf(session.customer),
            subscriptionId: idOf(session.subscription),
            paid: session.payment_status === "paid" || session.payment_status === "no_payment_required",
        };
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        return {
            kind: "subscription",
            userId: subscription.metadata?.userId ?? null,
            customerId: idOf(subscription.customer),
            subscriptionId: subscription.id,
            status: event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
        };
    }

    return null;
}

export async function POST(request: Request) {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !secret) return apiError("Billing is not configured.", 503);

    const signature = request.headers.get("stripe-signature");
    if (!signature) return apiError("Missing signature.", 400);

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
    } catch (error) {
        console.error("Rejected Stripe webhook", error);
        return apiError("Invalid signature.", 400);
    }

    const notice = noticeFromEvent(event);
    const change = notice ? billingChange(notice) : null;
    if (!notice || !change) return NextResponse.json({ received: true });

    const user = (notice.userId ? await findUserById(notice.userId) : null)
        ?? await findUserByStripeCustomer(change.stripeCustomerId);
    if (!user) return NextResponse.json({ received: true });

    await updateUser(user._id, {
        plan: change.plan,
        stripeCustomerId: change.stripeCustomerId,
        stripeSubscriptionId: change.stripeSubscriptionId,
        subscriptionStatus: change.subscriptionStatus,
    });

    return NextResponse.json({ received: true });
}
