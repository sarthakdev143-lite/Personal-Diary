import { NextResponse } from "next/server";

import type { AccountSnapshot } from "@/lib/account";
import { currentUser } from "@/lib/current-user";
import { apiError, readJson } from "@/lib/http";
import { limits, planOf } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { accountFacts, deleteUserCascade } from "@/lib/users";

const DELETE_PHRASE = "delete my diary";

export async function GET() {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const plan = planOf(user.plan);
    const facts = await accountFacts(user._id.toString());
    const snapshot: AccountSnapshot = {
        email: user.email,
        name: user.name,
        plan,
        hasPassword: Boolean(user.authVerifier),
        canManageBilling: Boolean(user.stripeCustomerId),
        vaultConfigured: Boolean(user.kdfSalt && user.wrappedDataKey && user.wrapIv),
        kdfSalt: user.kdfSalt ?? null,
        wrappedDataKey: user.wrappedDataKey ?? null,
        wrapIv: user.wrapIv ?? null,
        usage: { diaries: facts.diaries, entries: facts.entries },
        limits: limits(plan),
    };

    return NextResponse.json(snapshot);
}

export async function DELETE(request: Request) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const body = await readJson(request) as { confirm?: unknown } | undefined;
    if (!body || body.confirm !== DELETE_PHRASE) {
        return apiError("Type the confirmation phrase.", 400);
    }

    if (user.stripeSubscriptionId) {
        const stripe = getStripe();
        if (!stripe) {
            return apiError("Billing is not configured, so the subscription cannot be canceled.", 503);
        }
        try {
            await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        } catch (error) {
            console.error("Failed to cancel subscription", error);
            return apiError("Could not cancel the subscription. Use Manage billing, then try again.", 502);
        }
    }

    await deleteUserCascade(user);
    return NextResponse.json({ ok: true });
}
