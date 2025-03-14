"use client";

import React, { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useDiary } from "@/context/DiaryContext";
import { useDiaryScene } from "@/context/useDiaryScene";
import { usePathname } from "next/navigation";

const Diary3D: React.FC = () => {
    const { isRotating } = useDiary();
    const pathName = usePathname();

    const { sceneRef, isOpened, isAnimating, mountRef, animationRef,
        updateCameraAndControls, updateRotation, handleResize,
        openDiary, handleTouchStart, closeDiary
    } = useDiaryScene(isRotating);

    // Setup scene and diary models
    useEffect(() => {
        if (sceneRef.current) return;

        const scene = new THREE.Scene();
        scene.background = null;

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

        const textureLoader = new THREE.TextureLoader();
        const diaryGroup = new THREE.Group();
        scene.add(diaryGroup);

        const createDiaryCover = () => {
            const diaryCoverTexture = textureLoader.load("/leather-texture.jpg");
            diaryCoverTexture.wrapS = THREE.RepeatWrapping;
            diaryCoverTexture.wrapT = THREE.RepeatWrapping;

            const coverMaterial = new THREE.MeshStandardMaterial({
                map: diaryCoverTexture,
                roughness: 0.8,
                metalness: 0.5,
                color: 0xB5794F,
            });

            const coverGeometry = new THREE.BoxGeometry(3.5, 0.17, 5.5);
            coverGeometry.translate(1.75, 0, 0);

            const frontCover = new THREE.Mesh(coverGeometry, coverMaterial);
            frontCover.castShadow = true;
            frontCover.position.set(-1.75, 0.1, 0);

            const backCover = new THREE.Mesh(coverGeometry, coverMaterial);
            backCover.castShadow = true;
            backCover.position.set(-1.75, -0.45, 0);

            diaryGroup.add(frontCover, backCover);
            return { frontCover, backCover };
        };

        const createPages = () => {
            const paperTexture = textureLoader.load("/paper-texture.jpg");
            paperTexture.wrapS = THREE.RepeatWrapping;
            paperTexture.wrapT = THREE.RepeatWrapping;

            const pageGroup = new THREE.Group();
            let middlePage = null; // Placeholder for middle page

            // First Page (Left Side) - Pre-Written Content
            const firstPageGeometry = new THREE.PlaneGeometry(3.2, 5.1);
            firstPageGeometry.translate(1.6, 0, 0);

            const firstPageCanvas = document.createElement("canvas");
            firstPageCanvas.width = 512;
            firstPageCanvas.height = 1024;
            const ctx = firstPageCanvas.getContext("2d");

            if (ctx) {
                ctx.fillStyle = "#fdf4e3"; // Light paper color
                ctx.fillRect(0, 0, firstPageCanvas.width, firstPageCanvas.height);

                ctx.save(); // Save state before flipping

                ctx.translate(firstPageCanvas.width, 0);
                ctx.scale(-1, 1); // Flip horizontally for left side

                ctx.fillStyle = "#2f2f2f";
                ctx.font = "28px cursive"; // Handwriting font
                ctx.fillText("Welcome to Your Digital Diary!", 30, 80);
                ctx.fillText("📖 Features:", 30, 140);
                ctx.fillText("- Fully private and encrypted", 50, 190);
                ctx.fillText("- Add images and audio notes", 50, 240);
                ctx.fillText("- Offline mode", 50, 290);

                ctx.fillText("👨‍💻 Developer: @sarthakdev143", 30, 370);

                ctx.restore(); // Restore state after flipping
            }

            const firstPageTexture = new THREE.CanvasTexture(firstPageCanvas);
            firstPageTexture.flipY = false;
            firstPageTexture.needsUpdate = true;

            const firstPageMaterial = new THREE.MeshStandardMaterial({
                map: firstPageTexture,
                side: THREE.DoubleSide,
                roughness: 0.9,
                metalness: 0.1,
            });

            const firstPage = new THREE.Mesh(firstPageGeometry, firstPageMaterial);
            firstPage.rotation.x = Math.PI / 2;
            firstPage.position.set(-1.68, 0, 0);

            pageGroup.add(firstPage);

            // Other Pages (Including Middle Page)
            for (let i = 1; i < 50; i++) {
                const pageGeometry = new THREE.PlaneGeometry(3.2, 5.1);
                pageGeometry.translate(1.6, 0, 0);

                const pageMaterial = new THREE.MeshStandardMaterial({
                    map: paperTexture,
                    side: THREE.DoubleSide,
                    roughness: 0.9,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.95,
                });

                const page = new THREE.Mesh(pageGeometry, pageMaterial);
                page.rotation.x = Math.PI / 2;
                page.position.set(-1.68 + (Math.random() * 0.1 - 0.135), -0.007 * i, 0);
                page.receiveShadow = true;

                if (i === 25) middlePage = page; // Capture middle page

                pageGroup.add(page);
            }

            // Modify the Middle Page (Right Side) - No Mirroring Needed
            if (middlePage) {
                const middlePageCanvas = document.createElement("canvas");
                middlePageCanvas.width = 512;
                middlePageCanvas.height = 1024;
                const ctxMiddle = middlePageCanvas.getContext("2d");

                if (ctxMiddle) {
                    ctxMiddle.fillStyle = "#fdf4e3"; // Light paper color
                    ctxMiddle.fillRect(0, 0, middlePageCanvas.width, middlePageCanvas.height);

                    ctxMiddle.fillStyle = "#2f2f2f";
                    ctxMiddle.font = "28px cursive";
                    ctxMiddle.fillText("Today's Entry:", 30, 80);

                    // Load and draw an image
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = "/look-maxing.jpg";

                    img.onload = () => {
                        ctxMiddle.drawImage(img, 100, 120, 300, 200);
                        middlePageTexture.needsUpdate = true; // Ensure texture updates after drawing
                    };

                    img.onerror = () => {
                        console.error("Failed to load image");
                    };
                }

                const middlePageTexture = new THREE.CanvasTexture(middlePageCanvas);
                middlePageTexture.flipY = false;
                middlePageTexture.needsUpdate = true;

                middlePage.material.map = middlePageTexture;
                middlePage.material.needsUpdate = true;
            }

            diaryGroup.add(pageGroup);
            return pageGroup;
        };

        const createDiarySpine = () => {
            const diaryCoverTexture = textureLoader.load("/leather-texture.jpg");
            diaryCoverTexture.wrapS = THREE.RepeatWrapping;
            diaryCoverTexture.wrapT = THREE.RepeatWrapping;

            const spineMaterial = new THREE.MeshStandardMaterial({
                map: diaryCoverTexture,
                roughness: 0.7,
                metalness: 0.2,
                color: 0xA0522D,
                side: THREE.DoubleSide,
            });

            const spineGeometry = new THREE.BoxGeometry(0.17, 5.5, 0.38);
            const spine = new THREE.Mesh(spineGeometry, spineMaterial);
            spine.castShadow = true;
            spine.rotation.x = Math.PI / 2;
            spine.position.set(-1.835, -0.175, 0);

            const topEdge = new THREE.CylinderGeometry(0.13, 0.13, 5.5, 32, 1, false, Math.PI, Math.PI / 2);
            const topEdgeMesh = new THREE.Mesh(topEdge, spineMaterial);
            topEdgeMesh.position.set(0.085, 0, -0.19);
            spine.add(topEdgeMesh);

            const bottomEdge = new THREE.CylinderGeometry(0.13, 0.13, 5.5, 32, 1, false, 0, Math.PI / 2);
            const bottomEdgeMesh = new THREE.Mesh(bottomEdge, spineMaterial);
            bottomEdgeMesh.position.set(0.085, 0, 0.19);
            bottomEdgeMesh.rotation.z = Math.PI;
            spine.add(bottomEdgeMesh);

            diaryGroup.add(spine);
            return spine;
        };

        const createLighting = () => {
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7);
            directionalLight.castShadow = true;

            scene.add(ambientLight, directionalLight);
        };

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
                    </div>
                    : null}
            </div>
        </div>
    );
};

export default Diary3D;