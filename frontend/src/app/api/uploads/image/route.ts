import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { getSessionUserId, hasTrustedOrigin, logApiError } from "@/app/api/diaries/_shared";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
    try {
        if (!hasTrustedOrigin(request)) {
            return NextResponse.json({ error: "Forbidden request origin." }, { status: 403 });
        }

        const userId = await getSessionUserId();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Image file is required." }, { status: 400 });
        }

        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            return NextResponse.json({ error: "Image exceeds the 5MB upload limit." }, { status: 413 });
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName) {
            return NextResponse.json(
                { error: "Cloudinary is not configured. Missing CLOUDINARY_CLOUD_NAME." },
                { status: 500 }
            );
        }

        const cloudinaryPayload = new FormData();
        cloudinaryPayload.append("file", file);
        cloudinaryPayload.append("folder", "rojnishi/entries");

        if (uploadPreset) {
            cloudinaryPayload.append("upload_preset", uploadPreset);
        } else if (apiKey && apiSecret) {
            const timestamp = Math.floor(Date.now() / 1000);
            const toSign = `folder=rojnishi/entries&timestamp=${timestamp}${apiSecret}`;
            const signature = createHash("sha1").update(toSign).digest("hex");

            cloudinaryPayload.append("timestamp", String(timestamp));
            cloudinaryPayload.append("api_key", apiKey);
            cloudinaryPayload.append("signature", signature);
        } else {
            return NextResponse.json(
                {
                    error:
                        "Cloudinary credentials missing. Set CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.",
                },
                { status: 500 }
            );
        }

        const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: "POST",
                body: cloudinaryPayload,
            }
        );

        const uploadJson = (await uploadResponse.json()) as {
            secure_url?: unknown;
            width?: unknown;
            height?: unknown;
            error?: { message?: string };
        };

        if (!uploadResponse.ok || typeof uploadJson.secure_url !== "string") {
            return NextResponse.json(
                {
                    error:
                        uploadJson.error?.message ||
                        "Failed to upload image. Please check Cloudinary configuration.",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            url: uploadJson.secure_url,
            width: typeof uploadJson.width === "number" ? uploadJson.width : null,
            height: typeof uploadJson.height === "number" ? uploadJson.height : null,
        });
    } catch (error) {
        logApiError("Failed to upload image", error);
        return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
    }
}
