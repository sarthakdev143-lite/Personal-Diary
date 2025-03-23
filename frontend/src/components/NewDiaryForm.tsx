import { useGSAP } from "@gsap/react";
import { RiCloseCircleFill } from "@remixicon/react";
import gsap from "gsap";
import { Button } from "./ui/button";
import { useState } from "react";

const NewDiaryForm = ({ formActive, setFormActive }: { formActive: boolean, setFormActive: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [theme, setTheme] = useState("");

    useGSAP(() => {
        gsap.to("#form-parent", {
            duration: 0.5,
            ease: "power2.out",
            bottom: formActive ? "30%" : "-100%",
            scale: formActive ? 1 : 0.75,
        });
    }, [formActive]);

    return (
        <div
            id="form-parent"
            className={`w-full xs:max-w-[29rem] h-fit max-w-[95%] h-5/6 bg-zinc-500/20 backdrop-blur-lg fixed z-50 scale-x-75 -bottom-full transition duration-300 ease-in-out transform left-1/2 -translate-x-1/2 p-3 rounded-3xl`}
        >
            <RiCloseCircleFill size={23} onClick={() => setFormActive(false)} className="absolute top-6 right-6 text-2xl cursor-pointer" />
            <div id="content" className="w-full h-full overflow-y-scroll custom-scrollbar p-4">
                <h2 className="text-2xl font-bold mb-6">New Diary Entry</h2>
                <form className="flex flex-col gap-4">
                    <div>
                        <label className="block text-lg mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 rounded-lg bg-zinc-200/50 focus:outline-none focus:ring-2 focus:ring-white"
                            placeholder="Enter your diary title"
                        />
                    </div>
                    <div>
                        <label className="block text-lg mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 rounded-lg bg-zinc-200/50 focus:outline-none focus:ring-2 focus:ring-white"
                            placeholder="Write your thoughts..."
                            rows={4}
                        />
                    </div>
                    <Button className="px-12 py-5 w-fit mt-4 mx-auto bg-zinc-600 hover:bg-zinc-700">Next</Button>
                </form>
            </div>
        </div>
    );
};

export default NewDiaryForm;
