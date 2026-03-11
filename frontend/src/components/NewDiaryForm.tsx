import { useGSAP } from "@gsap/react";
import { RiCloseCircleFill } from "@remixicon/react";
import gsap from "gsap";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";
import DiaryPreview from "./DiaryPreview";

import { useDiary } from "@/context/DiaryContext";
import { useToast } from "@/hooks/use-toast";
import { DIARY_THEMES } from "@/config/diaryThemes";

const NewDiaryForm = ({
    formActive,
    setFormActive,
    isFullScreen,
    setIsFullScreen,
    onDiaryCreated,
}: {
    formActive: boolean;
    setFormActive: React.Dispatch<React.SetStateAction<boolean>>;
    isFullScreen: boolean;
    setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
    onDiaryCreated?: () => void;
}) => {
    const { selectedTexture, setSelectedTexture } = useDiary();
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        theme: selectedTexture,
    });
    const [errors, setErrors] = useState<{ title?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasInitializedPreview, setHasInitializedPreview] = useState(false);
    const selectedTheme = DIARY_THEMES.find((theme) => theme.textureUrl === selectedTexture);

    useGSAP(() => {
        gsap.to("#form-parent", {
            duration: 0.5,
            ease: "power2.out",
            x: "-50%",
            y: formActive ? "0%" : "100%",
            scale: formActive ? 1 : 0.75,
            opacity: formActive ? 1 : 0,
        });
    }, [formActive]);

    useGSAP(() => {
        if (isFullScreen) {
            gsap.to("#theme-selection", {
                duration: 0.5,
                ease: "power2.out",
                opacity: 1,
                scale: 1,
                display: "flex",
            });
        } else {
            gsap.to("#theme-selection", {
                duration: 0.5,
                ease: "power2.out",
                opacity: 0,
                scale: 0.75,
                onComplete: () => {
                    gsap.set("#theme-selection", { display: "none" });
                }
            });
        }
    }, [isFullScreen]);

    const validate = () => {
        const newErrors: { title?: string } = {};

        if (!formData.title.trim()) {
            newErrors.title = "Title is required.";
        } else if (formData.title.trim().length < 3) {
            newErrors.title = "Title must be at least 3 characters.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (formData.title.trim().length >= 3) setErrors({}); // Clear errors when typing valid input
    }, [formData.title]);

    useEffect(() => {
        setFormData((prev) => ({ ...prev, theme: selectedTexture }));
    }, [selectedTexture]);

    useEffect(() => {
        if (isFullScreen && !hasInitializedPreview) {
            setHasInitializedPreview(true);
        }
    }, [hasInitializedPreview, isFullScreen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            setIsFullScreen(true);
            // Don't reset form data here - we still need it for the theme selection
            setErrors({});
            // Don't close the form yet - we're showing theme selection
        }
    };

    const handleCloseThemeSelection = () => {
        setIsFullScreen(false);
    };

    function handleThemeSelect(textureUrl: string) {
        setSelectedTexture(textureUrl);
    }

    const handleFinishForm = async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/diaries", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    theme: selectedTexture,
                }),
            });

            const data = await response.json().catch(() => null) as { error?: string } | null;

            if (!response.ok) {
                throw new Error(data?.error || "Failed to create diary.");
            }

            setFormData({ title: "", description: "", theme: selectedTexture });
            setIsFullScreen(false);
            setFormActive(false);
            onDiaryCreated?.();
        } catch (error) {
            toast({
                title: "Unable to create diary",
                description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div
                id="form-parent"
                className="w-full xs:max-w-[29rem] max-w-[95%] bg-zinc-500/20 backdrop-blur-xl fixed z-50 
                transition duration-300 ease-in-out left-1/2 
                p-3 rounded-3xl shadow-xl bottom-0 translate-y-full opacity-0"
                style={{ transform: "translate(-50%, 100%)" }}
            >
                <RiCloseCircleFill
                    size={23}
                    onClick={() => setFormActive(false)}
                    className="absolute top-6 right-6 text-2xl cursor-pointer"
                />
                <div id="content" className="w-full max-h-[80vh] overflow-y-auto p-4">
                    <h2 className="text-2xl font-bold mb-6">New Diary</h2>
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-lg mb-2">Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full p-2 px-3 rounded-lg bg-zinc-200/20 
                                focus:outline-none focus:ring-1 focus:ring-white/70 
                                placeholder:text-zinc-300 tracking-wide"
                                placeholder="Enter your diary's name..."
                            />
                            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                        </div>
                        <div>
                            <label className="block text-lg mb-2">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="w-full max-h-40 min-h-16 p-2 px-3 rounded-lg bg-zinc-200/20 
                                focus:outline-none focus:ring-1 focus:ring-white/70 
                                placeholder:text-zinc-300 tracking-wide"
                                placeholder="Describe what you're gonna write..."
                                rows={4}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={!formData.title.trim() || formData.title.trim().length < 3}
                            className="px-11 py-5 w-fit mt-4 mx-auto border border-zinc-600 
                            bg-zinc-700 hover:bg-zinc-600 tracking-wider text-base 
                            disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Next
                        </Button>
                    </form>
                </div>
            </div>
            <div
                id="theme-selection"
                className="fixed w-full h-full top-0 left-0 bg-black/50 items-center justify-center 
                lg:justify-between gap-4 lg:p-6 z-[60] hidden"
            >
                <RiCloseCircleFill
                    size={23}
                    onClick={handleCloseThemeSelection}
                    className="absolute top-6 right-6 text-2xl cursor-pointer z-[70]"
                />
                
                {/* 3D Preview Area */}
                <div className="relative h-3/4 w-full overflow-hidden rounded-lg bg-white/30 shadow-lg backdrop-blur-sm lg:h-full lg:w-2/3">
                    <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                        <h3 className="text-lg font-semibold text-white">Preview</h3>
                        <p className="text-sm text-gray-300">{formData.title || "Your Diary"}</p>
                    </div>
                    
                    {hasInitializedPreview && (
                        <div className="w-full h-full relative">
                            <DiaryPreview selectedTexture={selectedTexture} />
                        </div>
                    )}
                    {!hasInitializedPreview && (
                        <div className="flex h-full flex-col items-center justify-center text-center text-white">
                            <p className="text-xl font-semibold">Preview</p>
                            <p className="mt-2 text-sm text-white/75">{selectedTheme?.name || "No theme selected"}</p>
                        </div>
                    )}
                </div>

                {/* Theme Selection Panel */}
                <div className="w-auto flex-1 flex flex-col items-center h-3/4 min-w-[320px]">
                    <h2 className="text-2xl font-bold mb-4">Choose a Theme</h2>
                    <div id="themes" className="p-4 grid grid-cols-3 gap-4 justify-center max-w-80 max-h-[48rem] overflow-y-auto my-3">
                        {DIARY_THEMES.map((elem, index) => (
                            <button 
                                type="button"
                                onClick={() => handleThemeSelect(elem.textureUrl)} 
                                key={index} 
                                className={`w-20 aspect-square bg-gray-400/30 rounded-lg overflow-hidden border-2 border-gray-600 transition-all duration-200 hover:scale-105 hover:border-gray-400 ${
                                    selectedTexture === elem.textureUrl 
                                        ? 'ring-2 ring-white' 
                                        : ''
                                }`}
                            >
                                <Image 
                                    src={elem.textureUrl} 
                                    className="w-full h-full object-cover" 
                                    alt={elem.name} 
                                    width={100} 
                                    height={100} 
                                />
                            </button>
                        ))}
                    </div>
                    
                    {/* Selected theme info */}
                    <div className="text-center mb-4">
                        <p className="text-sm text-gray-300">Selected:</p>
                        <p className="font-medium">
                            {selectedTheme?.name || "Custom Theme"}
                        </p>
                    </div>
                    
                    <Button
                        onClick={handleFinishForm}
                        disabled={isSubmitting}
                        className="px-11 py-5 border border-zinc-600 
                            bg-zinc-700 hover:bg-zinc-600 tracking-wider text-base"
                    >
                        {isSubmitting ? "Creating..." : "Create Diary"}
                    </Button>
                </div>
            </div>
        </>
    );
};

export default NewDiaryForm;
