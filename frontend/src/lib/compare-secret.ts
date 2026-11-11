import { timingSafeEqual } from "node:crypto";

import { base64ToBytes } from "./vault";

export function safeEqualBase64(left: string, right: string): boolean {
    const a = base64ToBytes(left);
    const b = base64ToBytes(right);
    if (!a || !b || a.length === 0 || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}
