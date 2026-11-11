import type { Metadata, Viewport } from "next";

import "remixicon/fonts/remixicon.css";
import "./globals.css";

import ClientLayout from "@/components/ClientLayout";
import Navbar from "@/components/Navbar";
import { DiaryProvider } from "@/context/DiaryContext";

import { Providers } from "./providers";

export const metadata: Metadata = {
    metadataBase: new URL("https://sarthakdev-diary.vercel.app"),
    title: "Diary • @sarthakdev143",
    description:
        "A private diary. Entries are encrypted in the browser before they are saved.",
    keywords: ["Diary", "Next.js", "Three.js", "Encrypted Notes", "Secure Diary", "Digital Journal"],
    openGraph: {
        title: "Diary • @sarthakdev143",
        description:
            "A private diary. Entries are encrypted in the browser before they are saved.",
        url: "https://sarthakdev-diary.vercel.app",
        siteName: "Diary",
        images: [{ url: "/diary.jpg" }],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Diary • @sarthakdev143",
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
            <body className="custom-scrollbar antialiased">
                <DiaryProvider>
                    <Providers>
                        <Navbar />
                        <main>
                            <ClientLayout>{children}</ClientLayout>
                        </main>
                    </Providers>
                </DiaryProvider>
            </body>
        </html>
    );
}
