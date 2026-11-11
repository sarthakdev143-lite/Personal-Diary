import type { PlanId } from "./plans";

export type AccountSnapshot = {
    email: string;
    name: string;
    plan: PlanId;
    hasPassword: boolean;
    canManageBilling: boolean;
    vaultConfigured: boolean;
    kdfSalt: string | null;
    wrappedDataKey: string | null;
    wrapIv: string | null;
    usage: { diaries: number; entries: number };
    limits: { diaries: number; entriesPerDiary: number; maxPlaintextChars: number };
};
