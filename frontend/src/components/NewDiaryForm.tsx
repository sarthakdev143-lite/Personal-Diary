import { useGSAP } from "@gsap/react";
import { RiCloseCircleFill } from "@remixicon/react";
import gsap from "gsap";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

const NewDiaryForm = ({ formActive, setFormActive }: { formActive: boolean, setFormActive: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [errors, setErrors] = useState<{ title?: string; }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useGSAP(() => {
        gsap.to("#form-parent", {
            duration: 0.5,
            ease: "power2.out",
            bottom: formActive ? "30%" : "-100%",
            scale: formActive ? 1 : 0.75,
            opacity: formActive ? 1 : 0,
        });
    }, [formActive]);

    const validate = () => {
        let newErrors: { title?: string } = {};

        if (!title.trim()) {
            newErrors.title = "Title is required.";
        } else if (title.trim().length < 3) {
            newErrors.title = "Title must be at least 3 characters.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (title.trim().length >= 3) setErrors({}); // Clear errors when typing valid input
    }, [title]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            setIsSubmitting(true);
            console.log("Form submitted:", { title, description });

            // Reset state after animation
            // gsap.to("#form-parent", {
            //     duration: 0.4,
            //     bottom: "-100%",
            //     scale: 0.75,
            //     opacity: 0,
            //     ease: "power2.in",
            //     onComplete: () => {
            //         setFormActive(false);
            //         setTitle("");
            //         setDescription("");
            //         setErrors({});
            //         setIsSubmitting(false);
            //     },
            // });
        }
    };

    return (
        <div
            id="form-parent"
            className={`w-full xs:max-w-[29rem] max-w-[95%] bg-zinc-500/30 backdrop-blur-xl fixed z-50 scale-75 
                -bottom-full transition duration-300 ease-in-out transform left-1/2 -translate-x-1/2 
                p-3 rounded-3xl shadow-xl`}
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
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
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
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full max-h-40 min-h-16 p-2 px-3 rounded-lg bg-zinc-200/20 
                            focus:outline-none focus:ring-1 focus:ring-white/70 placeholder:text-zinc-300 tracking-wide"
                            placeholder="Describe what you're gonna write..."
                            rows={4}
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isSubmitting || !!errors.title}
                        className="px-11 py-5 w-fit mt-4 mx-auto border border-zinc-600 
                        bg-zinc-700 hover:bg-zinc-600 tracking-wider text-base 
                        disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {isSubmitting ? "Processing..." : "Next"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default NewDiaryForm;
