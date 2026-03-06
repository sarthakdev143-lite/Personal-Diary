"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useDiary } from "@/context/DiaryContext";
import { useDiaryScene } from "@/context/useDiaryScene";
import { disposeThreeObject, useSetupScene } from "@/hooks/diary3d/useSetupScene";

import { Button } from "./ui/button";

interface Diary3DProps {
    selectedTexture: string | null;
}

const Diary3D: React.FC<Diary3DProps> = ({ selectedTexture }) => {
    const { isRotating } = useDiary();
    const pathName = usePathname();
    const texture = selectedTexture || "/textures/leather-texture.jpg";
    const initialTextureRef = useRef(texture);

    const {
        sceneRef,
        isOpened,
        isAnimating,
        mountRef,
        animationRef,
        updateRotation,
        handleResize,
        openDiary,
        handleTouchStart,
        closeDiary,
    } = useDiaryScene(isRotating);

    const {
        createDiaryCover,
        createDiarySpine,
        createLighting,
        createPages,
        diaryGroup,
        loadTexture,
        scene,
        updateCoverTexture,
    } = useSetupScene();

    useEffect(() => {
        if (sceneRef.current || !mountRef.current) return;
        const mountElement = mountRef.current;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0x000000, 0);

        mountElement.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 0.75;
        controls.minDistance = 4;
        controls.maxDistance = 12;
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
        };

        const coverTexture = loadTexture(initialTextureRef.current);
        const { frontCover, backCover } = createDiaryCover(coverTexture);
        const pageGroup = createPages();
        const spine = createDiarySpine(coverTexture);
        createLighting();
        scene.add(diaryGroup);

        sceneRef.current = {
            scene,
            camera,
            renderer,
            controls,
            diaryGroup,
            frontCover,
            backCover,
            spine,
            pageGroup,
        };

        handleResize();

        const handleOrientationChange = () => {
            window.setTimeout(handleResize, 100);
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", handleOrientationChange);

        let renderFrameId: number | null = null;
        const renderLoop = () => {
            if (!sceneRef.current) return;

            const currentScene = sceneRef.current;
            currentScene.controls.update();
            currentScene.renderer.render(currentScene.scene, currentScene.camera);
            renderFrameId = window.requestAnimationFrame(renderLoop);
        };

        renderFrameId = window.requestAnimationFrame(renderLoop);

        return () => {
            if (renderFrameId !== null) {
                window.cancelAnimationFrame(renderFrameId);
            }

            if (animationRef.current !== null) {
                window.cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }

            window.removeEventListener("resize", handleResize);
            window.removeEventListener("orientationchange", handleOrientationChange);

            controls.dispose();
            scene.remove(diaryGroup);
            disposeThreeObject(diaryGroup);
            renderer.dispose();

            if (mountElement.contains(renderer.domElement)) {
                mountElement.removeChild(renderer.domElement);
            }

            sceneRef.current = null;
        };
    }, [
        animationRef,
        createDiaryCover,
        createDiarySpine,
        createLighting,
        createPages,
        diaryGroup,
        handleResize,
        loadTexture,
        mountRef,
        scene,
        sceneRef,
    ]);

    useEffect(() => {
        updateRotation();
    }, [updateRotation]);

    useEffect(() => {
        if (!sceneRef.current || !selectedTexture) return;

        updateCoverTexture(selectedTexture, [
            sceneRef.current.frontCover,
            sceneRef.current.backCover,
            sceneRef.current.spine,
        ]);
    }, [sceneRef, selectedTexture, updateCoverTexture]);

    const toggleDiary = () => {
        if (isOpened) {
            closeDiary();
            return;
        }

        openDiary();
    };

    return pathName === "/" ? (
        <div className="fixed h-screen w-full translate-x-[-0.2rem] z-0">
            {!selectedTexture && (
                <div id="caption" className="absolute left-0 top-0 h-screen w-full z-0">
                    <h1 className="absolute left-1/2 top-1/2 z-0 select-none -translate-x-1/2 -translate-y-1/2 text-[27vw] uppercase text-white">
                        diary
                    </h1>
                </div>
            )}
            <div
                ref={mountRef}
                className="absolute left-0 top-0 h-screen w-full overflow-hidden z-10"
                title="Drag to interact with the diary"
                onTouchStart={handleTouchStart}
            >
                <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-4">
                    <button
                        onClick={toggleDiary}
                        disabled={isAnimating}
                        className={`select-none rounded-md bg-slate-800 bg-opacity-40 px-4 py-2 font-sans text-gray-300 transition-opacity duration-300 ${
                            isAnimating ? "cursor-not-allowed opacity-50" : "hover:bg-opacity-50"
                        }`}
                    >
                        {isOpened ? "Close Diary" : "Open Diary"}
                    </button>
                    <Button
                        asChild
                        disabled={isAnimating}
                        size="lg"
                        className={`cursor-pointer rounded-md bg-slate-800 bg-opacity-40 px-4 py-2 font-sans font-normal tracking-wide text-gray-300 transition-all duration-300 ${
                            isAnimating ? "cursor-not-allowed opacity-50" : "hover:bg-opacity-50"
                        }`}
                    >
                        <Link href="/diary">Start Writing</Link>
                    </Button>
                </div>
            </div>
        </div>
    ) : null;
};

export default Diary3D;
