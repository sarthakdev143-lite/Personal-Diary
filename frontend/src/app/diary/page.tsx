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
        diaryGroup: THREE.Group
    } | null>(null);

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Prevent multiple scene creations
        if (sceneRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0x000000, 0); // Set clear color to transparent

        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        // Orbit Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        const handleDragging = () => {
            const element = mountRef.current;
            if (!element) return; // Ensure the element exists

            let isDragging = false;

            const handleMouseDown = () => {
                isDragging = false;
            };

            const handleMouseMove = () => {
                isDragging = true;
            };

            const handleMouseUp = () => {
                if (isDragging) {
                    toggleDiary();
                }
            };

            element.addEventListener('mousedown', handleMouseDown);
            element.addEventListener('mousemove', handleMouseMove);
            element.addEventListener('mouseup', handleMouseUp);

            return () => {
                element.removeEventListener('mousedown', handleMouseDown);
                element.removeEventListener('mousemove', handleMouseMove);
                element.removeEventListener('mouseup', handleMouseUp);
            }
        }

        handleDragging();

        // Texture Loading
        const textureLoader = new THREE.TextureLoader();

        // Diary Components Group
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

            // Front cover
            const frontCover = new THREE.Mesh(coverGeometry, coverMaterial);
            frontCover.castShadow = true;
            frontCover.position.set(0, 0.1, 0); // Place in front of the pages

            // Back cover
            const backCover = new THREE.Mesh(coverGeometry, coverMaterial);
            backCover.castShadow = true;
            backCover.position.set(0, -0.45, 0); // Place behind the pages

            diaryGroup.add(frontCover, backCover);

            return { frontCover, backCover };
        };

        const createPages = () => {
            const paperTexture = textureLoader.load("/paper-texture.jpg");
            paperTexture.wrapS = THREE.RepeatWrapping;
            paperTexture.wrapT = THREE.RepeatWrapping;

            const pageGroup = new THREE.Group();

            for (let i = 0; i < 50; i++) {
                const pageGeometry = new THREE.PlaneGeometry(3.4, 5);
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
                    (Math.random() * 0.2 - 0.1),
                    -0.007 * i,  // Distance b/w pages
                    (Math.random() * 0.2 - 0.1)
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

            // Create a flat, rectangular prism for the spine
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

        // Initialize Scene
        createDiaryCover();
        createPages();
        createDiarySpine();
        createLighting();

        function updateCameraPosition() {
            const aspectRatio = window.innerWidth / window.innerHeight;
            const baseDistance = 8;
            const widthFactor = Math.min(window.innerWidth / 1000, 1);
            const heightFactor = Math.min(window.innerHeight / 1000, 1);

            const cameraDistance = aspectRatio > 1
                ? (aspectRatio > 2
                    ? baseDistance * widthFactor * 0.8
                    : baseDistance * widthFactor)
                : (aspectRatio < 0.75
                    ? baseDistance * heightFactor * 3
                    : baseDistance * heightFactor * 1.2);

            camera.position.set(0, 3, cameraDistance);
        }

        // Call the function on load and resize
        updateCameraPosition();
        window.addEventListener('resize', updateCameraPosition);

        controls.target.set(0, 0, 0);

        // Store references to prevent re-creation
        sceneRef.current = { scene, camera, renderer, controls, diaryGroup };

        // Animation Loop
        const animate = () => {
            if (!sceneRef.current) return;

            requestAnimationFrame(animate);

            const { diaryGroup, controls, renderer, camera, scene } = sceneRef.current;

            if (!isOpen) {
                diaryGroup.rotation.y += 0.002;
            } else {
                // Page opening animation
            }

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', updateCameraPosition);
            if (mountRef.current && sceneRef.current) {
                mountRef.current.removeChild(sceneRef.current.renderer.domElement);
            }
            sceneRef.current = null;
        };
    }, []);

    const toggleDiary = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            <div id="caption">
                <h1 className="text-[27vw] text-white uppercase absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 select-none">diary</h1>
            </div>
            <div
                ref={mountRef}
                className="w-full h-screen cursor-pointer absolute top-0 left-0 z-10"
                onClick={toggleDiary}
                title="Click to interact with the diary"
            >
                <div
                    className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-gray-600 font-sans"
                >
                    <span className="bg-slate-700 bg-opacity-30 text-white px-6 py-4 rounded select-none">{isOpen ? "Close Diary" : "Open Diary"}</span>
                </div>
            </div>
        </>
    );
};

export default Diary3D;