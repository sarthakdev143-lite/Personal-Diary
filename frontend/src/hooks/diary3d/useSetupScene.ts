import * as THREE from "three";

export const useSetupScene = (texture: string) => {

    const scene = new THREE.Scene();
    scene.background = null;
    const textureLoader = new THREE.TextureLoader();
    const diaryGroup = new THREE.Group();

    const createDiaryCover = () => {
        console.log(texture);
        const diaryCoverTexture = textureLoader.load(texture);
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

        // First Page (Left Side) - Introduction Page
        const firstPageGeometry = new THREE.PlaneGeometry(3.2, 5.1);
        firstPageGeometry.translate(1.6, 0, 0);

        const firstPageCanvas = document.createElement("canvas");
        firstPageCanvas.width = 512;
        firstPageCanvas.height = 1024;
        const ctx = firstPageCanvas.getContext("2d");

        if (ctx) {
            ctx.fillStyle = "#fdf4e3";
            ctx.fillRect(0, 0, firstPageCanvas.width, firstPageCanvas.height);

            // Save state before flipping
            ctx.save();
            ctx.translate(firstPageCanvas.width, 0);
            ctx.scale(-1, 1);

            // Draw text (properly mirrored back to normal)
            ctx.fillStyle = "#2f2f2f";
            ctx.font = "30px cursive";
            ctx.fillText("Welcome to Your Digital Diary!", 30, 80);

            ctx.font = "24px cursive";
            ctx.fillText("👨‍💻 Developer: @sarthakdev143", 30, 140);

            ctx.font = "22px cursive";
            ctx.fillText("📖 Features:", 30, 180);
            ctx.fillText("- Fully private & encrypted 🔒", 50, 230);
            ctx.fillText("- Add images with text 📸", 50, 280);
            ctx.fillText("- Customizable themes 🎨", 50, 330);
            ctx.fillText("- Offline mode ☁️", 50, 380);
            ctx.fillText("- Open source 🔓", 50, 430);

            ctx.font = "italic 22px cursive";
            ctx.fillText("“Writing is the painting of the voice.”", 50, 520);
            ctx.fillText("- Voltaire", 200, 550);
            ctx.fillText("Scan this QR for a cokkie :)", 105, 920);

            ctx.restore(); // Restore normal transformation for images

            const img = new Image();
            img.src = "/qr-code.png";

            img.onload = () => {
                // Mirror the image to account for the back face rendering
                ctx.save();
                ctx.translate(firstPageCanvas.width, 0); // Move to right edge
                ctx.scale(-1, 1); // Flip context horizontally
                ctx.drawImage(img, 130, 600, 240, 275);
                ctx.restore();

                firstPageTexture.needsUpdate = true;
            };

            img.onerror = () => {
                console.error("Failed to load image.");
            };

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

        // Modify the Middle Page (Right Side) - Sample Diary Entry
        if (middlePage) {
            const middlePageCanvas = document.createElement("canvas");
            middlePageCanvas.width = 512;
            middlePageCanvas.height = 1024;
            const ctxMiddle = middlePageCanvas.getContext("2d");

            if (ctxMiddle) {
                ctxMiddle.fillStyle = "#fdf4e3";
                ctxMiddle.fillRect(0, 0, middlePageCanvas.width, middlePageCanvas.height);

                // Title & Date
                ctxMiddle.fillStyle = "#2f2f2f";
                ctxMiddle.font = "30px cursive";
                ctxMiddle.fillText("💔 You Left, But I Stayed 💔", 55, 80);

                ctxMiddle.font = "22px cursive";
                ctxMiddle.fillText("- @sarthakdev143", 300, 120);

                // Poem Text
                ctxMiddle.font = "22px cursive";
                const poemLines = [
                    "I called your name in the quiet night,",
                    "but the wind carried it far from sight.",
                    "I reached for you in the empty air,",
                    "but found nothing—just silence there.",
                    "",
                    "You were the warmth in my coldest days,",
                    "now I shiver in love’s empty space.",
                    "Your touch once felt like home to me,",
                    "now it’s just a ghost I cannot see.",
                    "",
                    "You left so easily, without a sound,",
                    "while I stood there, broken, bound.",
                    "Did love mean nothing—was it all a lie?",
                    "Then why does my heart still ask why?",
                    "",
                    "I loved you more than words can say,",
                    "yet you let us fade away.",
                    "Now all I have is this endless ache,",
                    "a love that only I still take. 💔"
                ];

                let yOffset = 180; // Starting position for text
                poemLines.forEach((line) => {
                    ctxMiddle.fillText(line, 55, yOffset);
                    yOffset += 40; // Adjust line spacing
                });
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