"use client";
import { ComponentType } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { ShieldCheck, PaintBucket, Bell, Mic, Clock, Brain } from "lucide-react";
import Link from "next/link";

const features = [
    { icon: ShieldCheck, title: "Privacy First", description: "AES encryption keeps your entries secure and private." },
    { icon: Clock, title: "Offline Mode", description: "Write your thoughts offline and sync them when you're back online." },
    { icon: Brain, title: "AI Sentiment Analysis", description: "Get insights into your emotions based on your writing." },
    { icon: PaintBucket, title: "Custom Themes", description: "Personalize your diary with customizable themes to match your style." },
    { icon: Bell, title: "Reminders & Notifications", description: "Get timely reminders to maintain your journaling habit." },
    { icon: Mic, title: "Voice-to-Text Entries", description: "Dictate your thoughts instead of typing for a faster experience." },
];

interface FeatureCardProps {
    icon: ComponentType<React.SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
    return (
        <div className="feature-card p-6 rounded-xl bg-white/10 border mix-blend-difference border-white/10 hover:border-white/30 transition-all group shadow-lg flex flex-col items-center text-white/80 max-w-xs">
            <div className="p-3 rounded-lg bg-white/10 mb-3 group-hover:bg-white/15 transition-[border] duration-500 border border-white/10 group-hover:border-white/30">
                <Icon width={36} height={36} className="text-white" />
            </div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-[0.9rem] text-white/60 mt-1">{description}</p>
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
        <section className="w-full h-screen flex flex-col items-center justify-center px-6 text-center">
            <h1 className="text-4xl font-bold text-white/80 mix-blend-difference italic">
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
