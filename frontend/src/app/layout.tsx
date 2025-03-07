import type { Metadata } from "next";
import "./globals.css";
import 'remixicon/fonts/remixicon.css'
import Head from "next/head";
import Navbar from "@/components/Navbar";
import Diary3D from '@/components/Diary3D';
import { DiaryProvider } from "@/context/DiaryContext";
// import { Providers } from './providers'

export const metadata: Metadata = {
  title: "Diary • Sarthakdev143",
  description:
    "A web-based, interactive, and immersive diary experience using three.js. Flip through the pages of my diary and write your thoughts and experiences. The app is built using Next.js, three.js, and TypeScript. Your data is completely encrypted and secure, No one, even we can't read it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </Head>
      <body
        className={`antialiased`}
      >
        <DiaryProvider>
          {/* <Providers> */}
          <Navbar />
          <main>
            <Diary3D />
            {children}
          </main>
          {/* </Providers> */}
        </DiaryProvider>
      </body>
    </html>
  );
}
