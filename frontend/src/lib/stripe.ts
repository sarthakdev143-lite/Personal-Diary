import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    if (!stripe) stripe = new Stripe(key);
    return stripe;
}

export function appOrigin(request: Request): string {
    const configured = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
    if (configured) return configured;
    return new URL(request.url).origin;
}
