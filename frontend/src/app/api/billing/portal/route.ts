import { NextResponse } from "next/server";

import { currentUser } from "@/lib/current-user";
import { apiError } from "@/lib/http";
import { appOrigin, getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);
    if (!user.stripeCustomerId) return apiError("No billing account yet.", 400);

    const stripe = getStripe();
    if (!stripe) return apiError("Billing is not configured.", 503);

    try {
        const portal = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${appOrigin(request)}/account`,
        });
        return NextResponse.json({ url: portal.url });
    } catch (error) {
        console.error("Billing portal failed", error);
        return apiError("Could not open billing.", 502);
    }
}
