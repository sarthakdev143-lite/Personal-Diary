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
        scene.background = new THREE.Color(0xf5f5f5);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;

        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        // Orbit Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

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
                roughness: 0.7,
                metalness: 0.2,
                color: 0x8B4513 // Rich brown leather color
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

            for (let i = 0; i < 45; i++) {
                const pageGeometry = new THREE.PlaneGeometry(3.2, 5);
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
                    -0.01 * i, 
                    (Math.random() * 0.2 - 0.1)
                );

                page.receiveShadow = true;
                pageGroup.add(page);
            }

            diaryGroup.add(pageGroup);
            return pageGroup;
        };


        // Improved Lighting
        const createLighting = () => {
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
            directionalLight.position.set(5, 10, 7);
            directionalLight.castShadow = true;

            scene.add(ambientLight, directionalLight);
        };

        // Initialize Scene
        createDiaryCover();
        createPages();
        createLighting();

        camera.position.set(0, 3, 7);
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
                diaryGroup.rotation.y = THREE.MathUtils.lerp(
                    diaryGroup.rotation.y,
                    Math.PI / 2,
                    0.1
                );
            }

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Resize Handler
        const handleResize = () => {
            if (!sceneRef.current) return;
            const { camera, renderer } = sceneRef.current;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (mountRef.current && sceneRef.current) {
                mountRef.current.removeChild(sceneRef.current.renderer.domElement);
            }
            sceneRef.current = null;
        };
    }, []); // Empty dependency array to run only once

    const toggleDiary = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div
            ref={mountRef}
            style={{
                width: "100%",
                height: "100vh",
                cursor: "pointer"
            }}
            onClick={toggleDiary}
            title="Click to interact with the diary"
        >
            <div
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'rgba(0,0,0,0.6)',
                    fontFamily: 'Arial, sans-serif'
                }}
            >
                {isOpen ? "Close Diary" : "Open Diary"}
            </div>
        </div>
    );
};

export default Diary3D;