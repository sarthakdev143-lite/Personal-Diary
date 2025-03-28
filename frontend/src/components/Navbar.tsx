"use client";

import { Menu, X, RotateCcw, ArrowBigLeftDash } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { useDiary } from "@/context/DiaryContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "./AuthButton";
import { signOut } from "next-auth/react";

const Switch = ({
    checked,
    onCheckedChange,
}: { checked: boolean; onCheckedChange: () => void }) => {
    return (
        <button
            role="switch"
            aria-checked={checked}
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
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false); // Fix for window.innerWidth issue
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathName = usePathname();
    const { isRotating, setIsRotating, resetDiaryPosition } = useDiary();
    const backButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const checkScreenSize = () => setIsMobile(window.innerWidth <= 400);
        checkScreenSize();
        window.addEventListener("resize", checkScreenSize);
        return () => window.removeEventListener("resize", checkScreenSize);
    }, []);

    const handleToggle = (type: "rotation" | "reset") => {
        if (type === "rotation") setIsRotating(!isRotating);
        if (type === "reset") resetDiaryPosition();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="fixed z-30 w-full mt-8">
            <nav className="flex justify-between mx-auto w-[95%] xs:w-11/12 relative items-center" ref={dropdownRef}>
                {pathName !== "/" && (
                    <Button asChild size={"icon"} className="p-6 rounded-full shadow-md group overflow-hidden mr-4" ref={backButtonRef}>
                        <Link href="/">
                            <div className="relative flex items-center gap-2">
                                <ArrowBigLeftDash style={{ width: "22px", height: "22px" }} className="w-full h-full relative ml-[2.3rem]" />
                                <ArrowBigLeftDash style={{ width: "22px", height: "22px" }} className="w-full h-full relative group-hover:mr-[4.7rem] transition-all duration-300" />
                            </div>
                        </Link>
                    </Button>
                )}

                <AuthButton pathName={pathName} />

                {/* Dropdown Trigger */}
                <Button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    variant="ghost"
                    className={`transition-colors duration-500 ease-in-out py-5 text-white hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 ${pathName === "/" ? "" : "max-xxs:hidden"}`}
                >
                    {isDropdownOpen ? <X size={16}/> : <Menu size={16}/>}
                </Button>

                {/* Dropdown Content */}
                {isDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 rounded-md shadow-lg selection:bg-slate-700">
                        <div className="px-4 py-2 font-semibold text-base text-white border-b border-gray-700">Settings</div>

                        <div className="px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-white">Rotation</span>
                            <Switch checked={isRotating} onCheckedChange={() => handleToggle("rotation")} />
                        </div>

                        <div className="px-4 py-3 border-t border-gray-700">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-sm text-white hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                                onClick={() => handleToggle("reset")}
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset Position
                            </Button>
                        </div>

                        {isMobile && (
                            <div className="px-4 py-3 border-t border-gray-700">
                                <Button
                                    variant="destructive"
                                    onClick={() => signOut({ callbackUrl: "/api/auth/signin" })}
                                    className="text-white px-4 py-[0.3rem] rounded w-full text-center mt-2"
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
