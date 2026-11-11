import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

type DiaryMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
type PageMesh = DiaryMesh & {
    userData: {
        closedState?: {
            position: { x: number; y: number; z: number };
            rotationY: number;
        };
    };
};

const configureTexture = (texture: THREE.Texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
};

const createCanvasTexture = (
    draw: (ctx: CanvasRenderingContext2D, texture: THREE.CanvasTexture, canvas: HTMLCanvasElement) => void
) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;

    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;

    const ctx = canvas.getContext("2d");
    if (ctx) {
        draw(ctx, texture, canvas);
    }

    texture.needsUpdate = true;
    return texture;
};

const createIntroPageTexture = () =>
    createCanvasTexture((ctx, texture, canvas) => {
        ctx.fillStyle = "#fdf4e3";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        ctx.fillStyle = "#2f2f2f";
        ctx.font = "30px cursive";
        ctx.fillText("Welcome to Your Digital Diary!", 30, 80);

        ctx.font = "24px cursive";
        ctx.fillText("👨‍💻 Developer: @sarthakdev143", 30, 140);

        ctx.font = "22px cursive";
        [
            "📖 Features:",
            "- Fully private & encrypted 🔒",
            "- Add images with text 📸",
            "- Customizable themes 🎨",
            "- Offline mode ☁️",
            "- Open source 🔓",
        ].forEach((line, index) => {
            ctx.fillText(line, index === 0 ? 30 : 50, 180 + index * 50);
        });

        ctx.font = "italic 22px cursive";
        ctx.fillText("“Writing is the painting of the voice.”", 50, 520);
        ctx.fillText("- Voltaire", 200, 550);
        ctx.fillText("Scan this QR for a FREE gift :)", 105, 920);

        ctx.restore();

        const image = new Image();
        image.src = "/qr-code.png";
        image.onload = () => {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(image, 130, 620, 240, 240);
            ctx.restore();
            texture.needsUpdate = true;
        };
    });

const createMiddlePageTexture = () =>
    createCanvasTexture((ctx, _texture, canvas) => {
        ctx.fillStyle = "#fdf4e3";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#2f2f2f";
        ctx.font = "30px cursive";
        ctx.fillText("💔 You Left, But I Stayed 💔", 55, 80);

        ctx.font = "22px cursive";
        ctx.fillText("- @sarthakdev143", 300, 120);

        ctx.font = "22px cursive";
        [
            "I called your name in the quiet night,",
            "but the wind carried it far from sight.",
            "I reached for you in the empty air,",
            "but found nothing, just silence there.",
            "",
            "You were the warmth in my coldest days,",
            "now I shiver in love’s empty space.",
            "Your touch once felt like home to me,",
            "now it’s just a ghost I cannot see.",
            "",
            "You left so easily, without a sound,",
            "while I stood there, broken, bound.",
            "Did love mean nothing, was it all a lie?",
            "Then why does my heart still ask why?",
            "",
            "I loved you more than words can say,",
            "yet you let us fade away.",
            "Now all I have is this endless ache,",
            "a love that only I still take. 💔",
        ].forEach((line, index) => {
            ctx.fillText(line, 55, 180 + index * 40);
        });
    });

const storeClosedState = (page: PageMesh) => {
    page.userData.closedState = {
        position: {
            x: page.position.x,
            y: page.position.y,
            z: page.position.z,
        },
        rotationY: page.rotation.y,
    };
};

export const disposeThreeObject = (root: THREE.Object3D) => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;

        geometries.add(object.geometry);
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];

        meshMaterials.forEach((material) => {
            materials.add(material);

            const materialWithMaps = material as THREE.Material &
                Partial<Record<
                    | "alphaMap"
                    | "aoMap"
                    | "bumpMap"
                    | "displacementMap"
                    | "emissiveMap"
                    | "envMap"
                    | "lightMap"
                    | "map"
                    | "metalnessMap"
                    | "normalMap"
                    | "roughnessMap"
                    | "specularMap",
                    THREE.Texture | null
                >>;

            Object.values(materialWithMaps).forEach((value) => {
                if (value instanceof THREE.Texture) {
                    textures.add(value);
                }
            });
        });
    });

    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
};

export const useSetupScene = (texture: string | null = null) => {
    const sceneRef = useRef<THREE.Scene>(null!);
    const textureLoaderRef = useRef<THREE.TextureLoader>(null!);
    const diaryGroupRef = useRef<THREE.Group>(null!);
    const frontCoverRef = useRef<DiaryMesh | null>(null);
    const backCoverRef = useRef<DiaryMesh | null>(null);
    const spineRef = useRef<DiaryMesh | null>(null);

    if (!sceneRef.current) {
        const nextScene = new THREE.Scene();
        nextScene.background = null;
        sceneRef.current = nextScene;
    }

    if (!textureLoaderRef.current) {
        textureLoaderRef.current = new THREE.TextureLoader();
    }

    if (!diaryGroupRef.current) {
        diaryGroupRef.current = new THREE.Group();
    }

    const loadTexture = useCallback(
        (textureUrl: string) => configureTexture(textureLoaderRef.current.load(textureUrl)),
        []
    );

    const createDiaryCover = useCallback(
        (coverTexture: THREE.Texture) => {
            const coverGeometry = new THREE.BoxGeometry(3.5, 0.17, 5.5);
            coverGeometry.translate(1.75, 0, 0);

            const frontCover = new THREE.Mesh(
                coverGeometry,
                new THREE.MeshStandardMaterial({
                    map: coverTexture,
                    roughness: 0.8,
                    metalness: 0.5,
                    color: 0xb5794f,
                })
            );
            frontCover.castShadow = true;
            frontCover.position.set(-1.75, 0.1, 0);
            frontCoverRef.current = frontCover;

            const backCover = new THREE.Mesh(
                coverGeometry,
                new THREE.MeshStandardMaterial({
                    map: coverTexture,
                    roughness: 0.8,
                    metalness: 0.5,
                    color: 0xb5794f,
                })
            );
            backCover.castShadow = true;
            backCover.position.set(-1.75, -0.45, 0);
            backCoverRef.current = backCover;

            diaryGroupRef.current.add(frontCover, backCover);
            return { frontCover, backCover };
        },
        []
    );

    const createPages = useCallback(
        ({
            pageCount = 50,
            includeContentPages = true,
            pageSpread = 0.1,
        }: {
            pageCount?: number;
            includeContentPages?: boolean;
            pageSpread?: number;
        } = {}) => {
            const paperTexture = loadTexture("/textures/paper-texture.jpg");
            const pageGroup = new THREE.Group();
            const pageGeometry = new THREE.PlaneGeometry(3.2, 5.1);
            pageGeometry.translate(1.6, 0, 0);

            const firstPageMaterial = new THREE.MeshStandardMaterial({
                map: includeContentPages ? createIntroPageTexture() : paperTexture,
                side: THREE.DoubleSide,
                roughness: 0.9,
                metalness: 0.1,
            });

            const firstPage = new THREE.Mesh(pageGeometry, firstPageMaterial) as PageMesh;
            firstPage.rotation.x = Math.PI / 2;
            firstPage.position.set(-1.68, 0, 0);
            storeClosedState(firstPage);
            pageGroup.add(firstPage);

            const middlePageIndex = Math.floor(pageCount / 2);

            for (let index = 1; index < pageCount; index += 1) {
                const pageMaterial = new THREE.MeshStandardMaterial({
                    map: includeContentPages && index === middlePageIndex ? createMiddlePageTexture() : paperTexture,
                    side: THREE.DoubleSide,
                    roughness: 0.9,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.95,
                });

                const page = new THREE.Mesh(pageGeometry, pageMaterial) as PageMesh;
                page.rotation.x = Math.PI / 2;
                page.position.set(-1.68 + (Math.random() * pageSpread - 0.135), -0.007 * index, 0);
                page.receiveShadow = true;

                storeClosedState(page);
                pageGroup.add(page);
            }

            diaryGroupRef.current.add(pageGroup);
            return pageGroup;
        },
        [loadTexture]
    );

    const createDiarySpine = useCallback(
        (coverTexture: THREE.Texture) => {
            const spineMaterial = new THREE.MeshStandardMaterial({
                map: coverTexture,
                roughness: 0.7,
                metalness: 0.2,
                color: 0xa0522d,
                side: THREE.DoubleSide,
            });

            const spineGeometry = new THREE.BoxGeometry(0.17, 5.5, 0.38);
            const spine = new THREE.Mesh(spineGeometry, spineMaterial);
            spine.castShadow = true;
            spine.rotation.x = Math.PI / 2;
            spine.position.set(-1.835, -0.175, 0);
            spineRef.current = spine;

            const topEdge = new THREE.CylinderGeometry(0.13, 0.13, 5.5, 32, 1, false, Math.PI, Math.PI / 2);
            const topEdgeMesh = new THREE.Mesh(topEdge, spineMaterial);
            topEdgeMesh.position.set(0.085, 0, -0.19);
            spine.add(topEdgeMesh);

            const bottomEdge = new THREE.CylinderGeometry(0.13, 0.13, 5.5, 32, 1, false, 0, Math.PI / 2);
            const bottomEdgeMesh = new THREE.Mesh(bottomEdge, spineMaterial);
            bottomEdgeMesh.position.set(0.085, 0, 0.19);
            bottomEdgeMesh.rotation.z = Math.PI;
            spine.add(bottomEdgeMesh);

            diaryGroupRef.current.add(spine);
            return spine;
        },
        []
    );

    const createLighting = useCallback(() => {
        if (sceneRef.current.getObjectByName("diary-ambient-light")) return;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        ambientLight.name = "diary-ambient-light";

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.name = "diary-directional-light";
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;

        sceneRef.current.add(ambientLight, directionalLight);
    }, []);

    useEffect(() => {
        if (!texture || !frontCoverRef.current || !backCoverRef.current) return;

        const nextTexture = configureTexture(textureLoaderRef.current.load(texture));
        const oldTextures = new Set<THREE.Texture>();

        [frontCoverRef.current, backCoverRef.current, spineRef.current].forEach((mesh) => {
            if (!mesh) return;

            if (mesh.material.map) {
                oldTextures.add(mesh.material.map);
            }

            mesh.material.map = nextTexture;
            mesh.material.needsUpdate = true;
        });

        oldTextures.forEach((oldTexture) => {
            if (oldTexture !== nextTexture) {
                oldTexture.dispose();
            }
        });
    }, [texture]);

    const updateCoverTexture = useCallback(
        (textureUrl: string, meshes: Array<THREE.Mesh | undefined>) => {
            const coverTexture = loadTexture(textureUrl);
            const oldTextures = new Set<THREE.Texture>();
            const seenMaterials = new Set<THREE.Material>();

            meshes.forEach((mesh) => {
                if (!mesh) return;

                const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                meshMaterials.forEach((material) => {
                    if (seenMaterials.has(material)) return;
                    seenMaterials.add(material);

                    const standardMaterial = material as THREE.MeshStandardMaterial;
                    if (standardMaterial.map) {
                        oldTextures.add(standardMaterial.map);
                    }

                    standardMaterial.map = coverTexture;
                    standardMaterial.needsUpdate = true;
                });
            });

            oldTextures.forEach((texture) => {
                if (texture !== coverTexture) {
                    texture.dispose();
                }
            });
        },
        [loadTexture]
    );

    return {
        createDiaryCover,
        createDiarySpine,
        createLighting,
        createPages,
        diaryGroup: diaryGroupRef.current,
        loadTexture,
        scene: sceneRef.current,
        updateCoverTexture,
    };
};
