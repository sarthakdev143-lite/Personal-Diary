"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";

export function AuthButton() {
    const { data: session } = useSession();

    if (session) {
        return (
            <div className="flex justify-between flex-1 mr-3 gap-3 items-center ">
                <figure className="flex items-center gap-3 pr-1 py-0.5 bg-zinc-800 hover:bg-zinc-900 transition cursor-pointer rounded-l-full rounded-r-[200rem]">
                    <Image
                        src={session.user?.image || ""}
                        alt={session.user?.name || "User profile picture"}
                        width={45}
                        height={45}
                        className="rounded-full"
                    />
                    <div className="flex flex-col">
                        <figcaption className="capitalize text-base">{session.user?.name}</figcaption>
                        <figcaption className="text-xs text-zinc-500 max-w-36 truncate" title={'Email : ' + session.user?.email || ''}>{session.user?.email}</figcaption>
                    </div>
                </figure>
                <button
                    onClick={() => signOut()}
                    className="bg-red-500 text-white px-4 py-[0.525rem] rounded"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn("google")}
            className="bg-zinc-900 border border-zinc-700 px-4 py-[0.3rem] text-zinc-300 hover:bg-zinc-800 transition rounded ml-auto mr-3"
        >
            Sign in
        </button>
    );
}