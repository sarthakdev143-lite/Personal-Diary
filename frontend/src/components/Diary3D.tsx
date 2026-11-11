"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { usePathname } from "next/navigation";

import { useDiary } from "@/context/DiaryContext";
import { useDiaryScene } from "@/context/useDiaryScene";
import { disposeThreeObject, useSetupScene } from "@/hooks/diary3d/useSetupScene";

interface Diary3DProps {
    selectedTexture: string | null;
}

const Diary3D: React.FC<Diary3DProps> = ({ selectedTexture }) => {
    const { isRotating, setIsRotating } = useDiary();
    const pathName = usePathname();
    const texture = selectedTexture || "/textures/leather-texture.jpg";
    const initialTextureRef = useRef(texture);

    const {
        sceneRef,
        mountRef,
        animationRef,
        updateRotation,
        handleResize,
        handleTouchStart,
        rememberClosed,
    } = useDiaryScene(isRotating);

    const {
        createDiaryCover,
        createDiarySpine,
        createLighting,
        createPages,
        diaryGroup,
        loadTexture,
        scene,
    } = useSetupScene(texture);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setIsRotating(false);
        }
    }, [setIsRotating]);

    useEffect(() => {
        if (sceneRef.current || !mountRef.current) return;
        const mountElement = mountRef.current;
        let renderer: THREE.WebGLRenderer;
        const probe = document.createElement("canvas");
        if (!probe.getContext("webgl") && !probe.getContext("experimental-webgl")) return;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: probe });
        } catch {
            return;
        }
        const width = mountElement.clientWidth || window.innerWidth;
        const height = mountElement.clientHeight || window.innerHeight;
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0x000000, 0);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
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

        diaryGroup.position.x = 0;
        rememberClosed();
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
        rememberClosed,
    ]);

    useEffect(() => {
        updateRotation();
    }, [updateRotation]);

    return pathName === "/" ? (
        <div className="absolute inset-0">
            <div
                ref={mountRef}
                className="absolute inset-0 overflow-hidden"
                onTouchStart={handleTouchStart}
            />
        </div>
    ) : null;
};

export default Diary3D;
