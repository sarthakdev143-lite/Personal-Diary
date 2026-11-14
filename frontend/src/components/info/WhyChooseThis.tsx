"use client";

import { ComponentType } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { ShieldCheck, PaintBucket, Search, PenLine, Clock, Code2 } from "lucide-react";
import Link from "next/link";

const features = [
    { icon: ShieldCheck, title: "Private to you", description: "Each diary stays on your account. Other people cannot open it." },
    { icon: PenLine, title: "Rich entries", description: "Write with headings, lists, links, and images, then revise an entry later." },
    { icon: PaintBucket, title: "Cover themes", description: "Pick a cover when you create a diary, and change it later." },
    { icon: Search, title: "Search", description: "Find a diary from its title, description, or the words in an entry." },
    { icon: Clock, title: "Your history", description: "Past entries stay in the diary. Download a JSON backup and import it back into your account." },
    { icon: Code2, title: "Open source", description: "The project is public. You can read how it works and run it yourself." },
];

interface FeatureCardProps {
    icon: ComponentType<React.SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
    return (
        <div className="feature-card p-6 rounded-xl bg-white/5 shadow-lg flex flex-col items-center text-white/80 max-w-xs group border border-white/10 hover:border-white/30 transition-[border]">
            <div className="p-3 rounded-lg bg-white/10 mb-3 group-hover:bg-white/15 transition-[border] border border-white/10 group-hover:border-white/30">
                <Icon width={35} height={35} className="text-white/90" />
            </div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-[0.9rem] tracking-wider text-white/60 mt-1">{description}</p>
        </div>
    );
};

const WhyChooseThis = () => {
    useGSAP(() => {
        gsap.registerPlugin(ScrollTrigger);

        gsap.from(".feature-card", {
            opacity: 0,
            y: 30,
            duration: 0.8,
            stagger: 0.2,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".card-parent",
                start: "top 80%",
                toggleActions: "play none none none",
            },
        });
    }, []);

    return (
        <section id="features" className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950 px-6 py-24 text-center max-sm:pb-32">
            <h1 className="text-4xl font-bold text-white/80 italic">
                Why Choose This?
            </h1>
            <p className="text-lg text-white/60 mt-2 max-w-2xl">
                Turn your reflections into a daily habit in your own private <Link href='https://rb.gy/g4cw65' target='_blank'>journal.</Link>
            </p>

            <div className="card-parent mt-8 flex flex-wrap justify-center gap-6 w-full max-w-5xl">
                {features.map((feature, index) => (
                    <FeatureCard key={index} {...feature} />
                ))}
            </div>
        </section>
    );
};

export default WhyChooseThis;
