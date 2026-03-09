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
        "A web-based, interactive, and immersive diary experience using three.js. Flip through the pages of my diary and write your thoughts and experiences. The app is built using Next.js, three.js, and TypeScript. Your data is completely encrypted and secure, No one, even we can't read it.",
    keywords: ["Diary", "Next.js", "Three.js", "Encrypted Notes", "Secure Diary", "Digital Journal"],
    openGraph: {
        title: "Diary • @sarthakdev143",
        description:
            "An immersive and encrypted diary experience built with Next.js and Three.js.",
        url: "https://sarthakdev-diary.vercel.app",
        siteName: "Diary",
        images: [{ url: "/diary.jpg" }],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Diary • @sarthakdev143",
        description:
            "An immersive and encrypted diary experience built with Next.js and Three.js.",
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
