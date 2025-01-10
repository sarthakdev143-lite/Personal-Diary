"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const Diary3D: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<{
        scene: THREE.Scene,
        camera: THREE.PerspectiveCamera,
        renderer: THREE.WebGLRenderer,
        controls: OrbitControls,
        diaryGroup: THREE.Group,
        frontCover?: THREE.Mesh,
        backCover?: THREE.Mesh,
        spine?: THREE.Mesh,
        pageGroup?: THREE.Group
    } | null>(null);

    const animationRef = useRef<number | null>(null);

    const [isOpened, setIsOpened] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const deviceTypeRef = useRef<'mobile' | 'tablet' | 'desktop'>('desktop');
    const orientationRef = useRef<'portrait' | 'landscape'>('landscape');

    const getDeviceType = () => {
        const width = window.innerWidth;
        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    };

    const getOrientation = () => {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    };

    const updateCameraAndControls = () => {
        if (!sceneRef.current) return;

        const { camera, controls } = sceneRef.current;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;

        // Update device type and orientation
        deviceTypeRef.current = getDeviceType();
        orientationRef.current = getOrientation();

        // Base camera settings
        let cameraDistance = 8;
        let cameraHeight = 3;
        let targetY = 0;

        // Adjust camera based on device and orientation
        switch (deviceTypeRef.current) {
            case 'mobile':
                if (orientationRef.current === 'portrait') {
                    cameraDistance = 12;
                    cameraHeight = 4;
                    targetY = -0.5;
                } else {
                    cameraDistance = 9;
                    cameraHeight = 2.5;
                }
                break;
            case 'tablet':
                if (orientationRef.current === 'portrait') {
                    cameraDistance = 10;
                    cameraHeight = 3.5;
                } else {
                    cameraDistance = 8;
                    cameraHeight = 2.8;
                }
                break;
            case 'desktop':
                // Adjust for ultrawide monitors
                if (aspectRatio > 2) {
                    cameraDistance = 7;
                    cameraHeight = 2.5;
                }
                break;
        }

        // Update camera
        camera.position.set(0, cameraHeight, cameraDistance);
        camera.updateProjectionMatrix();

        // Update controls
        controls.target.set(0, targetY, 0);

        // Adjust control limits based on device
        controls.minDistance = cameraDistance * 0.5;
        controls.maxDistance = cameraDistance * 1.5;

        // Limit vertical rotation more on mobile
        if (deviceTypeRef.current === 'mobile') {
            controls.minPolarAngle = Math.PI * 0.2; // More restricted top view
            controls.maxPolarAngle = Math.PI * 0.8; // More restricted bottom view
        } else {
            controls.minPolarAngle = Math.PI * 0.1;
            controls.maxPolarAngle = Math.PI * 0.9;
        }

        // Adjust damping based on device
        controls.dampingFactor = deviceTypeRef.current === 'mobile' ? 0.07 : 0.05;

        // Enable/disable features based on device
        controls.enableZoom = deviceTypeRef.current !== 'mobile';
        controls.enablePan = deviceTypeRef.current === 'desktop';

        controls.update();
    };

    // Enhanced resize handler
    const handleResize = () => {
        if (!sceneRef.current) return;

        const { renderer, camera } = sceneRef.current;
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance optimization

        updateCameraAndControls();
    };

    const easeOutQuart = (x: number): number => {
        return 1 - Math.pow(1 - x, 4);
    };

    const openDiary = () => {
        if (!sceneRef.current || isOpened || isAnimating) return;

        const { frontCover, backCover, pageGroup, spine, diaryGroup } = sceneRef.current;
        if (!frontCover || !backCover || !pageGroup || !spine) return;

        setIsAnimating(true);
        setIsOpened(true);

        const startTime = Date.now();
        const duration = 3500;
        const startRotationF = frontCover.rotation.z;
        const startRotationB = backCover.rotation.z;
        const targetRotationF = Math.PI * 0.944;

        // Store initial positions
        const initialFrontPos = { x: frontCover.position.x, y: frontCover.position.y };
        const initialBackPos = { x: backCover.position.x, y: backCover.position.y };
        const initialSpinePos = { x: spine.position.x, y: spine.position.y };
        const initialGroupPos = diaryGroup.position.x;
        const initialPageGroupPosX = pageGroup.position.x;

        // Get half of the pages for animation
        const pages = pageGroup.children;
        const halfPageCount = Math.floor(pages.length / 2);
        const pagesToAnimate = pages.slice(0, halfPageCount);

        // Store initial page positions
        const initialPagePositions = pagesToAnimate.map(page => ({
            x: page.position.x,
            y: page.position.y,
            z: page.position.z,
            rotationZ: page.rotation.z
        }));

        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);

            // Move entire diary group to center
            diaryGroup.position.x = initialGroupPos + (2.1 * easedProgress);

            // Calculate positions for opened state
            const openedFrontPos = {
                x: initialFrontPos.x - 0.665 * easedProgress,
                y: initialFrontPos.y - 0.725 * Math.sin(easedProgress * Math.PI / 2)
            };

            const openedBackPos = {
                x: initialBackPos.x,
                y: initialBackPos.y - 0.175 * Math.sin(easedProgress * Math.PI / 2)
            };

            const openedSpinePos = {
                x: initialSpinePos.x - 0.245 * easedProgress,
                y: initialSpinePos.y - 0.45 * Math.sin(easedProgress * Math.PI / 2)
            };

            // Animate covers and spine
            frontCover.position.x = openedFrontPos.x;
            frontCover.position.y = openedFrontPos.y;
            frontCover.rotation.z = startRotationF + (targetRotationF - startRotationF) * easedProgress;

            spine.position.x = openedSpinePos.x;
            spine.position.y = openedSpinePos.y;
            spine.rotation.y = Math.PI / 2 * easedProgress;

            backCover.position.y = openedBackPos.y;
            backCover.rotation.z = startRotationB + (targetRotationF - startRotationF) * easedProgress * 0.05;

            // Animate pages with a cascade effect
            pagesToAnimate.forEach((page, index) => {
                const pageDelay = index * 0.005; // Stagger the animation of each page
                const pageProgress = Math.max(0, Math.min(1, (progress - pageDelay) * 1));
                const pageEasedProgress = easeOutQuart(pageProgress);

                const initialPos = initialPagePositions[index];
                const targetRotation = Math.PI * 0.9;

                // Calculate new position and rotation
                page.position.y = initialPos.y - 0.175 * Math.sin(pageEasedProgress * Math.PI / 2);
                page.rotation.y = initialPos.rotationZ + targetRotation * pageEasedProgress;
            });

            // Animate remaining pages group
            pageGroup.position.x = initialPageGroupPosX - 0.4 * easedProgress;
            pageGroup.position.y = 0.03 * Math.sin(easedProgress * Math.PI / 2);
            pageGroup.rotation.z = startRotationB + (targetRotationF - startRotationB) * easedProgress * 0.05;

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                animationRef.current = null;
                setIsAnimating(false);
            }
        };

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(animate);
    };

    const closeDiary = () => {
        if (!sceneRef.current || !isOpened || isAnimating) return;

        const { frontCover, backCover, pageGroup, spine, diaryGroup } = sceneRef.current;
        if (!frontCover || !backCover || !pageGroup || !spine) return;

        setIsAnimating(true);
        setIsOpened(false);

        const startTime = Date.now();
        const duration = 3500;
        const startRotationF = frontCover.rotation.z;
        const startRotationB = backCover.rotation.z;
        const initialGroupPos = diaryGroup.position.x;
        const initialPageGroupPosX = pageGroup.position.x;

        // Store initial positions (opened state)
        const startPositions = {
            front: { x: frontCover.position.x, y: frontCover.position.y },
            back: { x: backCover.position.x, y: backCover.position.y },
            spine: { x: spine.position.x, y: spine.position.y }
        };

        // Target positions (closed state)
        const targetPositions = {
            front: { x: -1.75, y: 0.1 },
            back: { x: -1.75, y: -0.45 },
            spine: { x: -1.835, y: -0.175 }
        };

        // Get half of the pages for animation
        const pages = pageGroup.children;
        const halfPageCount = Math.floor(pages.length / 2);
        const pagesToAnimate = pages.slice(0, halfPageCount);

        // Store initial page positions and rotations (opened state)
        const startPageStates = pagesToAnimate.map(page => ({
            position: { x: page.position.x, y: page.position.y, z: page.position.z },
            rotation: { y: page.rotation.y }
        }));

        // Target page positions (closed state)
        const targetPageStates = pagesToAnimate.map((_, index) => ({
            position: {
                x: -1.68 + (Math.random() * 0.1 - 0.135),
                y: -0.007 * index,
                z: 0
            },
            rotation: { y: 0 }
        }));

        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);

            // Move diary group back to original position
            diaryGroup.position.x = initialGroupPos - (2.1 * easedProgress);

            // Animate covers and spine
            frontCover.position.x = startPositions.front.x + (targetPositions.front.x - startPositions.front.x) * easedProgress;
            frontCover.position.y = startPositions.front.y + (targetPositions.front.y - startPositions.front.y) * easedProgress;
            frontCover.rotation.z = startRotationF * (1 - easedProgress);

            spine.position.x = startPositions.spine.x + (targetPositions.spine.x - startPositions.spine.x) * easedProgress;
            spine.position.y = startPositions.spine.y + (targetPositions.spine.y - startPositions.spine.y) * easedProgress;
            spine.rotation.y = (Math.PI / 2) * (1 - easedProgress);

            backCover.position.y = startPositions.back.y + (targetPositions.back.y - startPositions.back.y) * easedProgress;
            backCover.rotation.z = startRotationB * (1 - easedProgress);

            // Animate pages with cascade effect
            pagesToAnimate.forEach((page, index) => {
                const pageDelay = (pagesToAnimate.length - index - 1) * 0.0005; // Reverse cascade
                const pageProgress = Math.max(0, Math.min(1, (progress - pageDelay) * 1.25));
                const pageEasedProgress = easeOutQuart(pageProgress);

                const startState = startPageStates[index];
                const targetState = targetPageStates[index];

                page.position.x = startState.position.x + (targetState.position.x - startState.position.x) * pageEasedProgress;
                page.position.y = startState.position.y + (targetState.position.y - startState.position.y) * pageEasedProgress;
                page.rotation.y = startState.rotation.y * (1 - pageEasedProgress);
            });

            // Animate remaining pages group
            pageGroup.position.x = initialPageGroupPosX + 0.4 * easedProgress;
            pageGroup.position.y = 0.09 * Math.sin((1 - easedProgress) * Math.PI / 2);
            pageGroup.rotation.z = startRotationB * (1 - easedProgress);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                animationRef.current = null;
                setIsAnimating(false);
            }
        };

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (sceneRef.current) return;

        const scene = new THREE.Scene();
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0x000000, 0);

        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.75;
        controls.minDistance = 4;
        controls.maxDistance = 12;
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

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

            for (let i = 0; i < 50; i++) {
                const pageGeometry = new THREE.PlaneGeometry(3.2, 5.1);
                pageGeometry.translate(1.6, 0, 0);

                const pageMaterial = new THREE.MeshStandardMaterial({
                    map: paperTexture,
                    side: THREE.DoubleSide,
                    roughness: 0.9,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.95
                });

                const page = new THREE.Mesh(pageGeometry, pageMaterial);
                page.rotation.x = Math.PI / 2;
                page.position.set(
                    -1.68 + (Math.random() * 0.1 - 0.135),
                    -0.007 * i,
                    0
                );

                page.receiveShadow = true;
                pageGroup.add(page);
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
            // Small delay to ensure proper orientation update
            setTimeout(handleResize, 100);
        });

        const { frontCover, backCover } = createDiaryCover();
        const pageGroup = createPages();
        const spine = createDiarySpine();
        createLighting();

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

            requestAnimationFrame(animate);

            const { controls, renderer, camera, scene } = sceneRef.current;
            controls.update();
            renderer.render(scene, camera);
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
    }, []);

    // Add touch event handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault(); // Prevent pinch zoom on mobile browsers
        }
    };

    return (
        <>
            <div id="caption">
                <h1 className="text-[27vw] text-white uppercase absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 select-none">
                    diary
                </h1>
            </div>
            <div
                ref={mountRef}
                className="w-full h-screen absolute top-0 left-0 z-10"
                title="Drag To Interact With The Diary"
                onTouchStart={handleTouchStart}
            >
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-4">
                    <button
                        onClick={openDiary}
                        disabled={isAnimating}
                        className={`text-gray-300 font-sans bg-slate-800 bg-opacity-40 px-4 py-2 rounded-md cursor-pointer transition-opacity duration-300 
                        ${isOpened || isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-50'}`}
                    >
                        Open Diary
                    </button>
                    <button
                        onClick={closeDiary}
                        disabled={isAnimating}
                        className={`text-gray-300 font-sans bg-slate-800 bg-opacity-40 px-4 py-2 rounded-md cursor-pointer transition-opacity duration-300 
                        ${!isOpened || isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-50'}`}
                    >
                        Close Diary
                    </button>
                </div>
            </div>
        </>
    );
};

export default Diary3D;