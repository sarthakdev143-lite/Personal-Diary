import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import 'remixicon/fonts/remixicon.css'
import Head from "next/head";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
