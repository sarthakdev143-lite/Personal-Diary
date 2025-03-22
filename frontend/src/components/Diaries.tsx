import { useState } from "react";
import { Button } from "./ui/button";
import { RiAddCircleLine } from "@remixicon/react";

type Diary = {
    id: number;
    title: string;
    content: string;
};

const Diaries = () => {
    const [diaries, setDiaries] = useState<Diary[]>([]);

    return (
        <>
            {/* {
                diaries.forEach((diary) => {
                    // Display Diary Info.
                })
            } */}

            <Button id="add-new-diary" className="h-36 p-6 rounded-xl bg-zinc-600/10 hover:bg-zinc-700/15 mix-blend-difference shadow-lg flex flex-col items-center text-white/80 max-w-xs group border border-white/10 hover:border-white/30 transition-[border]">
                <div className="p-3 rounded-lg bg-white/10 mb-3 group-hover:bg-white/15 transition-[border] border border-white/10 group-hover:border-white/30">
                    <RiAddCircleLine size={20} />
                </div>
                <h2 className="font-medium text-lg">+ Add New Diary</h2>
            </Button >
        </>
    )
}

export default Diaries;