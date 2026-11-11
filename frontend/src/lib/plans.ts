export const PLAN_IDS = ["free", "pro"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export const THEMES = [
    { name: "Leather", url: "/textures/leather-texture.jpg", pro: false },
    { name: "Bound leather", url: "/textures/leather-bound.webp", pro: true },
    { name: "Wood", url: "/textures/wooden_garage_door.webp", pro: true },
] as const;

export const PRICES = {
    month: { amountCents: 800, interval: "month" as const, label: "$8", period: "month" },
    year: { amountCents: 7200, interval: "year" as const, label: "$72", period: "year" },
};

export type BillingInterval = keyof typeof PRICES;

const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

export function planOf(value: string | undefined | null): PlanId {
    return value === "pro" ? "pro" : "free";
}

export function limits(plan: PlanId) {
    if (plan === "pro") {
        return { diaries: 40, entriesPerDiary: 2000, maxPlaintextChars: 100_000 };
    }
    return { diaries: 1, entriesPerDiary: 25, maxPlaintextChars: 8_000 };
}

export function ciphertextLimit(plan: PlanId): number {
    return limits(plan).maxPlaintextChars * 4 + 32;
}

export function themeProblem(plan: PlanId, url: string): "ok" | "unknown" | "upgrade" {
    const theme = THEMES.find((item) => item.url === url);
    if (!theme) return "unknown";
    if (theme.pro && plan !== "pro") return "upgrade";
    return "ok";
}

export function themeAllowed(plan: PlanId, url: string): boolean {
    return themeProblem(plan, url) === "ok";
}

export function isProStatus(status: string): boolean {
    return PRO_STATUSES.has(status);
}
