import { ObjectId, type Db, type OptionalId } from "mongodb";

import type { PlanId } from "./plans";
import { getDatabase } from "./mongodb";

export type UserDocument = {
    _id: ObjectId;
    email: string;
    name: string;
    image?: string | null;
    authVerifier?: string;
    kdfSalt?: string;
    wrappedDataKey?: string;
    wrapIv?: string;
    plan: PlanId;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    createdAt: Date;
    updatedAt: Date;
};

export type UserPatch = Partial<Pick<
    UserDocument,
    | "name"
    | "image"
    | "authVerifier"
    | "kdfSalt"
    | "wrappedDataKey"
    | "wrapIv"
    | "plan"
    | "stripeCustomerId"
    | "stripeSubscriptionId"
    | "subscriptionStatus"
>>;

type NewUser = {
    email: string;
    name: string;
    image?: string | null;
    authVerifier?: string;
    kdfSalt?: string;
    wrappedDataKey?: string;
    wrapIv?: string;
    plan: PlanId;
};

function collection(db: Db) {
    return db.collection<UserDocument>("users");
}

export function isDuplicateKey(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
    const db = await getDatabase();
    return collection(db).findOne({ email });
}

export async function findUserById(id: string): Promise<UserDocument | null> {
    if (!ObjectId.isValid(id)) return null;
    const db = await getDatabase();
    return collection(db).findOne({ _id: new ObjectId(id) });
}

export async function findUserByStripeCustomer(customerId: string): Promise<UserDocument | null> {
    if (!customerId) return null;
    const db = await getDatabase();
    return collection(db).findOne({ stripeCustomerId: customerId });
}

export async function insertUser(input: NewUser): Promise<UserDocument> {
    const db = await getDatabase();
    const now = new Date();
    const document: OptionalId<UserDocument> = {
        email: input.email,
        name: input.name,
        image: input.image ?? null,
        plan: input.plan,
        createdAt: now,
        updatedAt: now,
    };

    if (input.authVerifier && input.kdfSalt && input.wrappedDataKey && input.wrapIv) {
        document.authVerifier = input.authVerifier;
        document.kdfSalt = input.kdfSalt;
        document.wrappedDataKey = input.wrappedDataKey;
        document.wrapIv = input.wrapIv;
    }

    const result = await collection(db).insertOne(document as UserDocument);
    return { ...document, _id: result.insertedId };
}

export async function updateUser(id: ObjectId, patch: UserPatch): Promise<void> {
    const db = await getDatabase();
    await collection(db).updateOne({ _id: id }, { $set: { ...patch, updatedAt: new Date() } });
}

export async function upsertOAuthUser(input: {
    email: string;
    name?: string | null;
    image?: string | null;
}): Promise<UserDocument | null> {
    const email = input.email.trim().toLowerCase();
    const existing = await findUserByEmail(email);
    if (existing) {
        await updateUser(existing._id, {
            name: input.name?.trim() || existing.name,
            image: input.image ?? existing.image ?? null,
        });
        return findUserByEmail(email);
    }

    return insertUser({
        email,
        name: input.name?.trim() || email.split("@")[0] || "Reader",
        image: input.image ?? null,
        plan: "free",
    });
}

export async function accountFacts(userId: string): Promise<{ diaries: number; entries: number }> {
    const db = await getDatabase();
    const [diaries, entries] = await Promise.all([
        db.collection("diaries").countDocuments({ userId }),
        db.collection("entries").countDocuments({ userId }),
    ]);

    return { diaries, entries };
}

export async function deleteUserCascade(user: UserDocument): Promise<void> {
    const db = await getDatabase();
    const userId = user._id.toString();
    await db.collection("entries").deleteMany({ userId });
    await db.collection("diaries").deleteMany({ userId });
    await collection(db).deleteOne({ _id: user._id });
}
