"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthButton } from "./AuthButton";
import { useVault } from "@/context/VaultContext";

const Navbar = () => {
    const pathName = usePathname();
    const { phase, lock } = useVault();
    const isDiaryDetailPage = /^\/diary\/.+/.test(pathName);

    if (isDiaryDetailPage) return null;

    return (
        <header className="fixed top-0 z-30 w-full border-b border-[#2a2620] bg-[#12110f]">
            <nav className="mx-auto flex h-14 max-w-5xl items-center gap-5 px-4 text-sm text-[#e8e2d6]">
                <Link href="/" className="mr-auto">Diary</Link>
                {pathName !== "/" && <Link href="/">Home</Link>}
                <Link href="/pricing">Pricing</Link>
                {phase !== "anonymous" && phase !== "loading" && <Link href="/account">Account</Link>}
                {phase === "unlocked" && (
                    <button type="button" onClick={lock} className="text-[#b7b0a4]">Lock</button>
                )}
                <AuthButton pathName={pathName} />
            </nav>
        </header>
    );
};

export default Navbar;
