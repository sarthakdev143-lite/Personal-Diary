"use client";

import React, { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useDiary } from "@/context/DiaryContext";
import { useDiaryScene } from "@/context/useDiaryScene";
import { usePathname } from "next/navigation";
import { useSetupScene } from "@/hooks/diary3d/useSetupScene";
import { Button } from "./ui/button";
import Link from "next/link";

const Diary3D: React.FC = () => {
    const { isRotating } = useDiary();
    const pathName = usePathname();

    const { sceneRef, isOpened, isAnimating, mountRef, animationRef,
        updateCameraAndControls, updateRotation, handleResize,
        openDiary, handleTouchStart, closeDiary
    } = useDiaryScene(isRotating);

    const { createDiaryCover, createPages, createDiarySpine, createLighting,
        scene, diaryGroup } = useSetupScene();

    // Setup scene and diary models
    useEffect(() => {
        if (sceneRef.current) return;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0x000000, 0);

        if (mountRef.current)
            mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = isRotating;
        controls.autoRotateSpeed = 1;
        controls.minDistance = 4;
        controls.maxDistance = 12;
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        // # See x, y, z axes with the model #
        // const axesHelper = new THREE.AxesHelper(10); 
        // scene.add(axesHelper);

        scene.add(diaryGroup);

        updateCameraAndControls();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 100);
        });

        // Create and store all diary parts in sceneRef
        const { frontCover, backCover } = createDiaryCover();
        const pageGroup = createPages();
        const spine = createDiarySpine();
        createLighting();

        // Store all necessary elements in sceneRef
        sceneRef.current = {
            scene,
            camera,
            renderer,
            controls,
            diaryGroup,
            frontCover,
            backCover,
            spine,
            pageGroup
        };

        handleResize();

        const animate = () => {
            if (!sceneRef.current) return;

            const { controls, renderer, camera, scene } = sceneRef.current;

            controls.update();
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (mountRef.current && sceneRef.current) {
                mountRef.current.removeChild(sceneRef.current.renderer.domElement);
            }
            sceneRef.current = null;
        };
    }, [sceneRef]);

    // Effect to update rotation when isRotating changes
    useEffect(() => {
        updateRotation();
    }, [isRotating, updateRotation]);

    const toggleDiary = () => {
        if (isOpened)
            closeDiary();
        else
            openDiary();
    };

    return (
        <div className={`fixed w-full h-screen z-0 ${pathName === '/' ? 'translate-x-[-0.2rem]' : ''}`}>
            <div id="caption" className="w-full h-screen absolute top-0 left-0 z-0">
                <h1 className="text-[27vw] text-white uppercase absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 select-none">
                    diary
                </h1>
            </div>
            <div
                ref={mountRef}
                className="w-full h-screen absolute top-0 left-0 z-10 overflow-hidden"
                title={pathName === `/` ? `Drag To Interact With The Diary` : undefined}
                onTouchStart={handleTouchStart}
            >
                {pathName === '/' ?
                    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-4">
                        <button
                            onClick={toggleDiary}
                            disabled={isAnimating}
                            className={`select-none text-gray-300 font-sans bg-slate-800 bg-opacity-40 px-4 py-2 rounded-md cursor-pointer transition-opacity duration-300 
                 ${isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-50'}`}
                        >
                            {isOpened ? 'Close Diary' : 'Open Diary'}
                        </button>
                        <Button asChild disabled={isAnimating} size={'lg'} className={`select-none text-gray-300 font-sans font-normal tracking-wide bg-slate-800 bg-opacity-40 px-4 py-2 rounded-md cursor-pointer transition-all duration-300 
                 ${isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-50'}`}>
                            <Link href='/diary'>
                                Start Writing
                            </Link>
                        </Button>
                    </div>
                    : null}
            </div>
        </div>
    );
};

export default Diary3D;