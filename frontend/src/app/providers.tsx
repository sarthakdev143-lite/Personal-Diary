"use client";

import { SessionProvider } from "next-auth/react";

import { VaultProvider } from "@/context/VaultContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <VaultProvider>{children}</VaultProvider>
        </SessionProvider>
    );
}
