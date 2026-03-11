import { NextResponse } from "next/server";

import { getDatabase } from "@/app/api/diaries/_shared";

export async function GET() {
    try {
        const db = await getDatabase();
        await db.command({ ping: 1 });

        return NextResponse.json(
            {
                status: "ok",
                timestamp: new Date().toISOString(),
            },
            { status: 200 }
        );
    } catch {
        return NextResponse.json(
            {
                status: "degraded",
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }
}
