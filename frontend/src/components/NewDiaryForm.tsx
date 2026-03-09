import { useGSAP } from "@gsap/react";
import { RiCloseCircleFill } from "@remixicon/react";
import gsap from "gsap";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";
import DiaryPreview from "./DiaryPreview";

import { useDiary } from "@/context/DiaryContext";

const themes = [
    {
        name: "Leather 1",
        textureUrl: "/textures/leather-texture.jpg"
    },
    {
        name: "Leather 2",
        textureUrl: "/textures/leather-bound.webp"
    },
    {
        name: "Wooden Garage Door",
        textureUrl: "/textures/wooden_garage_door.webp"
    },
];

const NewDiaryForm = ({ formActive, setFormActive, isFullScreen, setIsFullScreen }: { formActive: boolean, setFormActive: React.Dispatch<React.SetStateAction<boolean>>, isFullScreen: boolean, setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const { selectedTexture, setSelectedTexture } = useDiary();
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        theme: selectedTexture || themes[0].textureUrl,
    });
    const [errors, setErrors] = useState<{ title?: string }>({});
    const selectedTheme = themes.find((theme) => theme.textureUrl === selectedTexture);

    useGSAP(() => {
        gsap.to("#form-parent", {
            duration: 0.5,
            ease: "power2.out",
            bottom: formActive ? "30%" : "-100%",
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
        setFormData((prev) => ({ ...prev, theme: selectedTexture || themes[0].textureUrl }));
    }, [selectedTexture]);

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

    const handleFinishForm = () => {
        // This would be called when theme selection is complete
        setFormData({ title: "", description: "", theme: selectedTexture || themes[0].textureUrl });
        setIsFullScreen(false);
        setFormActive(false);
    };

    return (
        <>
            <div
                id="form-parent"
                className="w-full xs:max-w-[29rem] max-w-[95%] bg-zinc-500/20 backdrop-blur-xl fixed z-50 
                -bottom-full transition duration-300 ease-in-out transform left-1/2 -translate-x-1/2 
                p-3 rounded-3xl shadow-xl"
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
                    
                    {selectedTexture && (
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
                <div className="w-auto flex-1 flex flex-col items-center h-3/4 min-w-[320px]">
                    <h2 className="text-2xl font-bold mb-4">Choose a Theme</h2>
                    <div id="themes" className="p-4 grid grid-cols-3 gap-4 justify-center max-w-80 max-h-[48rem] overflow-y-auto my-3">
                        {themes.map((elem, index) => (
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
                        className="px-11 py-5 border border-zinc-600 
                            bg-zinc-700 hover:bg-zinc-600 tracking-wider text-base"
                    >
                        Create Diary
                    </Button>
                </div>
            </div>
        </>
    );
};

export default NewDiaryForm;
