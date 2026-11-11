import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/email";
import { apiError, readJson } from "@/lib/http";
import { isVaultMaterial } from "@/lib/vault";
import { insertUser, isDuplicateKey } from "@/lib/users";

type SignupBody = {
    email?: unknown;
    name?: unknown;
    authVerifier?: unknown;
    kdfSalt?: unknown;
    wrappedDataKey?: unknown;
    wrapIv?: unknown;
};

export async function POST(request: Request) {
    const body = await readJson(request) as SignupBody | undefined;
    if (!body) return apiError("Invalid JSON.", 400);

    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!email) return apiError("Enter a valid email.", 400);
    if (name.length < 1 || name.length > 80) return apiError("Enter a name up to 80 characters.", 400);
    if (!isVaultMaterial(body)) return apiError("Invalid vault.", 400);

    try {
        await insertUser({
            email,
            name,
            plan: "free",
            authVerifier: body.authVerifier,
            kdfSalt: body.kdfSalt,
            wrappedDataKey: body.wrappedDataKey,
            wrapIv: body.wrapIv,
        });
    } catch (error) {
        if (isDuplicateKey(error)) return apiError("An account with that email already exists.", 409);
        console.error("Failed to create account", error);
        return apiError("Failed to create account.", 500);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
}
