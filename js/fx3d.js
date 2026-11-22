/* Capa WebGL (Three.js): campo de partículas ardientes que reacciona a la velocidad de scroll.
   Solo se carga en escritorio con puntero fino, sin prefers-reduced-motion y con CPU suficiente. */

export function canRunFX() {
  if (typeof matchMedia !== 'function') return false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (!matchMedia('(min-width: 900px) and (pointer: fine)').matches) return false;
  if ((navigator.hardwareConcurrency || 4) < 4) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export async function initFX(canvas, { getVelocity = () => 0 } = {}) {
  const THREE = await import('three');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 50);
  camera.position.z = 6;

  // sprite redondo y suave generado en canvas (sin imágenes externas)
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const sctx = sprite.getContext('2d');
  const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(sprite);

  const N = 700;
  const BOX = { x: 14, y: 8, z: 6 };
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const spd = new Float32Array(N);
  const palette = [new THREE.Color('#FF2D1F'), new THREE.Color('#FF8A00'), new THREE.Color('#FFC21A')];

  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * BOX.x * 2;
    pos[i * 3 + 1] = (Math.random() - 0.5) * BOX.y * 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z * 2;
    spd[i] = 0.2 + Math.random() * 0.9;
    const c = palette[Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.09, map: tex, vertexColors: true, transparent: true, opacity: 0.8,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let running = true;
  let last = performance.now();
  let boost = 0;
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    boost += (Math.min(Math.abs(getVelocity()) / 40, 3) - boost) * 0.08;
    const k = 1 + boost * 2.2;

    const p = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      p[ix] -= dt * spd[i] * 1.1 * k;          // deriva hacia la izquierda (velocidad)
      p[ix + 1] += dt * spd[i] * 0.25 * k;      // y ligeramente hacia arriba
      if (p[ix] < -BOX.x) { p[ix] = BOX.x; p[ix + 1] = (Math.random() - 0.5) * BOX.y * 2; }
      if (p[ix + 1] > BOX.y) p[ix + 1] = -BOX.y;
    }
    geo.attributes.position.needsUpdate = true;

    points.rotation.y += (mouse.x * 0.12 - points.rotation.y) * 0.03;
    points.rotation.x += (mouse.y * 0.06 - points.rotation.x) * 0.03;
    mat.opacity = 0.55 + Math.min(boost, 1) * 0.35;
    mat.size = 0.08 + Math.min(boost, 1.5) * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return () => {
    running = false;
    window.removeEventListener('resize', resize);
    geo.dispose(); mat.dispose(); tex.dispose(); renderer.dispose();
  };
}
