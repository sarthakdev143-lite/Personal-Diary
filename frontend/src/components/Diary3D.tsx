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
    }, []);

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