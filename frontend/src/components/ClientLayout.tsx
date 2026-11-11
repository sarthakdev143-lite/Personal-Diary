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
            {pathname === '/' && <Diary3D selectedTexture={selectedTexture} />}

            {pathname !== '/' && (
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
