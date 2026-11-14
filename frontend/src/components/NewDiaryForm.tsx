import { useGSAP } from "@gsap/react";
import { RiCloseCircleFill } from "@remixicon/react";
import gsap from "gsap";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DiaryPreview from "./DiaryPreview";

import { useDiary } from "@/context/DiaryContext";
import { useToast } from "@/hooks/use-toast";
import { DESCRIPTION_MAX, DIARY_THEMES, TITLE_MAX } from "@/lib/diary/constants";
import { normalizeTitle } from "@/lib/diary/validation";

const themes = DIARY_THEMES;

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
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: "",
        description: "",
    });
    const [errors, setErrors] = useState<{ title?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const selectedTheme = themes.find((theme) => theme.textureUrl === selectedTexture);
    const trimmedTitle = formData.title.trim();
    const liveTitle = trimmedTitle ? normalizeTitle(formData.title) : null;
    const titleMessage = liveTitle && !liveTitle.ok ? liveTitle.error : errors.title;

    useEffect(() => {
        if (!formActive) return;
        document.getElementById("diary-title")?.focus();
    }, [formActive]);

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
        const title = normalizeTitle(formData.title);
        const newErrors: { title?: string } = {};
        if (!title.ok) newErrors.title = title.error;

        setErrors(newErrors);
        return title.ok;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (name === "title" && value.trim().length >= 3) setErrors({});
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
                    theme: selectedTexture || themes[0].textureUrl,
                }),
            });

            const data = await response.json().catch(() => null) as { error?: string; _id?: string } | null;

            if (!response.ok || !data?._id) {
                throw new Error(data?.error || "Failed to create diary.");
            }

            setFormData({ title: "", description: "" });
            setIsFullScreen(false);
            setFormActive(false);
            onDiaryCreated?.();
            router.push(`/diary/${data._id}`);
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
            {formActive && (
                <button
                    type="button"
                    aria-label="Dismiss new diary"
                    className="fixed inset-0 z-40 bg-black/70"
                    onClick={() => setFormActive(false)}
                />
            )}
            <div
                id="form-parent"
                className="fixed bottom-0 left-1/2 z-50 w-full max-w-[95%] rounded-3xl border border-white/10 bg-zinc-950 p-3 text-zinc-100 shadow-2xl xs:max-w-[29rem]"
                style={{ transform: "translate(-50%, 100%)", opacity: 0 }}
            >
                <button
                    type="button"
                    aria-label="Close new diary"
                    onClick={() => setFormActive(false)}
                    className="absolute top-6 right-6 text-2xl text-zinc-300"
                >
                    <RiCloseCircleFill size={23} />
                </button>
                <div id="content" className="w-full max-h-[80vh] overflow-y-auto p-4">
                    <h2 className="text-2xl font-bold mb-6">New Diary</h2>
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="diary-title" className="block text-lg mb-2">Title</label>
                            <input
                                id="diary-title"
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                maxLength={TITLE_MAX}
                                aria-invalid={Boolean(titleMessage)}
                                aria-describedby={titleMessage ? "diary-title-error" : undefined}
                                className="w-full rounded-lg border border-white/15 bg-zinc-900 p-2 px-3 tracking-wide text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/70"
                                placeholder="Enter your diary's name..."
                            />
                            {titleMessage && <p id="diary-title-error" className="mt-1 text-sm text-red-300">{titleMessage}</p>}
                        </div>
                        <div>
                            <label htmlFor="diary-description" className="block text-lg mb-2">Description</label>
                            <textarea
                                id="diary-description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                maxLength={DESCRIPTION_MAX}
                                className="max-h-40 min-h-16 w-full rounded-lg border border-white/15 bg-zinc-900 p-2 px-3 tracking-wide text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/70"
                                placeholder="What is this diary for?"
                                rows={4}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={trimmedTitle.length < 3}
                            className="mx-auto mt-4 w-fit border border-zinc-200 bg-zinc-100 px-11 py-5 text-base tracking-wider text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400 disabled:opacity-100"
                        >
                            Next
                        </Button>
                    </form>
                </div>
            </div>
            <div
                id="theme-selection"
                className="fixed inset-0 z-[60] hidden flex-col items-stretch gap-4 overflow-y-auto bg-zinc-950 p-4 text-zinc-100 xl:flex-row xl:items-center xl:overflow-hidden xl:p-6"
            >
                <button
                    type="button"
                    aria-label="Close theme selection"
                    onClick={handleCloseThemeSelection}
                    className="absolute right-6 top-6 z-[70] text-2xl text-zinc-300"
                >
                    <RiCloseCircleFill size={23} />
                </button>
                
                {/* 3D Preview Area */}
                <div className="relative h-64 w-full min-w-0 overflow-hidden rounded-lg bg-zinc-900 shadow-lg xl:h-full xl:flex-1">
                    <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                        <h3 className="text-lg font-semibold text-white">Preview</h3>
                        <p className="text-sm text-gray-300">{formData.title || "Your Diary"}</p>
                    </div>
                    
                    {isFullScreen && selectedTexture && (
                        <div className="w-full h-full relative">
                            <DiaryPreview selectedTexture={selectedTexture} />
                        </div>
                    )}
                    {!selectedTexture && (
                        <div className="flex h-full flex-col items-center justify-center text-center text-white">
                            <p className="text-xl font-semibold">Preview</p>
                            <p className="mt-2 text-sm text-white/75">{selectedTheme?.name || "No theme selected"}</p>
                        </div>
                    )}
                </div>

                {/* Theme Selection Panel */}
                <div className="flex w-full shrink-0 flex-col items-center xl:h-full xl:w-80">
                    <h2 className="text-2xl font-bold mb-4">Choose a Theme</h2>
                    <div id="themes" className="p-4 grid grid-cols-3 gap-4 justify-center max-w-80 max-h-[48rem] overflow-y-auto my-3">
                        {themes.map((elem, index) => (
                            <button 
                                type="button"
                                onClick={() => handleThemeSelect(elem.textureUrl)} 
                                key={index} 
                                aria-label={elem.name}
                                aria-pressed={selectedTexture === elem.textureUrl}
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
                    {selectedTexture && (
                        <div className="text-center mb-4">
                            <p className="text-sm text-gray-300">Selected:</p>
                            <p className="font-medium">
                                {selectedTheme?.name || "Custom Theme"}
                            </p>
                        </div>
                    )}
                    
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
