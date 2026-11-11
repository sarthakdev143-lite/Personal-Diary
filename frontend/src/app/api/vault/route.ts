import { NextResponse } from "next/server";

import { currentUser } from "@/lib/current-user";
import { apiError, readJson } from "@/lib/http";
import { updateUser } from "@/lib/users";
import { isWrapMaterial } from "@/lib/vault";

export async function POST(request: Request) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);
    if (user.wrappedDataKey) return apiError("The vault is already set.", 409);

    const body = await readJson(request);
    if (!isWrapMaterial(body)) return apiError("Invalid vault.", 400);

    await updateUser(user._id, {
        kdfSalt: body.kdfSalt,
        wrappedDataKey: body.wrappedDataKey,
        wrapIv: body.wrapIv,
    });

    return NextResponse.json({ ok: true });
}
