import { Button } from "@/components/ui/button";
import Link from "next/link";

const Landing = () => {
    return (
        <section
            className="w-full min-h-screen flex flex-col items-center justify-center select-none"
            style={{ textShadow: "0px 4px 12px rgba(0,0,0,0.2)" }}
        >
            <h1 className="text-4xl max-xxs:text-3xl font-bold text-center text-white/80 mix-blend-difference italic">
                Your Private Digital Diary – Safe, Secure, and <Link href='https://rb.gy/khel8n' target="_blank" rel="noopener noreferrer">Serene</Link>
            </h1>
            <p className="text-lg max-xxs:text-base text-center text-white/60 mix-blend-difference mt-2">
                Scribble your thoughts, ideas, and todos in a clean and minimal interface.
            </p>

            <div className="mt-4 flex gap-2 max-xxs:flex-col max-xxs:gap-3">
                <Button
                    className="pointer-events-auto mix-blend-difference bg-white/80 text-black transition-all duration-300 
                               text-md font-semibold rounded-sm hover:-translate-y-1 hover:bg-white/75 hover:shadow-lg 
                               hover:shadow-white/15 hover:text-black/90 hover:rounded-md hover:scale-x-100 scale-x-95"
                    size={'lg'}
                >
                    Start Writing
                </Button>
                <Button
                    className="pointer-events-auto mix-blend-difference border border-white/70 text-white/80 transition-all 
                               duration-300 text-md font-semibold rounded-sm hover:-translate-y-1 bg-transparent hover:bg-white/15 
                               hover:shadow-lg hover:shadow-white/15 hover:text-white hover:rounded-md hover:scale-x-100 scale-x-95"
                    size={'lg'}
                >
                    Try Demo
                </Button>
            </div>
        </section>
    );
};

export default Landing;