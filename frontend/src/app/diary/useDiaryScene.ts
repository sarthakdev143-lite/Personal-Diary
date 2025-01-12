import { useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export const useDiaryScene = () => {
    const sceneRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        controls: OrbitControls;
        diaryGroup: THREE.Group;
        frontCover?: THREE.Mesh;
        backCover?: THREE.Mesh;
        spine?: THREE.Mesh;
        pageGroup?: THREE.Group;
    } | null>(null);

    const [isOpened, setIsOpened] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const deviceTypeRef = useRef<'mobile' | 'tablet' | 'desktop'>('desktop');
    const orientationRef = useRef<'portrait' | 'landscape'>('landscape');
    const mountRef = useRef<HTMLDivElement | null>(null);
    const animationRef = useRef<number | null>(null);

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

    // Add touch event handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault(); // Prevent pinch zoom on mobile browsers
        }
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
        const initialPagePositions = pagesToAnimate.map((page: { position: { x: any; y: any; z: any; }; rotation: { z: any; }; }) => ({
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
            pagesToAnimate.forEach((page: { position: { y: number; }; rotation: { y: any; }; }, index: number) => {
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
        const startPageStates = pagesToAnimate.map((page: { position: { x: any; y: any; z: any; }; rotation: { y: any; }; }) => ({
            position: { x: page.position.x, y: page.position.y, z: page.position.z },
            rotation: { y: page.rotation.y }
        }));

        // Target page positions (closed state)
        const targetPageStates = pagesToAnimate.map((_: any, index: number) => ({
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
            pagesToAnimate.forEach((page: { position: { x: any; y: any; }; rotation: { y: number; }; }, index: number) => {
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

    return {
        sceneRef,
        isOpened,
        setIsOpened,
        isAnimating,
        setIsAnimating,
        deviceTypeRef,
        orientationRef,
        mountRef,
        animationRef,
        getDeviceType,
        getOrientation,
        updateCameraAndControls,
        handleResize,   
        easeOutQuart,
        openDiary,
        handleTouchStart,
        closeDiary
    };
};