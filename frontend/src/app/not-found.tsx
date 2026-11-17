import Link from "next/link";

export default function NotFound() {
    return (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
            <h1 className="text-2xl font-semibold text-zinc-100">This page is not here</h1>
            <p className="mt-3 max-w-sm text-base text-zinc-400">
                That address does not open a page in this diary.
            </p>
            <Link
                href="/"
                className="mt-8 rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
                Back to home
            </Link>
        </div>
    );
}
