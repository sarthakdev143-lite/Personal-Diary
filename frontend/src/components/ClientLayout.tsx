"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Diary3D from './Diary3D';
import { useDiary } from '@/context/DiaryContext';

interface ClientLayoutProps {
    children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
    const pathname = usePathname();
    const { selectedTexture } = useDiary();

    return (
        <>
            {/* Conditionally render Diary3D only on home page */}
            {pathname === '/' && <Diary3D selectedTexture={selectedTexture} />}

            {/* Show the background text "DIARY" on all pages except home */}
            {pathname !== '/' && (
                <div className="fixed w-full h-screen z-0">
                    <div id="caption" className="w-full h-screen absolute top-0 left-0 z-0">
                        <div aria-hidden="true" className="absolute left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 transform select-none text-[335px] uppercase text-white min-[1240px]:block">
                            diary
                        </div>
                    </div>
                </div>
            )}

            {children}
        </>
    );
};

export default ClientLayout;
