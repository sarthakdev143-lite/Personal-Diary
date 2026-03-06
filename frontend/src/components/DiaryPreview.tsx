import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface DiaryPreviewProps {
    selectedTexture: string;
}

const DiaryPreview: React.FC<DiaryPreviewProps> = ({ selectedTexture }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const diaryGroupRef = useRef<THREE.Group | null>(null);
    const animationIdRef = useRef<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize Three.js scene once
    useEffect(() => {
        if (!mountRef.current) return;

        // Initialize scene, camera, and renderer if they don't exist
        if (!sceneRef.current) {
            const scene = new THREE.Scene();
            scene.background = null;
            sceneRef.current = scene;
        }

        if (!cameraRef.current) {
            const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
            camera.position.set(0, 5, 8);
            camera.lookAt(0, 0, 0);
            cameraRef.current = camera;
        }

        if (!rendererRef.current) {
            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(400, 400);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.setClearColor(0x000000, 0);
            rendererRef.current = renderer;
            mountRef.current.appendChild(renderer.domElement);
        }

        if (!controlsRef.current && cameraRef.current && rendererRef.current) {
            const controls = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
            controls.minDistance = 4;
            controls.maxDistance = 10;
            controls.maxPolarAngle = Math.PI * 0.8;
            controls.minPolarAngle = Math.PI * 0.2;
            controlsRef.current = controls;
        }

        // Add lighting if not already present
        if (sceneRef.current.children.filter(child => child.type === 'AmbientLight').length === 0) {
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            sceneRef.current.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            sceneRef.current.add(directionalLight);
        }

        // Animation loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            if (rendererRef.current && cameraRef.current && sceneRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };

        animate();

        // Cleanup function
        return () => {
            cancelAnimationFrame(animationIdRef.current);
        };
    }, []);

    // Update diary when texture changes
    useEffect(() => {
        if (!sceneRef.current) return;

        setIsLoading(true);
        const textureLoader = new THREE.TextureLoader();

        // Remove existing diary if it exists
        if (diaryGroupRef.current) {
            sceneRef.current.remove(diaryGroupRef.current);
            disposeGroup(diaryGroupRef.current);
            diaryGroupRef.current = null;
        }

        // Load the selected texture
        textureLoader.load(selectedTexture, (texture) => {
            const diaryGroup = new THREE.Group();
            diaryGroupRef.current = diaryGroup;

            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;

            // Create cover material
            const coverMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.8,
                metalness: 0.5,
                color: 0xB5794F,
            });

            // Create front and back covers
            const coverGeometry = new THREE.BoxGeometry(3.5, 0.17, 5.5);
            coverGeometry.translate(1.75, 0, 0);

            const frontCover = new THREE.Mesh(coverGeometry, coverMaterial);
            frontCover.castShadow = true;
            frontCover.position.set(-1.75, 0.1, 0);

            const backCover = new THREE.Mesh(coverGeometry, coverMaterial);
            backCover.castShadow = true;
            backCover.position.set(-1.75, -0.45, 0);

            diaryGroup.add(frontCover, backCover);

            // Create spine
            const spineMaterial = new THREE.MeshStandardMaterial({
                map: texture,
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

            // Add spine edges
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

            // Create simplified pages
            const pageGroup = new THREE.Group();

            // Load paper texture
            textureLoader.load("/textures/paper-texture.jpg", () => {
                setIsLoading(false);
            });

            const paperTexture = textureLoader.load("/textures/paper-texture.jpg");
            paperTexture.wrapS = THREE.RepeatWrapping;
            paperTexture.wrapT = THREE.RepeatWrapping;

            const pageMaterial = new THREE.MeshStandardMaterial({
                map: paperTexture,
                side: THREE.DoubleSide,
                roughness: 0.9,
                metalness: 0.1,
                transparent: true,
                opacity: 0.95,
            });

            // Create a simplified page stack
            for (let i = 0; i < 50; i++) {
                const pageGeometry = new THREE.PlaneGeometry(3.2, 5.1);
                pageGeometry.translate(1.6, 0, 0);

                const page = new THREE.Mesh(pageGeometry, pageMaterial);
                page.rotation.x = Math.PI / 2;
                page.position.set(-1.68 + (Math.random() * 0.05 - 0.067), -0.007 * i, 0);
                page.receiveShadow = true;

                pageGroup.add(page);
            }

            diaryGroup.add(pageGroup);
            sceneRef.current!.add(diaryGroup);
        });

    }, [selectedTexture]);

    // Helper function to dispose of group resources
    const disposeGroup = (group: THREE.Group) => {
        group.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelAnimationFrame(animationIdRef.current);

            if (rendererRef.current) {
                rendererRef.current.dispose();
            }

            if (controlsRef.current) {
                controlsRef.current.dispose();
            }

            if (diaryGroupRef.current) {
                disposeGroup(diaryGroupRef.current);
            }

            if (mountRef.current && mountRef.current.firstChild) {
                mountRef.current.removeChild(mountRef.current.firstChild);
            }
        };
    }, []);

    return (
        <div
            ref={mountRef}
            className="w-full h-full flex items-center justify-center relative"
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="text-white">Loading...</div>
                </div>
            )}
        </div>
    );
};

export default DiaryPreview;