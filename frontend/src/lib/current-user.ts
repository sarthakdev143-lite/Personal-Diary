import { getServerSession } from "next-auth";

import { authOptions } from "./auth";
import { findUserById, type UserDocument } from "./users";

export async function currentUser(): Promise<UserDocument | null> {
    const session = await getServerSession(authOptions);
    const id = session?.user?.id;
    if (!id) return null;
    return findUserById(id);
}
