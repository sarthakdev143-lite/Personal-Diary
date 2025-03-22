"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import LenisProvider from "@/components/LenisProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"
import { RiAddCircleLine } from "@remixicon/react";;
import ProtectedRoute from "@/components/ProtectedRoute";
import Diaries from "@/components/Diaries";
import NewDiaryForm from "@/components/NewDiaryForm";

const DiaryDashboard = () => {
    const infoParentRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [newDiaryFormActive, setNewDiaryFormActive] = useState(false);

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
                    <div className="mx-auto md:w-[55%] xs:w-[80%] w-full flex items-center justify-between gap-3 mb-6 sticky top-[16%]">
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
                        <Button onClick={() => setNewDiaryFormActive(true)} id="add-new-diary" className="h-36 p-6 rounded-xl bg-zinc-600/10 hover:bg-zinc-700/15 mix-blend-difference shadow-lg flex flex-col items-center text-white/80 max-w-xs group border border-white/10 hover:border-white/30 transition-[border]">
                            <div className="p-3 rounded-lg bg-white/10 mb-3 group-hover:bg-white/15 transition-[border] border border-white/10 group-hover:border-white/30">
                                <RiAddCircleLine size={20} />
                            </div>
                            <h2 className="font-medium text-lg">+ Add New Diary</h2>
                        </Button >
                    </div>
                </div>
                <NewDiaryForm formActive={newDiaryFormActive} setFormActive={setNewDiaryFormActive} />
            </LenisProvider>
        </ProtectedRoute>
    );
}

export default DiaryDashboard;
