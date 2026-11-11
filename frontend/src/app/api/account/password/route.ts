import { NextResponse } from "next/server";

import { safeEqualBase64 } from "@/lib/compare-secret";
import { currentUser } from "@/lib/current-user";
import { apiError, readJson } from "@/lib/http";
import { updateUser } from "@/lib/users";
import { isVaultMaterial } from "@/lib/vault";

export async function POST(request: Request) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);
    if (!user.authVerifier) return apiError("This account signs in with Google or GitHub.", 400);

    const body = await readJson(request) as { currentVerifier?: unknown; next?: unknown } | undefined;
    if (!body || typeof body.currentVerifier !== "string") return apiError("Invalid JSON.", 400);
    if (!safeEqualBase64(user.authVerifier, body.currentVerifier)) {
        return apiError("Incorrect password.", 401);
    }
    if (!isVaultMaterial(body.next)) return apiError("Invalid vault.", 400);

    await updateUser(user._id, {
        authVerifier: body.next.authVerifier,
        kdfSalt: body.next.kdfSalt,
        wrappedDataKey: body.next.wrappedDataKey,
        wrapIv: body.next.wrapIv,
    });

    return NextResponse.json({ ok: true });
}
