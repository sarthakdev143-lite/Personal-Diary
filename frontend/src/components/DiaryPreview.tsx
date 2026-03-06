import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { disposeThreeObject, useSetupScene } from "@/hooks/diary3d/useSetupScene";

interface DiaryPreviewProps {
    selectedTexture: string;
}

type PreviewMeshes = {
    frontCover: THREE.Mesh;
    backCover: THREE.Mesh;
    spine: THREE.Mesh;
};

const DiaryPreview: React.FC<DiaryPreviewProps> = ({ selectedTexture }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const previewMeshesRef = useRef<PreviewMeshes | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const initialTextureRef = useRef(selectedTexture);
    const [isLoading, setIsLoading] = useState(true);

    const { createDiaryCover, createDiarySpine, createLighting, createPages, diaryGroup, loadTexture, scene, updateCoverTexture } =
        useSetupScene();

    useEffect(() => {
        if (!mountRef.current || previewMeshesRef.current) return;
        const mountElement = mountRef.current;

        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera.position.set(0, 5, 8);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        rendererRef.current = renderer;
        mountElement.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        controls.enablePan = false;
        controls.minDistance = 4;
        controls.maxDistance = 10;
        controls.maxPolarAngle = Math.PI * 0.8;
        controls.minPolarAngle = Math.PI * 0.2;
        controlsRef.current = controls;

        const coverTexture = loadTexture(initialTextureRef.current);
        const { frontCover, backCover } = createDiaryCover(coverTexture);
        const spine = createDiarySpine(coverTexture);
        createPages({ pageCount: 40, includeContentPages: false, pageSpread: 0.05 });
        createLighting();
        scene.add(diaryGroup);

        previewMeshesRef.current = { frontCover, backCover, spine };

        const resizeRenderer = () => {
            if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

            const width = mountElement.clientWidth || 400;
            const height = mountElement.clientHeight || 400;

            rendererRef.current.setSize(width, height);
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
        };

        const resizeObserver = new ResizeObserver(resizeRenderer);
        resizeObserver.observe(mountElement);
        resizeRenderer();

        const animate = () => {
            animationIdRef.current = window.requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };

        animationIdRef.current = window.requestAnimationFrame(animate);
        setIsLoading(false);

        return () => {
            if (animationIdRef.current !== null) {
                window.cancelAnimationFrame(animationIdRef.current);
            }

            resizeObserver.disconnect();
            controls.dispose();
            scene.remove(diaryGroup);
            disposeThreeObject(diaryGroup);
            renderer.dispose();

            previewMeshesRef.current = null;
            sceneRef.current = null;

            if (mountElement.contains(renderer.domElement)) {
                mountElement.removeChild(renderer.domElement);
            }
        };
    }, [
        createDiaryCover,
        createDiarySpine,
        createLighting,
        createPages,
        diaryGroup,
        loadTexture,
        scene,
    ]);

    useEffect(() => {
        if (!previewMeshesRef.current) return;

        setIsLoading(true);
        updateCoverTexture(selectedTexture, [
            previewMeshesRef.current.frontCover,
            previewMeshesRef.current.backCover,
            previewMeshesRef.current.spine,
        ]);
        setIsLoading(false);
    }, [selectedTexture, updateCoverTexture]);

    return (
        <div ref={mountRef} className="relative flex h-full w-full items-center justify-center">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="text-white">Loading...</div>
                </div>
            )}
        </div>
    );
};

export default DiaryPreview;
