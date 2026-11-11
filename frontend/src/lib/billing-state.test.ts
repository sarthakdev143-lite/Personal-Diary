import { describe, expect, it } from "vitest";

import { billingChange } from "./billing-state";

describe("billingChange", () => {
    it("grants Pro only after a paid checkout", () => {
        expect(billingChange({
            kind: "checkout",
            userId: "user",
            customerId: "cus",
            subscriptionId: "sub",
            paid: true,
        })).toMatchObject({ plan: "pro", subscriptionStatus: "active" });

        expect(billingChange({
            kind: "checkout",
            userId: "user",
            customerId: "cus",
            subscriptionId: "sub",
            paid: false,
        })).toBeNull();
    });

    it("follows the subscription status", () => {
        expect(billingChange({
            kind: "subscription",
            userId: null,
            customerId: "cus",
            subscriptionId: "sub",
            status: "past_due",
        })?.plan).toBe("pro");

        expect(billingChange({
            kind: "subscription",
            userId: "user",
            customerId: "cus",
            subscriptionId: "sub",
            status: "canceled",
        })?.plan).toBe("free");
    });
});
