import type { Metadata } from "next";
import "./globals.css";
import 'remixicon/fonts/remixicon.css'
import Head from "next/head";
import Navbar from "@/components/Navbar";
import Diary3D from '@/components/Diary3D';
import { DiaryProvider } from "@/context/DiaryContext";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Diary • Sarthakdev143",
  description:
    "A web-based, interactive, and immersive diary experience using three.js. Flip through the pages of my diary and write your thoughts and experiences. The app is built using Next.js, three.js, and TypeScript. Your data is completely encrypted and secure, No one, even we can't read it.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <Head>
        {/* Basic SEO */}
        <title>Diary • Sarthakdev143</title>
        <meta name="description" content="A web-based, interactive, and immersive diary experience using three.js. Flip through the pages of my diary and write your thoughts and experiences." />
        <meta name="keywords" content="Diary, Next.js, Three.js, Encrypted Notes, Secure Diary, Digital Journal" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* OpenGraph (For Facebook, LinkedIn, etc.) */}
        <meta property="og:title" content="Diary • Sarthakdev143" />
        <meta property="og:description" content="An immersive and encrypted diary experience built with Next.js and Three.js." />
        <meta property="og:image" content="/diary.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sarthakdev-diary.vercel.app" />

        {/* Twitter Card (For Twitter Sharing) */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Diary • Sarthakdev143" />
        <meta name="twitter:description" content="An immersive and encrypted diary experience built with Next.js and Three.js." />
        <meta name="twitter:image" content="/diary.jpg" />

        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </Head>
      <body className="antialiased">
        <DiaryProvider>
          <Providers>
            <Navbar />
            <main>
              <Diary3D />
              {children}
            </main>
          </Providers>
        </DiaryProvider>
      </body>
    </html>
  );
}
