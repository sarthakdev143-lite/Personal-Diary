import { useGSAP } from "@gsap/react"
import { RiCloseCircleFill } from "@remixicon/react"
import gsap from "gsap"
import { Button } from "./ui/button"

const NewDiaryForm = ({ formActive, setFormActive }: { formActive: boolean, setFormActive: React.Dispatch<React.SetStateAction<boolean>> }) => {

    useGSAP(() => {
        gsap.to("#form-parent", {
            duration: 0.5,
            ease: "power2.out",
            bottom: formActive ? 0 : "-100%",
            scale: formActive ? 1 : 0.75
        })
    }, [formActive])

    return (
        <>
            <div
                id="form-parent"
                className="w-full xs:max-w-[85%] max-w-[95%] h-5/6 bg-zinc-500/20 backdrop-blur-lg fixed z-50 scale-x-75 -bottom-full transition duration-300 ease-in-out left-1/2 -translate-x-1/2 p-12 pb-0 rounded-3xl"
            >
                <RiCloseCircleFill size={23} onClick={() => setFormActive(false)} className="absolute top-6 right-6 text-2xl cursor-pointer" />
                <div
                    id="content"
                    className="w-full h-full overflow-y-scroll custom-scrollbar"
                >

                </div>
            </div>
        </>
    )
}

export default NewDiaryForm
