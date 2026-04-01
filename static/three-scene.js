/**
 * three-scene.js — Lightweight Three.js scenes for Study Behavior Analyzer
 * Gracefully degrades if WebGL is unavailable.
 */

(function () {
  "use strict";

  /* ── WebGL capability check ─────────────────────────────────────── */
  function isWebGLAvailable() {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (_) {
      return false;
    }
  }

  /* ── Hero Particle Sphere ──────────────────────────────────────── */
  // function initHeroSphere(canvasId) {
  //   const canvas = document.getElementById(canvasId);
  //   if (!canvas) return;

  //   if (!isWebGLAvailable() || !window.THREE) {
  //     canvas.style.display = "none";
  //     const fallback = canvas.parentElement?.querySelector(".orbit-fallback");
  //     if (fallback) fallback.style.display = "flex";
  //     return;
  //   }

  //   const THREE = window.THREE;
  //   const W = canvas.clientWidth || 600;
  //   const H = canvas.clientHeight || 600;

  //   const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  //   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  //   renderer.setSize(W, H);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    camera.position.z = 1.9;

    /* Particles on sphere surface */
    const COUNT = 1800;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    const cyan = new THREE.Color("#6fe7ff");
    const emerald = new THREE.Color("#61f2c7");
    const blue = new THREE.Color("#4ca5ff");
    const palette = [cyan, emerald, blue];

    for (let i = 0; i < COUNT; i++) {
      /* Fibonacci sphere distribution */
      const golden = Math.PI * (3 - Math.sqrt(5));
      const y = 1 - (i / (COUNT - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;

      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      sizeAttenuation: true,
    });

    const sphere = new THREE.Points(geometry, material);
    scene.add(sphere);

    /* Inner glow core */
    const coreGeo = new THREE.SphereGeometry(0.28, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: "#6fe7ff",
      transparent: true,
      opacity: 0.06,
    });
    scene.add(new THREE.Mesh(coreGeo, coreMat));

    /* Equatorial ring */
    const ringGeo = new THREE.TorusGeometry(1.08, 0.004, 2, 120);
    const ringMat = new THREE.MeshBasicMaterial({ color: "#6fe7ff", transparent: true, opacity: 0.28 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.2;
    scene.add(ring);

    /* Outer ring */
    const ring2Geo = new THREE.TorusGeometry(1.28, 0.003, 2, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: "#61f2c7", transparent: true, opacity: 0.16 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2.8;
    ring2.rotation.y = 0.4;
    scene.add(ring2);

    /* Mouse parallax */
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.6;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    /* Resize */
    const onResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize, { passive: true });

    /* Animation loop */
    let frame;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function animate() {
      frame = requestAnimationFrame(animate);
      if (!prefersReduced) {
        sphere.rotation.y += 0.0018;
        sphere.rotation.x += 0.0004;
        ring.rotation.z += 0.003;
        ring2.rotation.z -= 0.002;
        sphere.rotation.y += (mouseX - sphere.rotation.y) * 0.04;
        sphere.rotation.x += (mouseY * 0.5 - sphere.rotation.x) * 0.04;
      }
      renderer.render(scene, camera);
    }
    animate();

    /* Cleanup on page hide */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        animate();
      }
    });
  }

  /* ── Data node network for How It Works ────────────────────────── */
  function initNodeNetwork(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !isWebGLAvailable() || !window.THREE) return;

    const THREE = window.THREE;
    const W = canvas.clientWidth || 900;
    const H = canvas.clientHeight || 300;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.z = 5;

    const NODE_COUNT = 40;
    const nodes = [];
    const velocities = [];

    const pointsPositions = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 3;
      const z = (Math.random() - 0.5) * 2;
      nodes.push({ x, y, z });
      velocities.push({
        x: (Math.random() - 0.5) * 0.006,
        y: (Math.random() - 0.5) * 0.004,
        z: 0,
      });
      pointsPositions[i * 3] = x;
      pointsPositions[i * 3 + 1] = y;
      pointsPositions[i * 3 + 2] = z;
    }

    const pointsGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pointsPositions, 3);
    pointsGeo.setAttribute("position", posAttr);
    const pointsMat = new THREE.PointsMaterial({ color: "#6fe7ff", size: 0.08, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Points(pointsGeo, pointsMat));

    /* Lines between close nodes */
    const linePositions = new Float32Array(NODE_COUNT * NODE_COUNT * 6);
    const lineGeo = new THREE.BufferGeometry();
    const linePosAttr = new THREE.BufferAttribute(linePositions, 3);
    lineGeo.setAttribute("position", linePosAttr);
    const lineMat = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: "#4ca5ff", transparent: true, opacity: 0.18 }));
    scene.add(lineMat);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      renderer.render(scene, camera);
      return;
    }

    function animate() {
      requestAnimationFrame(animate);

      let lineIdx = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes[i].x += velocities[i].x;
        nodes[i].y += velocities[i].y;
        if (Math.abs(nodes[i].x) > 4.2) velocities[i].x *= -1;
        if (Math.abs(nodes[i].y) > 1.8) velocities[i].y *= -1;
        posAttr.array[i * 3] = nodes[i].x;
        posAttr.array[i * 3 + 1] = nodes[i].y;
        posAttr.array[i * 3 + 2] = nodes[i].z;

        for (let j = i + 1; j < NODE_COUNT; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 2.2) {
            linePosAttr.array[lineIdx++] = nodes[i].x;
            linePosAttr.array[lineIdx++] = nodes[i].y;
            linePosAttr.array[lineIdx++] = nodes[i].z;
            linePosAttr.array[lineIdx++] = nodes[j].x;
            linePosAttr.array[lineIdx++] = nodes[j].y;
            linePosAttr.array[lineIdx++] = nodes[j].z;
          }
        }
      }

      posAttr.needsUpdate = true;
      linePosAttr.needsUpdate = true;
      lineGeo.setDrawRange(0, lineIdx / 3);

      renderer.render(scene, camera);
    }
    animate();
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  window.SBAScene = { initHeroSphere, initNodeNetwork };
})();
