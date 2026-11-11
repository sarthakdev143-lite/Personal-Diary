import { isProStatus, type PlanId } from "./plans";

export type BillingChange = {
    plan: PlanId;
    subscriptionStatus: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
};

export type CheckoutNotice = {
    kind: "checkout";
    userId: string;
    customerId: string;
    subscriptionId: string;
    paid: boolean;
};

export type SubscriptionNotice = {
    kind: "subscription";
    userId: string | null;
    customerId: string;
    subscriptionId: string;
    status: string;
};

export type BillingNotice = CheckoutNotice | SubscriptionNotice;

export function billingChange(notice: BillingNotice): BillingChange | null {
    if (notice.kind === "checkout") {
        if (!notice.paid || !notice.userId || !notice.customerId || !notice.subscriptionId) return null;
        return {
            plan: "pro",
            subscriptionStatus: "active",
            stripeCustomerId: notice.customerId,
            stripeSubscriptionId: notice.subscriptionId,
        };
    }

    if (!notice.customerId || !notice.subscriptionId || !notice.status) return null;
    return {
        plan: isProStatus(notice.status) ? "pro" : "free",
        subscriptionStatus: notice.status,
        stripeCustomerId: notice.customerId,
        stripeSubscriptionId: notice.subscriptionId,
    };
}
