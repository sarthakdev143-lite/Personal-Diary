"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showSignIn } from "@/lib/diary/session";

export function AuthButton({ pathName }: { pathName: string }) {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    const handleOperation = async (operation: "signin" | "signout") => {
        try {
            setLoading(true);
            if (operation === "signin")
                await signIn();
            else {
                const result = await signOut({ redirect: false, callbackUrl: "/" });
                router.push(result.url ?? "/");
            }
        } finally {
            setLoading(false);
        }
    }

    const profileImage = session?.user?.image || "/favicon.ico";

    return (
        <>
            {
                session ?
                    <div className="mr-3 flex min-w-0 flex-1 items-center justify-between gap-3">
                        <Link
                            href="/diary"
                            aria-label={session.user?.name ? `Your diaries, ${session.user.name}` : "Your diaries"}
                            className={`flex min-w-0 items-center gap-3 rounded-full bg-zinc-800 py-0.5 pr-3.5 transition hover:bg-zinc-900 ${pathName === "/info" ? "max-xxs:ml-auto" : ""}`}
                        >
                            <Image
                                src={profileImage}
                                alt=""
                                width={45}
                                height={45}
                                className="shrink-0 rounded-full"
                            />
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-base capitalize text-zinc-100">{session.user?.name}</span>
                                <span
                                    className="truncate text-xs text-zinc-400"
                                    title={session.user?.email ?? "No email available"}>
                                    {session.user?.email}
                                </span>
                            </div>
                        </Link>

                        <button
                            onClick={() => handleOperation("signout")}
                            className="max-xs:hidden shrink-0 rounded bg-red-500 px-4 py-[0.3rem] text-white"
                        >
                            Sign Out
                        </button>
                    </div> : showSignIn(status) ? <button
                        onClick={() => handleOperation("signin")}
                        className="bg-zinc-900 border border-zinc-700 px-4 py-[0.3rem] text-zinc-300 hover:bg-zinc-800 transition rounded ml-auto mr-3"
                    >
                        Sign in
                    </button> : null
            } {
                loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
            }
        </>
    );
}
