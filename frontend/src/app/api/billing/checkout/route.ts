import { NextResponse } from "next/server";

import { currentUser } from "@/lib/current-user";
import { apiError, readJson } from "@/lib/http";
import { planOf, PRICES, type BillingInterval } from "@/lib/plans";
import { appOrigin, getStripe } from "@/lib/stripe";
import { updateUser } from "@/lib/users";

function intervalOf(value: unknown): BillingInterval | null {
    if (value === "month" || value === "year") return value;
    return null;
}

export async function POST(request: Request) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);
    if (planOf(user.plan) === "pro") {
        return apiError("You already have Pro. Manage billing from your account.", 409);
    }

    const body = await readJson(request) as { interval?: unknown } | undefined;
    const interval = intervalOf(body?.interval);
    if (!interval) return apiError("Choose a monthly or yearly plan.", 400);

    const stripe = getStripe();
    if (!stripe) return apiError("Billing is not configured.", 503);

    const price = PRICES[interval];
    const userId = user._id.toString();

    try {
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId },
            });
            customerId = customer.id;
            await updateUser(user._id, { stripeCustomerId: customerId });
        }

        const origin = appOrigin(request);
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            client_reference_id: userId,
            line_items: [{
                quantity: 1,
                price_data: {
                    currency: "usd",
                    unit_amount: price.amountCents,
                    recurring: { interval },
                    product_data: { name: "Diary Pro" },
                },
            }],
            metadata: { userId },
            subscription_data: { metadata: { userId } },
            success_url: `${origin}/account?billing=success`,
            cancel_url: `${origin}/pricing?billing=cancel`,
        });

        if (!session.url) return apiError("Could not start checkout.", 502);
        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("Checkout failed", error);
        return apiError("Could not start checkout.", 502);
    }
}
