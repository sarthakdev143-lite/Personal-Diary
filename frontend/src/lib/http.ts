import { NextResponse } from "next/server";

export function apiError(error: string, status: number, code?: string) {
    return NextResponse.json(code ? { error, code } : { error }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
    try {
        return await request.json();
    } catch {
        return undefined;
    }
}
