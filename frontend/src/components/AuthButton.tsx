"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useRef, useState } from "react";

export function AuthButton({ pathName }: { pathName: string }) {
    const { data: session } = useSession();

    const [loading, setLoading] = useState(false);
    const profileFigureRef = useRef<HTMLUnknownElement>(null);

    const handleOperation = async (operation: "signin" | "signout") => {
        try {
            setLoading(true);
            if (operation === "signin")
                await signIn();
            else
                await signOut();
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <>
            {
                session ?
                    <div className="flex justify-between flex-1 mr-3 gap-3 items-center">
                        <figure ref={profileFigureRef} className={`flex items-center gap-3 pr-3.5 py-0.5 bg-zinc-800 hover:bg-zinc-900 transition cursor-pointer rounded-full ${pathName === '/info' ? 'max-xxs:ml-auto' : ''}`}>
                            <Image
                                src={session.user?.image || ""}
                                alt={session.user?.name || "User profile picture"}
                                width={45}
                                height={45}
                                className="rounded-full"
                            />
                            <div className="flex flex-col overflow-hidden">
                                <figcaption className="capitalize text-base truncate">{session.user?.name}</figcaption>
                                <figcaption
                                    className="text-xs text-zinc-500 max-w-36 truncate overflow-hidden"
                                    title={`Email: ${session.user?.email ?? "No email available"}`}>
                                    {session.user?.email}
                                </figcaption>
                            </div>
                        </figure>

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