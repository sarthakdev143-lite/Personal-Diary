import * as THREE from "three";

export const useSetupScene = () => {


    const scene = new THREE.Scene();
    scene.background = null;
    const textureLoader = new THREE.TextureLoader();
    const diaryGroup = new THREE.Group();

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

        // First Page (Left Side) 
        const firstPageGeometry = new THREE.PlaneGeometry(3.2, 5.1);
        firstPageGeometry.translate(1.6, 0, 0);

        const firstPageCanvas = document.createElement("canvas");
        firstPageCanvas.width = 512;
        firstPageCanvas.height = 1024;
        const ctx = firstPageCanvas.getContext("2d");

        if (ctx) {
            ctx.fillStyle = "#fdf4e3"; 
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

    return {
        createDiaryCover,
        createPages,
        createDiarySpine,
        createLighting,
        scene, diaryGroup
    }
}