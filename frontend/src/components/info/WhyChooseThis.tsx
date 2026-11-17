"use client";

import { ComponentType } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { ShieldCheck, PaintBucket, Search, PenLine, Clock, Code2 } from "lucide-react";
import { openSourceHref } from "@/lib/diary/source";
const features = [
    { icon: ShieldCheck, title: "Private to you", description: "Each diary stays on your account. Other people cannot open it." },
    { icon: PenLine, title: "Rich entries", description: "Write with headings, lists, links, and images, then revise an entry later." },
    { icon: PaintBucket, title: "Cover themes", description: "Pick a cover when you create a diary, and change it later." },
    { icon: Search, title: "Search", description: "Find a diary from its title, description, or the words in an entry. Narrow one diary to a month." },
    { icon: Clock, title: "Your history", description: "Past entries stay in the diary. Download a JSON backup and import it back into your account." },
    { icon: Code2, title: "Open source", description: "The project is public. You can read the source and run it yourself.", href: openSourceHref() },
];

interface FeatureCardProps {
    icon: ComponentType<React.SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
    href?: string;
}

const sourcePhrase = "the source";

const FeatureCard = ({ icon: Icon, title, description, href }: FeatureCardProps) => {
    const phraseAt = href ? description.indexOf(sourcePhrase) : -1;
    return (
        <div className="feature-card flex w-full flex-col items-center rounded-xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-lg transition-[border] group hover:border-white/30">
            <div className="p-3 rounded-lg bg-white/10 mb-3 group-hover:bg-white/15 transition-[border] border border-white/10 group-hover:border-white/30">
                <Icon width={35} height={35} className="text-white/90" />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1 text-balance text-[0.9rem] tracking-wider text-white/80">
                {href && phraseAt >= 0 ? (
                    <>
                        {description.slice(0, phraseAt)}
                        <a href={href} className="inline-block py-3.5 -my-3.5 text-white underline decoration-white/80 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/70" target="_blank" rel="noreferrer">{sourcePhrase}</a>
                        {description.slice(phraseAt + sourcePhrase.length)}
                    </>
                ) : description}
            </p>
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
            <h2 className="text-4xl font-bold italic text-white max-[379px]:text-[1.75rem]">
                Why Choose This?
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-balance text-lg text-zinc-300">
                Turn your reflections into a daily habit.
            </p>

            <div className="card-parent mt-8 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                    <FeatureCard key={index} {...feature} />
                ))}
            </div>
        </section>
    );
};

export default WhyChooseThis;
