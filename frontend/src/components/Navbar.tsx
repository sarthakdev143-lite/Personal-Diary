"use client";

import { Menu, X, RotateCcw, ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { useDiary } from "@/context/DiaryContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "./AuthButton";
import { signOut, useSession } from "next-auth/react";
import { headerSignOutQuery, homeMenu } from "@/lib/diary/home";

const Switch = ({
    checked,
    onCheckedChange,
}: { checked: boolean; onCheckedChange: () => void }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label="Rotation"
            onClick={onCheckedChange}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer 
                rounded-full border-[3px] border-transparent 
                transition-colors duration-200 ease-in-out
                ${checked ? "bg-white" : "bg-zinc-700"}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block h-4 w-4 rounded-full 
                    bg-zinc-900 shadow transform transition duration-200 ease-in-out
                    ${checked ? "translate-x-5" : "translate-x-0"}
                `}
            />
        </button>
    );
};

const Navbar = () => {
    const [openPath, setOpenPath] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false); // Fix for window.innerWidth issue
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathName = usePathname();
    const { data: session } = useSession();
    const { isRotating, setIsRotating, resetDiaryPosition, bookReady } = useDiary();
    const isDiaryDetailPage = /^\/diary\/.+/.test(pathName);
    const onHome = pathName === "/";
    const menu = homeMenu({ onHome, bookReady, narrow: isMobile, signedIn: !!session });
    const menuOpen = menu.open && openPath === pathName;

    useEffect(() => {
        if (isDiaryDetailPage) return;
        const query = window.matchMedia(headerSignOutQuery);
        const checkScreenSize = () => setIsMobile(query.matches);
        checkScreenSize();
        query.addEventListener("change", checkScreenSize);
        return () => query.removeEventListener("change", checkScreenSize);
    }, [isDiaryDetailPage]);

    const handleToggle = (type: "rotation" | "reset") => {
        if (type === "rotation") setIsRotating(!isRotating);
        if (type === "reset") resetDiaryPosition();
    };

    useEffect(() => {
        if (isDiaryDetailPage) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenPath(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isDiaryDetailPage]);

    if (isDiaryDetailPage) {
        return null;
    }

    return (
        <header className="pointer-events-none fixed inset-x-0 top-0 z-30 pt-8">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-zinc-950 from-75% to-transparent" />
            <nav className="pointer-events-auto relative z-10 mx-auto flex w-[95%] items-center justify-between xs:w-11/12" ref={dropdownRef}>
                {pathName !== "/" && (
                    <Button asChild size="icon" className="mr-4 h-12 w-12 rounded-full border border-white/40 bg-zinc-700 text-zinc-50 shadow-md hover:bg-zinc-600 max-[374px]:mr-2 max-[374px]:h-10 max-[374px]:w-10">
                        <Link href="/" aria-label="Back to home">
                            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                        </Link>
                    </Button>
                )}

                <AuthButton pathName={pathName} />

                {/* Dropdown Trigger */}
                {menu.open && (
                    <Button
                        onClick={() => setOpenPath(menuOpen ? null : pathName)}
                        size="icon"
                        aria-expanded={menuOpen}
                        aria-label={menu.settings ? "Diary settings" : "Account"}
                        className="h-12 w-12 shrink-0 rounded-full border border-white/40 bg-zinc-700 text-zinc-50 shadow-md hover:bg-zinc-600 hover:text-zinc-50 max-[374px]:h-10 max-[374px]:w-10"
                    >
                        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                )}

                {menuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-zinc-900 shadow-lg selection:bg-slate-700">
                        {menu.settings && (
                            <>
                                <div className="border-b border-gray-700 px-4 py-2 text-base font-semibold text-white">Settings</div>
                                <div className="flex items-center justify-between px-4 py-3">
                                    <span className="text-sm text-white">Rotation</span>
                                    <Switch checked={isRotating} onCheckedChange={() => handleToggle("rotation")} />
                                </div>
                                <div className="border-t border-gray-700 px-4 py-3">
                                    <Button
                                        variant="ghost"
                                        className="flex w-full items-center justify-start gap-2 text-sm text-white hover:bg-zinc-800 hover:text-white"
                                        onClick={() => handleToggle("reset")}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Reset Position
                                    </Button>
                                </div>
                            </>
                        )}
                        {menu.account && (
                            <div className={`${menu.settings ? "border-t border-gray-700" : ""} px-3 py-1`}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="h-8 w-full rounded-full bg-zinc-800 text-sm text-red-200 hover:bg-zinc-950 hover:text-red-100"
                                >
                                    Sign Out
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </nav>
        </header>
    );
};

export default Navbar;
