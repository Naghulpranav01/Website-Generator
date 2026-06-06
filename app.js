/* ============================================
   NexGen AI — Main Application
   Three.js + GSAP + Groq API Integration
   ============================================ */

(() => {
    'use strict';

    // ===========================
    // 1. GLOBAL STATE
    // ===========================
    const state = {
        mouse: { x: 0, y: 0, normalized: { x: 0, y: 0 } },
        apiKey: localStorage.getItem('nexgen_api_key') || '',
        apiProvider: localStorage.getItem('nexgen_api_provider') || 'groq',
        isGenerating: false,
        generatedCode: '',
    };

    // ===========================
    // 2. THREE.JS 3D SCENE
    // ===========================
    function initThreeScene() {
        const container = document.getElementById('three-canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x7c3aed, 0.3);
        scene.add(ambientLight);

        // Point lights
        const pointLight1 = new THREE.PointLight(0x7c3aed, 1.5, 60);
        pointLight1.position.set(15, 15, 15);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x3b82f6, 1.2, 60);
        pointLight2.position.set(-15, -10, 10);
        scene.add(pointLight2);

        const pointLight3 = new THREE.PointLight(0x06b6d4, 0.8, 50);
        pointLight3.position.set(0, 20, -10);
        scene.add(pointLight3);

        // Create geometric objects
        const objects = [];
        const geometries = [
            new THREE.IcosahedronGeometry(1, 0),
            new THREE.OctahedronGeometry(0.8, 0),
            new THREE.TetrahedronGeometry(0.9, 0),
            new THREE.TorusGeometry(0.6, 0.25, 8, 16),
            new THREE.DodecahedronGeometry(0.7, 0),
            new THREE.BoxGeometry(0.8, 0.8, 0.8),
            new THREE.TorusKnotGeometry(0.5, 0.18, 50, 8),
            new THREE.ConeGeometry(0.6, 1.2, 6),
        ];

        const materials = [
            new THREE.MeshPhysicalMaterial({
                color: 0x7c3aed,
                metalness: 0.3,
                roughness: 0.4,
                transparent: true,
                opacity: 0.6,
                wireframe: false,
            }),
            new THREE.MeshPhysicalMaterial({
                color: 0x3b82f6,
                metalness: 0.4,
                roughness: 0.3,
                transparent: true,
                opacity: 0.5,
                wireframe: true,
            }),
            new THREE.MeshPhysicalMaterial({
                color: 0x06b6d4,
                metalness: 0.2,
                roughness: 0.5,
                transparent: true,
                opacity: 0.55,
                wireframe: false,
            }),
            new THREE.MeshPhysicalMaterial({
                color: 0xd946ef,
                metalness: 0.35,
                roughness: 0.45,
                transparent: true,
                opacity: 0.45,
                wireframe: true,
            }),
        ];

        const objectCount = 40;
        for (let i = 0; i < objectCount; i++) {
            const geo = geometries[Math.floor(Math.random() * geometries.length)];
            const mat = materials[Math.floor(Math.random() * materials.length)].clone();

            const scale = 0.3 + Math.random() * 1.0;
            mat.opacity = 0.15 + Math.random() * 0.35;

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 30 - 5
            );
            mesh.scale.set(scale, scale, scale);
            mesh.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            // Physics-like properties
            mesh.userData = {
                velocity: { x: 0, y: 0, z: 0 },
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.008,
                    y: (Math.random() - 0.5) * 0.008,
                    z: (Math.random() - 0.5) * 0.004,
                },
                originalPos: { ...mesh.position },
                mass: scale,
                floatOffset: Math.random() * Math.PI * 2,
                floatSpeed: 0.3 + Math.random() * 0.5,
                floatAmplitude: 0.3 + Math.random() * 0.8,
            };

            scene.add(mesh);
            objects.push(mesh);
        }

        // Mouse repulsion physics
        const mouseWorld = new THREE.Vector3();
        const raycaster = new THREE.Raycaster();
        const mouseVec = new THREE.Vector2();

        function updatePhysics() {
            // Convert screen mouse to 3D world position
            mouseVec.set(state.mouse.normalized.x, state.mouse.normalized.y);
            raycaster.setFromCamera(mouseVec, camera);
            const mouseDir = raycaster.ray.direction.clone();
            mouseWorld.copy(camera.position).add(mouseDir.multiplyScalar(25));

            objects.forEach((obj) => {
                const ud = obj.userData;
                const dx = obj.position.x - mouseWorld.x;
                const dy = obj.position.y - mouseWorld.y;
                const dz = obj.position.z - mouseWorld.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // Repulsion force
                const repulsionRadius = 8;
                if (dist < repulsionRadius) {
                    const force = (1 - dist / repulsionRadius) * 0.15;
                    ud.velocity.x += (dx / dist) * force;
                    ud.velocity.y += (dy / dist) * force;
                    ud.velocity.z += (dz / dist) * force * 0.5;

                    // Spin faster when repelled
                    obj.rotation.x += ud.rotationSpeed.x * 8;
                    obj.rotation.y += ud.rotationSpeed.y * 8;
                }

                // Spring force back to original position
                const springStrength = 0.005;
                ud.velocity.x += (ud.originalPos.x - obj.position.x) * springStrength;
                ud.velocity.y += (ud.originalPos.y - obj.position.y) * springStrength;
                ud.velocity.z += (ud.originalPos.z - obj.position.z) * springStrength;

                // Damping
                const damping = 0.96;
                ud.velocity.x *= damping;
                ud.velocity.y *= damping;
                ud.velocity.z *= damping;

                // Apply velocity
                obj.position.x += ud.velocity.x;
                obj.position.y += ud.velocity.y;
                obj.position.z += ud.velocity.z;

                // Gentle float
                const time = Date.now() * 0.001;
                obj.position.y += Math.sin(time * ud.floatSpeed + ud.floatOffset) * ud.floatAmplitude * 0.005;

                // Rotation
                obj.rotation.x += ud.rotationSpeed.x;
                obj.rotation.y += ud.rotationSpeed.y;
                obj.rotation.z += ud.rotationSpeed.z;
            });

            // Object-to-object collision
            for (let i = 0; i < objects.length; i++) {
                for (let j = i + 1; j < objects.length; j++) {
                    const a = objects[i];
                    const b = objects[j];
                    const dx = b.position.x - a.position.x;
                    const dy = b.position.y - a.position.y;
                    const dz = b.position.z - a.position.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    const minDist = (a.userData.mass + b.userData.mass) * 1.5;

                    if (dist < minDist && dist > 0) {
                        const force = (minDist - dist) * 0.02;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const nz = dz / dist;

                        a.userData.velocity.x -= nx * force;
                        a.userData.velocity.y -= ny * force;
                        b.userData.velocity.x += nx * force;
                        b.userData.velocity.y += ny * force;
                    }
                }
            }
        }

        // Animate
        function animate() {
            requestAnimationFrame(animate);
            updatePhysics();

            // Subtle camera movement following mouse
            camera.position.x += (state.mouse.normalized.x * 2 - camera.position.x) * 0.02;
            camera.position.y += (state.mouse.normalized.y * 1.5 - camera.position.y) * 0.02;
            camera.lookAt(0, 0, 0);

            // Animate point lights
            const t = Date.now() * 0.001;
            pointLight1.position.x = Math.sin(t * 0.3) * 18;
            pointLight1.position.y = Math.cos(t * 0.2) * 15;
            pointLight2.position.x = Math.cos(t * 0.25) * 16;
            pointLight2.position.z = Math.sin(t * 0.15) * 12;

            renderer.render(scene, camera);
        }

        animate();

        // Resize handler
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // ===========================
    // 3. MOUSE TRACKING
    // ===========================
    function initMouseTracking() {
        document.addEventListener('mousemove', (e) => {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            state.mouse.normalized.x = (e.clientX / window.innerWidth) * 2 - 1;
            state.mouse.normalized.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    }

    // ===========================
    // 4. GSAP ANIMATIONS
    // ===========================
    function initAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        // Loading sequence
        const loaderTl = gsap.timeline();
        const loaderBar = document.querySelector('.loader-bar__fill');
        const loaderStatus = document.querySelector('.loader-status');
        const loader = document.getElementById('loader');

        const statuses = [
            'Initializing quantum renderer...',
            'Loading 3D geometries...',
            'Calibrating neural pathways...',
            'Ready.',
        ];

        loaderTl
            .to(loaderBar, { width: '30%', duration: 0.5, ease: 'power2.out',
                onComplete: () => { loaderStatus.textContent = statuses[1]; }
            })
            .to(loaderBar, { width: '70%', duration: 0.6, ease: 'power2.out',
                onComplete: () => { loaderStatus.textContent = statuses[2]; }
            })
            .to(loaderBar, { width: '100%', duration: 0.4, ease: 'power2.out',
                onComplete: () => { loaderStatus.textContent = statuses[3]; }
            })
            .to(loader, {
                opacity: 0,
                duration: 0.5,
                ease: 'power2.inOut',
                onComplete: () => {
                    loader.style.display = 'none';
                    startEntryAnimations();
                }
            }, '+=0.3');

        function startEntryAnimations() {
            const entryTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            // Nav slides down
            entryTl.to('#navbar', {
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
            });

            // Hero badge
            entryTl.to('#hero-badge', {
                opacity: 1,
                y: 0,
                duration: 0.6,
            }, '-=0.3');

            // Title word-by-word reveal
            const words = document.querySelectorAll('.word-reveal');
            words.forEach((word, i) => {
                entryTl.to(word, {
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    duration: 0.7,
                    ease: 'power3.out',
                }, `-=${i === 0 ? 0.1 : 0.55}`);
            });

            // Subtitle
            entryTl.to('#hero-subtitle', {
                opacity: 1,
                y: 0,
                duration: 0.7,
            }, '-=0.4');

            // Prompt container
            entryTl.to('.prompt-container', {
                opacity: 1,
                y: 0,
                duration: 0.8,
            }, '-=0.4');

            // API config
            entryTl.to('.api-config', {
                opacity: 1,
                y: 0,
                duration: 0.5,
            }, '-=0.4');
        }

        // Scroll-triggered animations for features
        gsap.utils.toArray('.feature-card').forEach((card, i) => {
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
                opacity: 0,
                y: 40,
                duration: 0.7,
                delay: i * 0.1,
                ease: 'power3.out',
            });
        });

        // Steps
        gsap.utils.toArray('.step').forEach((step, i) => {
            gsap.from(step, {
                scrollTrigger: {
                    trigger: step,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
                opacity: 0,
                y: 30,
                scale: 0.95,
                duration: 0.6,
                delay: i * 0.15,
                ease: 'power3.out',
            });
        });

        // Section headers
        gsap.utils.toArray('.section-header').forEach((header) => {
            gsap.from(header, {
                scrollTrigger: {
                    trigger: header,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
                opacity: 0,
                y: 30,
                duration: 0.7,
                ease: 'power3.out',
            });
        });

        // Simulator
        gsap.from('#simulator-wrapper', {
            scrollTrigger: {
                trigger: '#simulator-section',
                start: 'top 80%',
                toggleActions: 'play none none none',
            },
            opacity: 0,
            y: 60,
            scale: 0.9,
            duration: 1,
            ease: 'power3.out',
        });
    }

    // ===========================
    // 5. MAGNETIC BUTTON EFFECT
    // ===========================
    function initMagneticButtons() {
        const magneticBtns = document.querySelectorAll('.magnetic');

        magneticBtns.forEach((btn) => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                gsap.to(btn, {
                    x: x * 0.3,
                    y: y * 0.3,
                    duration: 0.3,
                    ease: 'power2.out',
                });
            });

            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, {
                    x: 0,
                    y: 0,
                    duration: 0.5,
                    ease: 'elastic.out(1, 0.4)',
                });
            });
        });
    }

    // ===========================
    // 6. SIMULATOR TILT EFFECT
    // ===========================
    function initSimulatorTilt() {
        const wrapper = document.getElementById('simulator-wrapper');
        if (!wrapper) return;

        document.addEventListener('mousemove', (e) => {
            const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
            const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;

            gsap.to(wrapper, {
                rotateY: xPercent * 8,
                rotateX: -yPercent * 5,
                duration: 1,
                ease: 'power2.out',
            });
        });
    }

    // ===========================
    // 7. CODE SIMULATOR
    // ===========================
    function initCodeSimulator() {
        const codeContainer = document.getElementById('code-lines');
        if (!codeContainer) return;

        const codeLines = [
            '<span class="comment">&lt;!-- AI Generated Website --&gt;</span>',
            '<span class="tag">&lt;!DOCTYPE</span> <span class="attr">html</span><span class="tag">&gt;</span>',
            '<span class="tag">&lt;html</span> <span class="attr">lang</span>=<span class="str">"en"</span><span class="tag">&gt;</span>',
            '<span class="tag">&lt;head&gt;</span>',
            '<span class="indent">  </span><span class="tag">&lt;meta</span> <span class="attr">charset</span>=<span class="str">"UTF-8"</span><span class="tag">&gt;</span>',
            '<span class="indent">  </span><span class="tag">&lt;title&gt;</span>My Amazing Site<span class="tag">&lt;/title&gt;</span>',
            '<span class="indent">  </span><span class="tag">&lt;style&gt;</span>',
            '<span class="indent">    </span><span class="keyword">:root</span> { <span class="prop">--primary</span>: <span class="value">#7c3aed</span>; }',
            '<span class="indent">    </span><span class="keyword">body</span> { <span class="prop">margin</span>: <span class="value">0</span>; <span class="prop">font-family</span>: <span class="value">system-ui</span>; }',
            '<span class="indent">    </span><span class="keyword">.hero</span> { <span class="prop">min-height</span>: <span class="value">100vh</span>; <span class="prop">display</span>: <span class="value">grid</span>; }',
            '<span class="indent">    </span><span class="keyword">.hero h1</span> { <span class="prop">font-size</span>: <span class="value">clamp(3rem, 8vw, 6rem)</span>; }',
            '<span class="indent">    </span><span class="keyword">.card</span> { <span class="prop">backdrop-filter</span>: <span class="value">blur(20px)</span>; }',
            '<span class="indent">    </span><span class="keyword">.btn</span> { <span class="prop">background</span>: <span class="value">var(--primary)</span>; }',
            '<span class="indent">  </span><span class="tag">&lt;/style&gt;</span>',
            '<span class="tag">&lt;/head&gt;</span>',
            '<span class="tag">&lt;body&gt;</span>',
            '<span class="indent">  </span><span class="tag">&lt;nav</span> <span class="attr">class</span>=<span class="str">"glass-nav"</span><span class="tag">&gt;</span>',
            '<span class="indent">    </span><span class="tag">&lt;a</span> <span class="attr">href</span>=<span class="str">"#"</span><span class="tag">&gt;</span>Brand<span class="tag">&lt;/a&gt;</span>',
            '<span class="indent">  </span><span class="tag">&lt;/nav&gt;</span>',
            '<span class="indent">  </span><span class="tag">&lt;section</span> <span class="attr">class</span>=<span class="str">"hero"</span><span class="tag">&gt;</span>',
            '<span class="indent">    </span><span class="tag">&lt;h1&gt;</span>Welcome to the Future<span class="tag">&lt;/h1&gt;</span>',
            '<span class="indent">    </span><span class="tag">&lt;p&gt;</span>Built with AI in seconds<span class="tag">&lt;/p&gt;</span>',
            '<span class="indent">    </span><span class="tag">&lt;button</span> <span class="attr">class</span>=<span class="str">"btn"</span><span class="tag">&gt;</span>Get Started<span class="tag">&lt;/button&gt;</span>',
            '<span class="indent">  </span><span class="tag">&lt;/section&gt;</span>',
            '<span class="tag">&lt;/body&gt;</span>',
            '<span class="tag">&lt;/html&gt;</span>',
        ];

        let lineIndex = 0;
        let isRunning = true;

        function addLine() {
            if (!isRunning) return;

            if (lineIndex >= codeLines.length) {
                // Reset after a pause
                setTimeout(() => {
                    codeContainer.innerHTML = '';
                    lineIndex = 0;
                    addLine();
                }, 3000);
                return;
            }

            const lineEl = document.createElement('span');
            lineEl.className = 'code-line';
            lineEl.innerHTML = codeLines[lineIndex];
            codeContainer.appendChild(lineEl);

            // Auto-scroll
            const body = codeContainer.parentElement;
            body.scrollTop = body.scrollHeight;

            lineIndex++;
            setTimeout(addLine, 80 + Math.random() * 140);
        }

        setTimeout(addLine, 2000);

        // Cleanup if needed
        return () => { isRunning = false; };
    }

    // ===========================
    // 8. PROMPT INPUT BEHAVIOR
    // ===========================
    function initPromptInput() {
        const textarea = document.getElementById('prompt-input');
        const chips = document.querySelectorAll('.suggestion-chip');

        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        });

        // Suggestion chips
        chips.forEach((chip) => {
            chip.addEventListener('click', () => {
                textarea.value = chip.dataset.prompt;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
                textarea.focus();

                // Visual feedback
                gsap.fromTo(chip, { scale: 0.95 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
            });
        });

        // Keyboard shortcut: Ctrl/Cmd + Enter to generate
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('generate-btn').click();
            }
        });
    }

    // ===========================
    // 9. API KEY MANAGEMENT
    // ===========================
    function initApiConfig() {
        const toggle = document.getElementById('api-toggle');
        const config = document.getElementById('api-config');
        const input = document.getElementById('api-key-input');
        const saveBtn = document.getElementById('api-save-btn');
        const providerSelect = document.getElementById('api-provider');

        // Pre-fill if key exists
        if (state.apiKey) {
            input.value = state.apiKey;
        }
        if (state.apiProvider && providerSelect) {
            providerSelect.value = state.apiProvider;
            updatePlaceholder(state.apiProvider);
        }

        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => {
                state.apiProvider = e.target.value;
                localStorage.setItem('nexgen_api_provider', state.apiProvider);
                updatePlaceholder(state.apiProvider);
            });
        }

        function updatePlaceholder(provider) {
            const placeholders = {
                'groq': 'Enter Groq API key (console.groq.com)',
                'gemini': 'Enter Gemini API key (aistudio.google.com)',
                'claude': 'Enter Anthropic API key (console.anthropic.com)',
                'openai': 'Enter OpenAI API key (platform.openai.com)'
            };
            input.placeholder = placeholders[provider] || 'Enter API Key';
        }

        toggle.addEventListener('click', () => {
            config.classList.toggle('is-open');
        });

        saveBtn.addEventListener('click', () => {
            const key = input.value.trim();
            if (key) {
                state.apiKey = key;
                localStorage.setItem('nexgen_api_key', key);
                saveBtn.textContent = '✓ Saved';
                gsap.fromTo(saveBtn, { scale: 0.95 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
                setTimeout(() => { saveBtn.textContent = 'Save'; }, 2000);
            }
        });

        // "Start Building" nav button scrolls to prompt
        document.getElementById('nav-cta').addEventListener('click', () => {
            document.getElementById('prompt-input').focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ===========================
    // 10. PROMPT ENRICHMENT
    // ===========================
    function enrichPrompt(userPrompt) {
        // Detect if user wants dark or light theme
        const wantsDark = /dark|night|midnight|obsidian|noir|cyber|neon/i.test(userPrompt);
        const wantsLight = /light|white|clean|minimal|bright|pastel/i.test(userPrompt);
        const theme = wantsDark ? 'dark' : wantsLight ? 'light' : 'dark';

        return `Create this website: ${userPrompt}

CRITICAL DESIGN REQUIREMENTS:
- Theme: ${theme} mode with a sophisticated, curated color palette.

3D BACKGROUND (MUST INCLUDE):
- Include Three.js via CDN and create a full-screen fixed canvas behind all content.
- Populate it with 25-40 floating geometric shapes (mix of icosahedrons, octahedrons, torus, dodecahedrons) using MeshPhysicalMaterial with transparency and accent colors.
- Add mouse interaction: shapes get repelled when the cursor comes near them, then spring back to their original positions with damping.
- Each shape should slowly rotate and gently float up/down using Math.sin().
- Add 2-3 colored PointLights that slowly orbit the scene.
- Ensure the canvas has pointer-events: none so it doesn't block UI clicks.

GSAP ANIMATIONS (MUST INCLUDE):
- Include GSAP + ScrollTrigger via CDN.
- Staggered page load: nav slides down, headline reveals word-by-word, subtitle and buttons fade up in sequence.
- ScrollTrigger: feature cards and sections animate in (y:50, opacity:0 → visible) when scrolled into view with staggered delays.
- Magnetic effect on primary buttons: buttons follow cursor slightly on hover, snap back with elastic ease on leave.
- Smooth hover transitions on all cards (translateY(-6px), enhanced shadow).

OTHER REQUIREMENTS:
- Full-viewport hero section with large headline using clamp() font sizing and letter-spacing: -0.03em.
- Fixed navigation bar with backdrop-filter: blur(20px) glass effect.
- All cards must use glassmorphism: translucent background, blur backdrop, subtle border, rounded corners (16-20px).
- Gradient buttons with glow on hover.
- Include at least 6 sections: Hero, Features (3-4 cards with inline SVG icons), About/How It Works, Testimonials or stats, CTA, Footer.
- Use Google Fonts (Inter for body, Space Grotesk or DM Sans for headings).
- Make it fully responsive with mobile hamburger menu.
- Write realistic, compelling content matching the website's purpose.
- The design must look like a premium $10,000 Awwwards-winning website with 3D depth and motion.`;
    }

    // ===========================
    // 11. LLM API INTEGRATION
    // ===========================
    async function generateWebsite(prompt) {
        if (!state.apiKey) {
            const providerName = state.apiProvider.charAt(0).toUpperCase() + state.apiProvider.slice(1);
            showError(
                'API Key Required',
                `Please configure your ${providerName} API key first.`
            );
            document.getElementById('api-config').classList.add('is-open');
            return;
        }

        if (state.isGenerating) return;
        state.isGenerating = true;

        showLoading();

        const systemPrompt = `You are a world-class, Awwwards-winning frontend developer and UI designer. You produce websites that look like they cost $10,000+ to build. Generate a complete, production-ready, single-file HTML website based on the user's description.

=== OUTPUT FORMAT ===
- Output ONLY raw HTML code. No markdown, no explanations, no code fences, no backticks.
- The very first character must be < and the output must be a complete HTML document.
- Embed ALL CSS inside a <style> tag in <head>.
- Embed ALL JavaScript inside a <script> tag before </body>.
- Load Google Fonts via <link> in <head>. Always use premium fonts: Inter, Space Grotesk, DM Sans, Outfit, Sora, Poppins, or Manrope for headings; Inter, DM Sans, or Nunito for body.

=== COLOR & VISUAL IDENTITY ===
MANDATORY: Create a CSS custom property design system at the top of your styles:
:root {
  --bg: [dark or light background];
  --surface: [card/surface color];
  --text: [primary text];
  --text-muted: [secondary text];
  --accent: [primary accent];
  --accent-hover: [darker/lighter accent];
  --gradient: [linear-gradient using 2-3 harmonious colors];
  --border: [subtle border color];
  --radius: [consistent border-radius, 12px-20px];
  --shadow: [elevation shadow];
}

COLOR RULES:
- NEVER use plain red (#ff0000), blue (#0000ff), or green (#00ff00). Use curated, harmonious HSL colors.
- For dark themes: Use deep blacks (#0a0a0f to #111827), NOT pure #000000. Surface colors should be slightly lighter (e.g., rgba(255,255,255,0.04)).
- For light themes: Use warm whites (#fafafa, #f8fafc), NOT pure #ffffff for backgrounds.
- Accent colors must be vibrant but refined: #7c3aed (violet), #3b82f6 (blue), #06b6d4 (cyan), #f59e0b (amber), #10b981 (emerald), #ec4899 (pink).
- Use gradients liberally: background gradients, text gradients (background-clip: text), button gradients, border gradients.

=== TYPOGRAPHY ===
- Headings: Bold (700-800 weight), large sizes using clamp() for responsiveness.
  Example: font-size: clamp(2rem, 5vw, 4rem);
- Body: 400-500 weight, 16-18px base, line-height: 1.6-1.7.
- Use letter-spacing: -0.02em to -0.04em on large headings for a premium feel.
- Muted/secondary text should use the --text-muted color at 60% opacity.

=== LAYOUT ===
- Use CSS Grid and Flexbox exclusively. No floats.
- Max content width: 1200px, centered with margin: 0 auto.
- Section padding: Use clamp(60px, 10vh, 120px) for vertical rhythm.
- Cards: Use grid with gap: 20px-24px. Cards should have padding: 32px-40px.
- Hero sections: min-height: 100vh with centered content using display: grid; place-items: center.

=== GLASSMORPHISM & DEPTH ===
- Cards and surfaces: background: rgba(255,255,255,0.03-0.06) for dark, rgba(255,255,255,0.7-0.9) for light.
- Add backdrop-filter: blur(16px-24px) on glass elements.
- Borders: 1px solid rgba(255,255,255,0.08) for dark, rgba(0,0,0,0.06) for light.
- Box shadows: Use layered shadows for depth:
  box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1), 0 20px 40px rgba(0,0,0,0.08);

=== ANIMATIONS & INTERACTIONS ===
MANDATORY — every website must include these CSS animations:
- Smooth hover transitions on ALL interactive elements: transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
- Buttons: On hover, add translateY(-2px), increase shadow, and optionally scale(1.02).
- Cards: On hover, add translateY(-4px) and enhanced box-shadow.
- Links: Underline animation using ::after pseudo-element with width transition.
- Add a subtle @keyframes fadeInUp animation for sections:
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  Apply animation: fadeInUp 0.6s ease forwards; with staggered animation-delay on child elements.
- Navigation: Add backdrop-filter: blur(20px) and a background that becomes more opaque on scroll (use JS).

=== BUTTONS ===
- Primary buttons: Use gradient backgrounds, padding: 14px 32px, border-radius: 12px, font-weight: 600.
- Add a subtle glow on hover: box-shadow: 0 0 20px rgba(accent, 0.3);
- Icon inside buttons should use inline SVG, not emoji.

=== NAVIGATION ===
- Use a sticky/fixed nav with backdrop-filter blur.
- Logo on left, links centered or right, CTA button on right.
- Mobile: Add a hamburger menu with smooth slide-in animation.
- Nav height: 64px-72px.

=== IMAGES & MEDIA ===
- For placeholder images, use https://images.unsplash.com/photo-[id]?w=800&q=80 with real Unsplash photo IDs, or use gradient backgrounds/SVG patterns as decorative elements.
- If the design needs hero images, use a gradient overlay on top.
- Use object-fit: cover on all images.
- Add border-radius to images matching the design system.

=== SECTIONS TO INCLUDE ===
Every website should have AT MINIMUM:
1. Navigation bar (fixed, glass-style)
2. Hero section (full viewport, large headline, subtitle, CTA button)
3. Features/Services section (grid of cards with icons using inline SVG)
4. About/How It Works section
5. Testimonials or social proof section (optional but recommended)
6. CTA/Contact section
7. Footer with links and copyright

=== CONTENT ===
- Write REALISTIC, compelling content — not generic placeholder text.
- Headlines should be punchy and benefit-driven.
- Descriptions should be 1-2 sentences max.
- Use inline SVG icons (from Lucide or Heroicons style) — NOT emoji and NOT Font Awesome.

=== RESPONSIVE DESIGN ===
- Mobile-first approach.
- Use @media (min-width: 768px) and @media (min-width: 1024px) breakpoints.
- Navigation collapses to hamburger on mobile.
- Grid columns: 1 on mobile, 2 on tablet, 3-4 on desktop.
- Font sizes scale with clamp().

=== 3D BACKGROUND (THREE.JS) — MANDATORY ===
You MUST include Three.js for an interactive 3D background. Add these CDN scripts in <head>:
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

Implementation pattern to follow:
1. Create a <canvas id="bg-canvas"></canvas> as the FIRST element in <body>.
2. Style it: position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;
3. ALL content sections must have position: relative; z-index: 1; so they layer ABOVE the canvas.
4. Create a Three.js scene with:
   - A PerspectiveCamera at z=30
   - WebGLRenderer with alpha:true, antialias:true, and setClearColor(0x000000, 0)
   - 20-50 floating geometric shapes (IcosahedronGeometry, OctahedronGeometry, TorusGeometry, DodecahedronGeometry)
   - Use MeshPhysicalMaterial with transparent:true, opacity:0.3-0.6, metalness:0.3, roughness:0.4
   - Colors matching the theme accent (e.g., 0x7c3aed, 0x3b82f6, 0x06b6d4)
   - Some shapes should be wireframe:true for variety
5. Add mouse interaction:
   - Track mouse position normalized to -1 to 1
   - When mouse gets close to a shape (distance < 6), repel it: push it away with a velocity force
   - Add spring-back force so objects drift back to original positions
   - Add damping (multiply velocity by 0.96 each frame)
6. Add ambient rotation: each shape slowly rotates on all axes with random speeds (0.002-0.008 rad/frame)
7. Add gentle floating: each shape bobs up/down using Math.sin(time) with random phase offsets
8. Add 2-3 PointLights with accent colors that slowly orbit the scene
9. Handle window resize: update camera aspect ratio and renderer size

=== GSAP ANIMATIONS — MANDATORY ===
You MUST include GSAP for advanced animations. Add this CDN script in <head>:
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>

GSAP animations to implement:
1. PAGE LOAD SEQUENCE (staggered reveal):
   - Register ScrollTrigger plugin: gsap.registerPlugin(ScrollTrigger);
   - Nav bar: animate from y:-80, opacity:0 to y:0, opacity:1 over 0.8s
   - Hero headline: split into word spans, animate each from y:60, opacity:0, rotateX:-15 to y:0, opacity:1, rotateX:0 with 0.12s stagger
   - Hero subtitle: animate from y:30, opacity:0 with 0.6s delay
   - CTA buttons: animate from y:20, opacity:0, scale:0.9 with 0.8s delay
   - Use ease: "power3.out" for all entry animations

2. SCROLL-TRIGGERED ANIMATIONS (using ScrollTrigger):
   - Feature cards: gsap.from(card, { scrollTrigger: { trigger: card, start: "top 85%" }, y: 50, opacity: 0, duration: 0.7, delay: index * 0.15 })
   - Section headings: animate from y:30, opacity:0 when they enter viewport
   - Images/media: animate from scale:0.9, opacity:0
   - Stats/numbers: use a counter animation counting from 0 to the target number

3. MAGNETIC BUTTON EFFECT:
   - On mousemove over button: calculate offset from center, gsap.to(button, { x: offset.x * 0.3, y: offset.y * 0.3, duration: 0.3 })
   - On mouseleave: gsap.to(button, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" })

4. PARALLAX SECTIONS:
   - Background elements move at different speeds on scroll using ScrollTrigger
   - gsap.to(element, { scrollTrigger: { trigger: section, scrub: 1 }, y: -50 })

5. TEXT REVEAL:
   - Large headings should use a clip-path or overflow:hidden reveal effect
   - Each word animates up from below its container

=== FORBIDDEN — NEVER DO THESE ===
- NEVER use Lorem ipsum or placeholder.com images.
- NEVER use plain unstyled HTML (no default buttons, no default form styles).
- NEVER use inline styles on elements.
- NEVER output a wireframe or skeleton — the site must look FINISHED and PREMIUM.
- NEVER use Comic Sans, Times New Roman, or default serif fonts.
- NEVER forget the viewport meta tag.
- NEVER use tables for layout.
- NEVER skip hover states on interactive elements.
- NEVER forget to include Three.js and GSAP CDN scripts.
- NEVER let the 3D canvas block mouse clicks on UI elements (pointer-events: none on canvas).`;

        const loadingTexts = [
            'Analyzing your prompt...',
            'Designing the layout...',
            'Building 3D environment...',
            'Writing HTML structure...',
            'Crafting CSS styles...',
            'Programming GSAP animations...',
            'Adding Three.js interactions...',
            'Polishing the details...',
            'Almost there...',
        ];

        let textIndex = 0;
        const loadingInterval = setInterval(() => {
            textIndex = Math.min(textIndex + 1, loadingTexts.length - 1);
            const loadingText = document.getElementById('loading-text');
            if (loadingText) loadingText.textContent = loadingTexts[textIndex];

            const bar = document.getElementById('loading-bar');
            if (bar) bar.style.width = `${Math.min(15 + textIndex * 12, 85)}%`;
        }, 2000);

        try {
            let response;
            const enrichedPrompt = enrichPrompt(prompt);

            if (state.apiProvider === 'groq') {
                response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: enrichedPrompt },
                        ],
                        temperature: 0.7,
                        max_tokens: 8000,
                        stream: false,
                    }),
                });
            } else if (state.apiProvider === 'gemini') {
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${state.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{text: enrichedPrompt}]
                        }],
                        systemInstruction: {
                            parts: [{text: systemPrompt}]
                        },
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 8192
                        }
                    }),
                });
            } else if (state.apiProvider === 'claude') {
                response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': state.apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: 'claude-3-5-sonnet-20240620',
                        system: systemPrompt,
                        messages: [
                            { role: 'user', content: enrichedPrompt }
                        ],
                        max_tokens: 8192,
                        temperature: 0.7
                    })
                });
            } else if (state.apiProvider === 'openai') {
                response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: enrichedPrompt },
                        ],
                        temperature: 0.7,
                        max_tokens: 4096,
                    }),
                });
            }

            clearInterval(loadingInterval);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || errorData.message || `API returned status ${response.status}`;

                if (response.status === 401 || response.status === 403) {
                    throw new Error('Invalid API key. Please check your key and try again.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                } else {
                    throw new Error(errorMsg);
                }
            }

            const data = await response.json();
            let generatedHtml = '';

            if (state.apiProvider === 'gemini') {
                generatedHtml = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else if (state.apiProvider === 'claude') {
                generatedHtml = data.content?.[0]?.text || '';
            } else {
                generatedHtml = data.choices?.[0]?.message?.content || '';
            }

            // Clean up any markdown code fences or preamble the AI might include
            generatedHtml = generatedHtml
                .replace(/^[\s\S]*?(<!DOCTYPE)/i, '$1')  // Remove anything before <!DOCTYPE
                .replace(/```\s*$/gi, '')                  // Remove trailing code fences
                .replace(/^```html?\s*/gi, '')             // Remove leading code fences
                .trim();
            
            // If it still doesn't start with <, try to find the first < 
            if (!generatedHtml.startsWith('<')) {
                const firstTag = generatedHtml.indexOf('<');
                if (firstTag > 0) {
                    generatedHtml = generatedHtml.substring(firstTag);
                }
            }

            if (!generatedHtml.includes('<') || !generatedHtml.includes('>')) {
                throw new Error('The AI did not generate valid HTML. Please try a different prompt.');
            }

            state.generatedCode = generatedHtml;
            showOutput(generatedHtml);

        } catch (error) {
            clearInterval(loadingInterval);
            console.error('Generation error:', error);
            showError('Generation Failed', error.message || 'An unexpected error occurred. Please try again.');
        } finally {
            state.isGenerating = false;
        }
    }

    // ===========================
    // 11. OUTPUT MANAGEMENT
    // ===========================
    function showLoading() {
        document.getElementById('output-placeholder').style.display = 'none';
        document.getElementById('output-frame-wrapper').style.display = 'none';
        document.getElementById('output-error').style.display = 'none';
        document.getElementById('code-view-panel').style.display = 'none';
        document.getElementById('output-loading').style.display = 'flex';
        document.getElementById('loading-bar').style.width = '5%';
        document.getElementById('loading-text').textContent = 'Analyzing your prompt...';

        // Scroll to output
        document.getElementById('generator').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showOutput(html) {
        document.getElementById('output-loading').style.display = 'none';
        document.getElementById('output-error').style.display = 'none';
        document.getElementById('output-placeholder').style.display = 'none';

        const frameWrapper = document.getElementById('output-frame-wrapper');
        frameWrapper.style.display = 'block';

        const iframe = document.getElementById('output-iframe');
        // Use srcdoc for sandboxed rendering
        iframe.srcdoc = html;

        // Animate in
        gsap.fromTo(frameWrapper,
            { opacity: 0, y: 20, scale: 0.98 },
            { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' }
        );
    }

    function showError(title, message) {
        document.getElementById('output-loading').style.display = 'none';
        document.getElementById('output-frame-wrapper').style.display = 'none';
        document.getElementById('output-placeholder').style.display = 'none';

        document.getElementById('error-title').textContent = title;
        document.getElementById('error-msg').textContent = message;
        document.getElementById('output-error').style.display = 'flex';

        document.getElementById('generator').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ===========================
    // 12. OUTPUT ACTIONS
    // ===========================
    function initOutputActions() {
        // Generate button
        document.getElementById('generate-btn').addEventListener('click', () => {
            const prompt = document.getElementById('prompt-input').value.trim();
            if (!prompt) {
                // Shake the input
                gsap.to('#prompt-box', {
                    x: [-8, 8, -6, 6, -3, 3, 0],
                    duration: 0.5,
                    ease: 'power2.out',
                });
                return;
            }
            generateWebsite(prompt);
        });

        // Retry button
        document.getElementById('retry-btn').addEventListener('click', () => {
            const prompt = document.getElementById('prompt-input').value.trim();
            if (prompt) generateWebsite(prompt);
        });

        // Download button
        document.getElementById('download-btn').addEventListener('click', () => {
            if (!state.generatedCode) return;
            const blob = new Blob([state.generatedCode], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'generated-website.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        // Fullscreen button
        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            const iframe = document.getElementById('output-iframe');
            if (iframe.requestFullscreen) {
                iframe.requestFullscreen();
            } else if (iframe.webkitRequestFullscreen) {
                iframe.webkitRequestFullscreen();
            }
        });

        // Code view toggle
        document.getElementById('code-view-btn').addEventListener('click', () => {
            const panel = document.getElementById('code-view-panel');
            if (!state.generatedCode) return;
            document.getElementById('code-view-content').textContent = state.generatedCode;
            panel.style.display = 'flex';
            gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        });

        document.getElementById('close-code-view').addEventListener('click', () => {
            document.getElementById('code-view-panel').style.display = 'none';
        });
    }

    // ===========================
    // 13. SMOOTH SCROLL NAV
    // ===========================
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ===========================
    // 14. INITIALIZE EVERYTHING
    // ===========================
    function init() {
        initMouseTracking();
        initThreeScene();
        initAnimations();
        initMagneticButtons();
        initSimulatorTilt();
        initCodeSimulator();
        initPromptInput();
        initApiConfig();
        initOutputActions();
        initSmoothScroll();
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
