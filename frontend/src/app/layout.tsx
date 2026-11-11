import type { Metadata, Viewport } from "next";

import "./globals.css";

import Navbar from "@/components/Navbar";

import { Providers } from "./providers";

export const metadata: Metadata = {
    metadataBase: new URL("https://sarthakdev-diary.vercel.app"),
    title: "Diary",
    description:
        "A private diary. Entries are encrypted in the browser before they are saved.",
    keywords: ["Diary", "Encrypted notes", "Private journal"],
    openGraph: {
        title: "Diary",
        description:
            "A private diary. Entries are encrypted in the browser before they are saved.",
        url: "https://sarthakdev-diary.vercel.app",
        siteName: "Diary",
        images: [{ url: "/diary.jpg" }],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Diary",
        description:
            "A private diary. Entries are encrypted in the browser before they are saved.",
        images: ["/diary.jpg"],
    },
    icons: {
        icon: "/favicon.ico",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body className="dark custom-scrollbar bg-[#12110f] text-[#e8e2d6] antialiased">
                <Providers>
                    <Navbar />
                    <main>{children}</main>
                </Providers>
            </body>
        </html>
    );
}
