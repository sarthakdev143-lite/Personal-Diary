"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import dynamic from "next/dynamic";
import { useDiary } from '@/context/DiaryContext';

const Diary3D = dynamic(() => import("./Diary3D"), { ssr: false });

interface ClientLayoutProps {
    children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
    const pathname = usePathname();
    const { selectedTexture } = useDiary();
    const isHome = pathname === "/";
    const hideBackgroundText = pathname === "/login" || pathname.startsWith("/diary");

    return (
        <>
            {/* Conditionally render Diary3D only on home page */}
            {isHome && <Diary3D selectedTexture={selectedTexture} />}

            {/* Show the background text "DIARY" on all pages except home */}
            {!isHome && !hideBackgroundText && (
                <div className="fixed w-full h-screen z-0">
                    <div id="caption" className="w-full h-screen absolute top-0 left-0 z-0">
                        <h1 className="text-[27vw] text-white uppercase absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 select-none">
                            diary
                        </h1>
                    </div>
                </div>
            )}

            {children}
        </>
    );
};

export default ClientLayout;
