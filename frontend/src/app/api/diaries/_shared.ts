import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { Db, ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export type DiaryDocument = {
    _id?: ObjectId;
    userId: string;
    title: string;
    description: string;
    theme: string;
    createdAt: Date;
    updatedAt: Date;
};

export type EntryDocument = {
    _id?: ObjectId;
    diaryId: ObjectId;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
};

export type DiaryWithId = DiaryDocument & { _id: ObjectId };
export type EntryWithId = EntryDocument & { _id: ObjectId };

type SessionWithId = Session & {
    user?: Session["user"] & { id?: string };
};

type RateLimitBucket = {
    count: number;
    resetAt: number;
};

type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    resetAt: number;
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const objectIdRegex = /^[a-f\d]{24}$/i;
const globalRateLimitStore = globalThis as typeof globalThis & {
    __diaryRateLimitStore?: Map<string, RateLimitBucket>;
};

const rateLimitStore = globalRateLimitStore.__diaryRateLimitStore ?? new Map<string, RateLimitBucket>();
if (!globalRateLimitStore.__diaryRateLimitStore) {
    globalRateLimitStore.__diaryRateLimitStore = rateLimitStore;
}

export async function getSessionUserId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    const userId = (session as SessionWithId | null)?.user?.id;
    return userId ?? null;
}

export async function getDatabase(): Promise<Db> {
    const client = await clientPromise;
    return client.db();
}

export function toObjectId(value: string): ObjectId | null {
    if (!objectIdRegex.test(value) || !ObjectId.isValid(value)) {
        return null;
    }

    return new ObjectId(value);
}

const normalizeOrigin = (value: string | null | undefined): string | null => {
    if (!value) return null;

    try {
        const parsed = new URL(value);
        return `${parsed.protocol}//${parsed.host}`.toLowerCase();
    } catch {
        return null;
    }
};

export function hasTrustedOrigin(request: Request): boolean {
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
        return true;
    }

    const incomingOrigin = normalizeOrigin(request.headers.get("origin"));
    if (!incomingOrigin) {
        return false;
    }

    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";

    const allowedOrigins = new Set<string>();
    if (host) {
        const requestOrigin = normalizeOrigin(`${proto}://${host}`);
        if (requestOrigin) {
            allowedOrigins.add(requestOrigin);
        }
    }

    const envOrigins = [
        process.env.NEXTAUTH_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ];

    envOrigins.forEach((origin) => {
        const normalized = normalizeOrigin(origin);
        if (normalized) {
            allowedOrigins.add(normalized);
        }
    });

    return allowedOrigins.has(incomingOrigin);
}

export function consumeRateLimit({
    key,
    max,
    windowMs,
}: {
    key: string;
    max: number;
    windowMs: number;
}): RateLimitResult {
    const now = Date.now();
    const current = rateLimitStore.get(key);

    if (!current || current.resetAt <= now) {
        const next = { count: 1, resetAt: now + windowMs };
        rateLimitStore.set(key, next);
        return { allowed: true, remaining: max - 1, resetAt: next.resetAt };
    }

    if (current.count >= max) {
        return { allowed: false, remaining: 0, resetAt: current.resetAt };
    }

    current.count += 1;
    rateLimitStore.set(key, current);
    return { allowed: true, remaining: Math.max(0, max - current.count), resetAt: current.resetAt };
}

export function logApiError(message: string, error: unknown) {
    if (process.env.NODE_ENV !== "production") {
        console.error(message, error);
    }
}

export function serializeDiary(diary: DiaryWithId) {
    return {
        _id: diary._id.toString(),
        userId: diary.userId,
        title: diary.title,
        description: diary.description,
        theme: diary.theme,
        createdAt: diary.createdAt.toISOString(),
        updatedAt: diary.updatedAt.toISOString(),
    };
}

export function serializeEntry(entry: EntryWithId) {
    return {
        _id: entry._id.toString(),
        diaryId: entry.diaryId.toString(),
        userId: entry.userId,
        content: entry.content,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
    };
}
