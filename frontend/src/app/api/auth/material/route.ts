import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/email";
import { apiError, readJson } from "@/lib/http";
import { findUserByEmail } from "@/lib/users";

export async function POST(request: Request) {
    const body = await readJson(request) as { email?: unknown } | undefined;
    if (!body) return apiError("Invalid JSON.", 400);

    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    if (!email) return apiError("Email or password is incorrect.", 401);

    const user = await findUserByEmail(email);
    if (!user) return apiError("Email or password is incorrect.", 401);
    if (!user.authVerifier || !user.kdfSalt || !user.wrappedDataKey || !user.wrapIv) {
        return apiError("This email signs in with Google or GitHub.", 409);
    }

    return NextResponse.json({
        kdfSalt: user.kdfSalt,
        wrappedDataKey: user.wrappedDataKey,
        wrapIv: user.wrapIv,
    });
}
