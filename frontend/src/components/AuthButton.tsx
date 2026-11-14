"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthButton({ pathName }: { pathName: string }) {
    const { data: session } = useSession();
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
                    <div className="flex justify-between flex-1 mr-3 gap-3 items-center">
                        <Link
                            href="/diary"
                            aria-label={session.user?.name ? `Your diaries, ${session.user.name}` : "Your diaries"}
                            className={`flex items-center gap-3 rounded-full bg-zinc-800 py-0.5 pr-3.5 transition hover:bg-zinc-900 ${pathName === "/info" ? "max-xxs:ml-auto" : ""}`}
                        >
                            <Image
                                src={profileImage}
                                alt=""
                                width={45}
                                height={45}
                                className="rounded-full"
                            />
                            <div className="flex flex-col overflow-hidden">
                                <span className="truncate text-base capitalize text-zinc-100">{session.user?.name}</span>
                                <span
                                    className="max-w-36 truncate overflow-hidden text-xs text-zinc-400"
                                    title={`Email: ${session.user?.email ?? "No email available"}`}>
                                    {session.user?.email}
                                </span>
                            </div>
                        </Link>

                        <button
                            onClick={() => handleOperation("signout")}
                            className="max-xs:hidden bg-red-500 text-white px-4 py-[0.3rem] rounded"
                        >
                            Sign Out
                        </button>
                    </div> : <button
                        onClick={() => handleOperation("signin")}
                        className="bg-zinc-900 border border-zinc-700 px-4 py-[0.3rem] text-zinc-300 hover:bg-zinc-800 transition rounded ml-auto mr-3"
                    >
                        Sign in
                    </button>
            } {
                loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
            }
        </>
    );
}
