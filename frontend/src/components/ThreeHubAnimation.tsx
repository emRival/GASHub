import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeHubAnimation = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 3, 10);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Main group
        const mainGroup = new THREE.Group();
        scene.add(mainGroup);

        // Create hubs
        const createHub = (color: number, xPos: number) => {
            const group = new THREE.Group();

            const core = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.8, 1),
                new THREE.MeshBasicMaterial({
                    color,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.4,
                })
            );
            group.add(core);

            const shell = new THREE.Mesh(
                new THREE.IcosahedronGeometry(1.2, 2),
                new THREE.MeshBasicMaterial({
                    color,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.15,
                })
            );
            group.add(shell);

            group.position.set(xPos, 0, 0);
            return { group, core, shell };
        };

        const hubLeft = createHub(0x3b82f6, -7);
        const hubRight = createHub(0x06b6d4, 7);
        mainGroup.add(hubLeft.group, hubRight.group);

        // Particles
        const particlesCount = 6000;
        const positions = new Float32Array(particlesCount * 3);
        const colors = new Float32Array(particlesCount * 3);
        const originalPositions = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount; i++) {
            const t = Math.random() * 2 - 1;
            const x = t * 7;
            const y = (1 - Math.pow(t, 2)) * 2 + (Math.random() - 0.5) * 0.8;
            const z = (Math.random() - 0.5) * 2;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            originalPositions[i * 3] = x;
            originalPositions[i * 3 + 1] = y;
            originalPositions[i * 3 + 2] = z;

            const color = new THREE.Color(t < 0 ? '#3b82f6' : '#06b6d4');
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleSystem = new THREE.Points(
            particleGeo,
            new THREE.PointsMaterial({
                size: 0.035,
                vertexColors: true,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
            })
        );
        mainGroup.add(particleSystem);

        // Lightning
        const lightningLines: THREE.Line[] = [];
        const lightningMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
        });

        for (let i = 0; i < 3; i++) {
            const line = new THREE.Line(
                new THREE.BufferGeometry(),
                lightningMaterial.clone()
            );
            mainGroup.add(line);
            lightningLines.push(line);
        }

        const updateLightning = (line: THREE.Line, start: THREE.Vector3, end: THREE.Vector3) => {
            const points: THREE.Vector3[] = [];
            const segments = 12;

            for (let i = 0; i <= segments; i++) {
                const p = new THREE.Vector3().lerpVectors(start, end, i / segments);
                if (i > 0 && i < segments) {
                    p.x += (Math.random() - 0.5) * 0.8;
                    p.y += (Math.random() - 0.5) * 1.5;
                    p.z += (Math.random() - 0.5) * 0.8;
                }
                points.push(p);
            }
            line.geometry.setFromPoints(points);
        };

        // Mouse tracking
        let mouseX = 0;
        let mouseY = 0;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            mouseX = (e.clientX - centerX) / 150;
            mouseY = (e.clientY - centerY) / 150;
        };

        window.addEventListener('mousemove', handleMouseMove);

        // Animation loop
        const clock = new THREE.Clock();
        let animationId: number;

        const animate = () => {
            animationId = requestAnimationFrame(animate);

            const elapsed = clock.getElapsedTime();

            // Update particles
            const posAttr = particleGeo.attributes.position.array as Float32Array;
            for (let i = 0; i < particlesCount; i++) {
                const i3 = i * 3;
                posAttr[i3] += 0.025;
                if (posAttr[i3] > 7) posAttr[i3] = -7;
                posAttr[i3 + 1] = originalPositions[i3 + 1] + Math.sin(elapsed * 2 + originalPositions[i3]) * 0.1;
            }
            particleGeo.attributes.position.needsUpdate = true;

            // Rotate hubs
            hubLeft.core.rotation.y += 0.01;
            hubLeft.shell.rotation.z -= 0.005;
            hubRight.core.rotation.y -= 0.01;
            hubRight.shell.rotation.z += 0.005;

            // Lightning flicker
            lightningLines.forEach((line) => {
                const mat = line.material as THREE.LineBasicMaterial;
                if (Math.random() > 0.94) {
                    updateLightning(
                        line,
                        new THREE.Vector3(-7, 0, 0),
                        new THREE.Vector3(7, 0, 0)
                    );
                    mat.opacity = 0.8;
                } else {
                    mat.opacity *= 0.8;
                }
            });

            // Mouse parallax
            mainGroup.rotation.y += (mouseX - mainGroup.rotation.y) * 0.05;
            mainGroup.rotation.x += (-mouseY - mainGroup.rotation.x) * 0.05;

            renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
            if (!container) return;

            const width = container.clientWidth;
            const height = container.clientHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);

            if (container && renderer.domElement && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }

            renderer.dispose();
            particleGeo.dispose();
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default ThreeHubAnimation;
