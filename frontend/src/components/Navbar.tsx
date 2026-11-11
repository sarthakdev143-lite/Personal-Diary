"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { useVault } from "@/context/VaultContext";

const Navbar = () => {
    const pathName = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const { phase, lock } = useVault();
    const onHome = pathName === "/";

    if (/^\/diary\/.+/.test(pathName)) return null;

    const signOutAndLock = async () => {
        lock();
        const result = await signOut({ redirect: false, callbackUrl: "/" });
        router.push(result.url ?? "/");
    };

    return (
        <header className={`fixed top-0 z-30 w-full ${onHome ? "" : "bg-[#12110f]"}`}>
            <nav className="flex h-16 items-center gap-8 px-6 text-sm text-[#d9d0c3] md:px-16">
                <Link href="/" className="story-serif text-xl text-[#f3ecdf]">Diary</Link>
                {status === "authenticated" && session ? (
                    <>
                        <Link href="/account" className="hover:text-[#f3ecdf]">{session.user?.name || "Account"}</Link>
                        {phase === "unlocked" && (
                            <button type="button" onClick={lock} className="hover:text-[#f3ecdf]">Lock</button>
                        )}
                        <button type="button" onClick={signOutAndLock} className="hover:text-[#f3ecdf]">Sign out</button>
                    </>
                ) : status === "unauthenticated" ? (
                    <Link href="/login" className="hover:text-[#f3ecdf]">Sign in</Link>
                ) : null}
            </nav>
        </header>
    );
};

export default Navbar;
