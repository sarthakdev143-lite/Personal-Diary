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

    if (/^\/diary\/.+/.test(pathName)) return null;

    const signOutAndLock = async () => {
        lock();
        const result = await signOut({ redirect: false, callbackUrl: "/" });
        router.push(result.url ?? "/");
    };

    return (
        <header className="sticky top-0 z-30 w-full border-b border-[#2a2620] bg-[#12110f]">
            <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <Link href="/" className="story-serif text-xl text-[#f3ecdf]">Diary</Link>
                {status === "authenticated" && session ? (
                    <div className="flex items-center gap-6 text-sm text-[#d9d0c3]">
                        <Link href="/account" className="hover:text-[#f3ecdf]">{session.user?.name || "Account"}</Link>
                        {phase === "unlocked" && (
                            <button type="button" onClick={lock} className="hover:text-[#f3ecdf]">Lock</button>
                        )}
                        <button type="button" onClick={signOutAndLock} className="hover:text-[#f3ecdf]">Sign out</button>
                    </div>
                ) : status === "unauthenticated" ? (
                    <Link href="/login" className="text-sm text-[#d9d0c3] hover:text-[#f3ecdf]">Sign in</Link>
                ) : <span />}
            </nav>
        </header>
    );
};

export default Navbar;
