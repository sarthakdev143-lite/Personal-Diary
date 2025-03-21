"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import LenisProvider from "@/components/LenisProvider";
import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/ProtectedRoute";
import Diaries from "@/components/Diaries";

const DiaryDashboard = () => {
    const infoParentRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useGSAP(() => {
        gsap.fromTo(infoParentRef.current,
            { opacity: 0 }, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
        });

        return () => {
            gsap.killTweensOf(infoParentRef.current);
        };
    }, []);

    useEffect(() => {
        searchInputRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key.toLowerCase() === "i") {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <ProtectedRoute>
            <LenisProvider>
                <div
                    id="info-parent"
                    ref={infoParentRef}
                    className="w-full min-h-screen pt-32 bg-black/25 relative backdrop-blur-lg flex flex-col max-xs:px-3 px-4 text-white text-3xl"
                >
                    <div className="mx-auto md:w-[55%] relative xs:w-[80%] w-full flex items-center justify-between gap-3 mb-6">
                        <Input
                            ref={searchInputRef} // Assign ref for focusing
                            type="text"
                            placeholder="Search Diary and Notes..."
                            className="text-lg p-6 py-[1.65rem] bg-white/10 border border-white/15 focus:border-white/50 outline-none rounded-xl text-white placeholder:text-zinc-400"
                        />
                        <div id="keyboard-key" className="flex gap-1 absolute right-6">
                            <span className="bg-zinc-700/70 rounded-md text-zinc-400/90 text-base px-[0.4rem] font-mono">ctrl</span>
                            <span className="bg-zinc-700/70 rounded-md text-zinc-400/90 text-base px-[0.4rem] font-mono">I</span>
                        </div>
                        {/* <Button
                            className="bg-white/80 mix-blend-difference text-black text-lg font-medium p-5 hover:bg-white/75 rounded-md transition-all"
                        >
                            + Add New Diary
                        </Button> */}
                    </div>
                    <div id="diaries" className="w-full max-w-[85%] mx-auto h-auto min-h-screen flex gap-5">
                        <Diaries />
                    </div>
                </div>
            </LenisProvider>
        </ProtectedRoute>
    );
}

export default DiaryDashboard;
