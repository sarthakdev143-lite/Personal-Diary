"use client";

import { Menu, X, RotateCcw, ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { useDiary } from "@/context/DiaryContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "./AuthButton";
import { signOut, useSession } from "next-auth/react";

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
    const { isRotating, setIsRotating, resetDiaryPosition } = useDiary();
    const isDiaryDetailPage = /^\/diary\/.+/.test(pathName);
    const onHome = pathName === "/";
    const showSignOut = isMobile && !!session;
    const showMenu = onHome || showSignOut;
    const menuOpen = showMenu && openPath === pathName;

    useEffect(() => {
        if (isDiaryDetailPage) return;
        const checkScreenSize = () => setIsMobile(window.innerWidth < 400);
        checkScreenSize();
        window.addEventListener("resize", checkScreenSize);
        return () => window.removeEventListener("resize", checkScreenSize);
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
        <header className="fixed z-30 w-full mt-8">
            <nav className="flex justify-between mx-auto w-[95%] xs:w-11/12 relative items-center" ref={dropdownRef}>
                {pathName !== "/" && (
                    <Button asChild size="icon" className="mr-4 h-12 w-12 rounded-full border border-white/40 bg-zinc-700 text-zinc-50 shadow-md hover:bg-zinc-600">
                        <Link href="/" aria-label="Back to home">
                            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                        </Link>
                    </Button>
                )}

                <AuthButton pathName={pathName} />

                {/* Dropdown Trigger */}
                {showMenu && (
                    <Button
                        onClick={() => setOpenPath(menuOpen ? null : pathName)}
                        variant="ghost"
                        aria-expanded={menuOpen}
                        aria-label={onHome ? "Diary settings" : "Account"}
                        className="border border-zinc-700 bg-zinc-900 py-5 text-white transition-colors duration-500 ease-in-out hover:bg-zinc-800 hover:text-white"
                    >
                        {menuOpen ? <X size={16}/> : <Menu size={16}/>}
                    </Button>
                )}

                {menuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 rounded-md bg-zinc-900 shadow-lg selection:bg-slate-700">
                        {onHome && (
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
                        {showSignOut && (
                            <div className={`${onHome ? "border-t border-gray-700" : ""} px-4 py-3`}>
                                <Button
                                    variant="destructive"
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="mt-2 w-full rounded px-4 py-[0.3rem] text-center text-white"
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
