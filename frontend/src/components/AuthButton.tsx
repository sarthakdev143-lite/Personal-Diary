"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export function AuthButton() {
    const { data: session } = useSession();

    if (session) {
        return (
            <div className="flex gap-4 items-center">
                <p>Welcome, {session.user?.name}</p>
                <button
                    onClick={() => signOut()}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn("google")}
            className="bg-blue-500 text-white px-4 py-2 rounded"
        >
            Sign In with Google
        </button>
    );
}