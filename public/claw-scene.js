import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const wrap = document.querySelector('.canvas-wrap');
const canvas = document.querySelector('#scene3d');
const status = document.querySelector('#status');

try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#170f1a');
  scene.fog = new THREE.Fog('#170f1a', 16, 30);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 2.05, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 6.4;
  controls.maxDistance = 13;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.64;
  controls.addEventListener('start', () => { cameraTween = null; });

  scene.add(new THREE.HemisphereLight('#fff0d8', '#604953', 3.0));
  const keyLight = new THREE.DirectionalLight('#fff2df', 3.5);
  keyLight.position.set(-4.5, 8.5, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -6;
  keyLight.shadow.bias = -0.0002;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight('#e0bfff', 1.8);
  fillLight.position.set(5, 4, -4);
  scene.add(fillLight);

  const machine = new THREE.Group();
  scene.add(machine);
  const standard = (color, metalness = 0, roughness = 0.5, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#c4b7c5', metalness: 0.9, roughness: 0.2, clearcoat: 0.75 });
  const darkMetal = standard('#342738', 0.8, 0.28);
  const plum = standard('#704453', 0.28, 0.38);
  const gold = new THREE.MeshPhysicalMaterial({ color: '#d49a50', metalness: 0.82, roughness: 0.24, clearcoat: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#c3a8ce', metalness: 0.05, roughness: 0.08, transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide, clearcoat: 0.9 });
  const emit = (color, intensity = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, metalness: 0.15, roughness: 0.24 });

  function block(parent, size, position, material, name = '') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  }
  function roundBar(parent, start, end, radius, material, radial = 10) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), radial), material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Powder-coated cabinet, real glass panels, steel rails and lit inner edges.
  block(machine, [5.7, 0.24, 4.35], [0, -0.02, 0], darkMetal, 'cabinet base');
  block(machine, [5.35, 0.13, 4.0], [0, 0.15, 0], standard('#715866', 0.35, 0.4), 'play floor');
  block(machine, [5.7, 0.16, 4.35], [0, 4.53, 0], darkMetal, 'top crown');
  block(machine, [5.35, 4.25, 0.12], [0, 2.27, -2.03], plum, 'back wall');
  for (const x of [-2.7, 2.7]) {
    block(machine, [0.14, 4.25, 4.12], [x, 2.27, 0], chrome, 'corner upright');
    block(machine, [0.018, 3.82, 0.045], [x * 0.985, 2.3, 0], emit(x < 0 ? '#ffa54a' : '#ca71e8', 1.25), 'cabinet light');
  }
  const chamberLight = new THREE.PointLight('#ffe0b8', 78, 12, 2);
  chamberLight.position.set(0, 3.75, 0.1);
  machine.add(chamberLight);
  const warmFill = new THREE.PointLight('#ff9f5d', 26, 8, 2);
  warmFill.position.set(-2.0, 2.9, 1.0);
  machine.add(warmFill);
  const roseFill = new THREE.PointLight('#d08aff', 22, 8, 2);
  roseFill.position.set(2.0, 2.7, -0.7);
  machine.add(roseFill);
  for (const y of [0.24, 4.36]) {
    block(machine, [5.42, 0.1, 0.1], [0, y, 2.06], chrome, 'front glass rail');
    block(machine, [5.42, 0.1, 0.1], [0, y, -2.06], chrome, 'back glass rail');
  }
  for (const z of [-2.04, 2.04]) block(machine, [0.1, 0.1, 4.08], [-2.67, 4.31, z], chrome, 'upper side rail');
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(5.28, 4.04, 0.025), glass);
  frontGlass.position.set(0, 2.31, 1.99);
  machine.add(frontGlass);
  for (const x of [-2.64, 2.64]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.025, 4.03, 4.02), glass);
    side.position.set(x, 2.3, 0);
    machine.add(side);
  }
  // Glass reflections make the transparent walls legible without obscuring prizes.
  const reflection = new THREE.MeshBasicMaterial({ color: '#f6c890', transparent: true, opacity: 0.22 });
  for (const x of [-2.58, 2.58]) block(machine, [0.022, 3.7, 0.028], [x, 2.34, 1.96], reflection, 'glass reflection');
  block(machine, [5.38, 0.26, 0.2], [0, 0.18, 2.09], plum, 'front control fascia');
  block(machine, [1.18, 0.045, 0.72], [-2.03, 0.34, 1.72], standard('#201722', 0.5, 0.28), 'prize chute');
  block(machine, [1.02, 0.055, 0.58], [-2.03, 0.38, 1.68], emit('#f5ae4d', 0.55), 'prize chute lip');

  // X/Z overhead gantry: trolley, cable and articulated three-prong metal claw.
  block(machine, [5.05, 0.1, 0.12], [0, 4.22, -1.83], chrome, 'gantry x rail');
  block(machine, [0.12, 0.1, 3.85], [0, 4.22, 0], chrome, 'gantry z rail');
  const trolley = new THREE.Group();
  machine.add(trolley);
  block(trolley, [0.55, 0.2, 0.46], [0, 4.08, 0], darkMetal, 'motor trolley');
  block(trolley, [0.27, 0.13, 0.27], [0, 4.22, 0], gold, 'trolley bearing');
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 10), chrome);
  trolley.add(cable);
  const clawHead = new THREE.Group();
  trolley.add(clawHead);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.26, 0.4, 24), chrome);
  motor.position.y = -0.2;
  motor.castShadow = true;
  clawHead.add(motor);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.12, 24), gold);
  collar.position.y = -0.08;
  clawHead.add(collar);
  const armRoot = new THREE.Group();
  armRoot.position.y = -0.42;
  clawHead.add(armRoot);
  const armMaterial = new THREE.MeshPhysicalMaterial({ color: '#e4d4c3', metalness: 0.92, roughness: 0.17, clearcoat: 1, clearcoatRoughness: 0.1 });
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.07, 0.16, 0), new THREE.Vector3(0.2, -0.02, 0), new THREE.Vector3(0.39, -0.32, 0),
    new THREE.Vector3(0.42, -0.59, 0), new THREE.Vector3(0.26, -0.83, 0), new THREE.Vector3(0.12, -0.91, 0)
  ]);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = i * Math.PI * 2 / 3;
    const tine = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 24, 0.043, 10, false), armMaterial);
    tine.castShadow = true;
    arm.add(tine);
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), chrome);
    hinge.position.set(0.2, -0.02, 0);
    arm.add(hinge);
    armRoot.add(arm);
  }

  function makeTicket() {
    const group = new THREE.Group();
    const paper = new THREE.MeshPhysicalMaterial({ color: '#f4c969', metalness: 0.2, roughness: 0.32, clearcoat: 0.45 });
    const card = block(group, [0.66, 0.42, 0.045], [0, 0, 0], paper, 'season ticket');
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(card.geometry), new THREE.LineBasicMaterial({ color: '#fff0b7' }));
    card.add(border);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.085, 0.012), standard('#9c622b', 0.25, 0.5));
    tag.position.set(0, 0.04, 0.03);
    group.add(tag);
    group.userData.kind = 'ticket';
    return group;
  }

  const plushColors = ['#d5a76f', '#f1dfc1', '#a8b79d', '#bba4cd', '#c78265', '#d9c59f'];
  const furTexture = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#d5d0c8'; g.fillRect(0, 0, 96, 96);
    let seed = 29;
    for (let i = 0; i < 1400; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const v = 170 + seed % 65;
      g.fillStyle = `rgba(${v},${v},${v},${0.07 + (seed % 12) / 100})`;
      g.fillRect(seed % 96, (seed >>> 8) % 96, 1, 1);
    }
    const texture = new THREE.CanvasTexture(c);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  })();
  const unitSphere = new THREE.SphereGeometry(1, 22, 16);
  function sphere(parent, position, scale, material, name = '') {
    const mesh = new THREE.Mesh(unitSphere, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  }
  function makePlush(toy, index) {
    const group = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: plushColors[index % plushColors.length], roughness: 0.9, map: furTexture, bumpMap: furTexture, bumpScale: 0.016 });
    const cream = standard('#f5e6ce', 0, 0.91);
    const dark = standard('#302832', 0.12, 0.32);
    const pink = standard('#d58d86', 0, 0.72);
    sphere(group, [0, 0.39, 0], [0.35, 0.42, 0.29], fur, 'plush body');
    sphere(group, [0, 0.91, 0.015], [0.37, 0.35, 0.32], fur, 'plush head');
    sphere(group, [0, 0.39, 0.252], [0.22, 0.25, 0.07], cream, 'belly patch');
    for (const side of [-1, 1]) {
      sphere(group, [side * 0.28, 0.43, 0.02], [0.15, 0.13, 0.18], fur, 'paw');
      sphere(group, [side * 0.26, 0.14, 0.12], [0.19, 0.13, 0.23], fur, 'foot');
      if (toy.cat) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.27, 3), fur);
        ear.position.set(side * 0.23, 1.2, 0.02);
        ear.rotation.z = side * -0.1;
        ear.castShadow = true;
        group.add(ear);
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.14, 3), pink);
        inner.position.set(side * 0.23, 1.205, 0.105);
        group.add(inner);
      } else {
        sphere(group, [side * 0.27, 1.15, 0.01], [0.17, 0.19, 0.16], fur, 'round ear');
        sphere(group, [side * 0.27, 1.15, 0.143], [0.09, 0.105, 0.035], standard('#c68e72', 0, 0.85), 'ear inset');
      }
      sphere(group, [side * 0.135, 0.99, 0.292], [0.043, 0.055, 0.034], dark, 'eye');
      sphere(group, [side * 0.195, 0.78, 0.25], [0.13, 0.105, 0.08], cream, 'muzzle');
      sphere(group, [side * 0.31, 0.72, 0.1], [0.075, 0.046, 0.035], pink, 'blush');
    }
    sphere(group, [0, 0.82, 0.326], [0.052, 0.04, 0.035], dark, 'nose');
    roundBar(group, [-0.14, 0.63, 0.29], [0.14, 0.63, 0.29], 0.012, dark, 6);
    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 7, 28), gold);
    ribbon.position.set(0, 0.65, 0.24);
    group.add(ribbon);
    return group;
  }
  function makeCapsule(toy, index) {
    const group = new THREE.Group();
    const colors = ['#8b63ad', '#eca451', '#a9b98e', '#d98f86', '#87a9c1'];
    const shell = new THREE.MeshPhysicalMaterial({ color: colors[index % colors.length], metalness: 0.1, roughness: 0.2, transparent: true, opacity: 0.78, transmission: 0.12, clearcoat: 0.85 });
    sphere(group, [0, 0.36, 0], [0.34, 0.35, 0.34], shell, 'capsule shell');
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.329, 0.018, 7, 32), chrome);
    seam.position.y = 0.36;
    seam.rotation.x = Math.PI / 2;
    group.add(seam);
    sphere(group, [0, 0.34, 0.025], [0.12, 0.12, 0.12], standard(index % 2 ? '#f5cf7b' : '#eee3d0', 0.18, 0.35), 'capsule prize');
    return group;
  }
  const prizeRoot = new THREE.Group();
  machine.add(prizeRoot);
  let prizeMeshes = [];
  let prizeMode = '';
  function syncPrizes(toys, mode) {
    if (prizeMode === mode && prizeMeshes.length === toys.length) return;
    for (const object of prizeMeshes) prizeRoot.remove(object);
    prizeMeshes = toys.map((toy, i) => {
      const object = mode === 'balls' ? makeCapsule(toy, i) : (toy.gold ? makeTicket() : makePlush(toy, i));
      object.userData.index = i;
      object.scale.setScalar(mode === 'balls' ? 0.82 + toy.size * 0.12 : 0.72 + toy.size * 0.12);
      object.rotation.y = toy.rotation || (i * 1.7);
      prizeRoot.add(object);
      return object;
    });
    prizeMode = mode;
  }

  const targetRing = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.018, 8, 56), emit('#ffd475', 1.8));
  targetRing.rotation.x = Math.PI / 2;
  targetRing.position.y = 1.28;
  targetRing.material.depthTest = false;
  targetRing.renderOrder = 10;
  machine.add(targetRing);
  const targetCore = new THREE.Mesh(new THREE.CircleGeometry(0.41, 48), new THREE.MeshBasicMaterial({ color: '#ffc95f', transparent: true, opacity: 0.085, side: THREE.DoubleSide }));
  targetCore.rotation.x = -Math.PI / 2;
  targetCore.position.y = 1.27;
  targetCore.material.depthTest = false;
  targetCore.renderOrder = 9;
  machine.add(targetCore);

  const chuteLight = new THREE.PointLight('#ffb553', 8, 2.5);
  chuteLight.position.set(-2.03, 0.62, 1.62);
  machine.add(chuteLight);

  const initialDistance = wrap.clientWidth / Math.max(1, wrap.clientHeight) < 1.15 ? 10.7 : 8.7;
  camera.position.set(0.25, 3.65, initialDistance);
  controls.update();

  function resize() {
    const width = Math.max(1, wrap.clientWidth), height = Math.max(1, wrap.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.setLength(width / height < 1.15 ? 10.7 : 8.7);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  function smooth(t) { return t * t * (3 - 2 * t); }
  const preset = {
    front: [0, 3.65, 8.7], left: [-8.7, 3.4, 0.2], right: [8.7, 3.4, 0.2],
    top: [0, 10.2, 0.08], bottom: [0, 0.55, 8.7]
  };
  let cameraTween = null;
  function setView(name) {
    const p = preset[name];
    if (!p) return;
    const desired = new THREE.Vector3(...p);
    if (wrap.clientWidth / Math.max(1, wrap.clientHeight) < 1.15 && name !== 'top' && name !== 'bottom') desired.setLength(10.7);
    cameraTween = { from: camera.position.clone(), to: desired, start: performance.now(), duration: 700 };
    controls.target.set(0, 2.05, 0);
  }
  function update(state) {
    syncPrizes(state.toys, state.mode);
    const targetX = state.position.x * 1.65;
    const targetZ = state.position.z * 1.5;
    targetRing.position.x = targetX;
    targetRing.position.z = targetZ;
    targetCore.position.x = targetX;
    targetCore.position.z = targetZ;
    const pulse = 1 + Math.sin(state.now * 0.005) * 0.045;
    targetRing.scale.setScalar(pulse);
    state.toys.forEach((toy, i) => {
      const object = prizeMeshes[i];
      const floorY = 0.25 + Math.max(0, toy.y - 0.56) * 1.15;
      object.position.set(toy.x * 1.65, floorY, toy.z * 1.5);
      object.rotation.y = (toy.rotation || 0) + (i % 3 - 1) * 0.06;
      object.visible = true;
      if (state.anim && state.anim.aligned && state.anim.index === i && state.anim.award) {
        const elapsed = (state.now - state.anim.started) / 1000;
        if (elapsed > 1.8 && elapsed < 4.92) {
          const grabX = state.cx * 1.65, grabZ = state.cz * 1.5;
          if (elapsed < 4.4) object.position.set(grabX, Math.max(0.6, state.cy * 0.95 + 0.55), grabZ);
          else {
            const t = smooth(Math.min(1, (elapsed - 4.4) / 0.52));
            object.position.set(THREE.MathUtils.lerp(grabX, -2.03, t), THREE.MathUtils.lerp(state.cy * 0.95 + 0.55, 0.48, t), THREE.MathUtils.lerp(grabZ, 1.62, t));
          }
        } else if (elapsed >= 4.92) object.visible = false;
      }
    });
    trolley.position.x = targetX;
  trolley.position.z = targetZ;
    const clawY = Math.max(1.18, state.cy * 0.96 + 0.68);
    clawHead.position.set(0, clawY, 0);
    const cableLength = Math.max(0.08, 4.0 - clawY);
    cable.scale.y = cableLength;
    cable.position.set(0, (4.0 + clawY) / 2, 0);
    const spread = 1 - Math.max(0, Math.min(1, state.grip)) * 0.42;
    armRoot.scale.set(spread, 1, spread);
    if (cameraTween) {
      const t = Math.min(1, (performance.now() - cameraTween.start) / cameraTween.duration);
      camera.position.lerpVectors(cameraTween.from, cameraTween.to, smooth(t));
      if (t >= 1) cameraTween = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }

  // Renderer animation follows the game's existing state; no separate chance or wallet logic is introduced.
  let lastState = null;
  function frame() {
    if (lastState) update(lastState);
    requestAnimationFrame(frame);
  }
  window.clawMachine3D = {
    ready: true,
    setView,
    getCameraPosition() { return camera.position.toArray(); },
    getAngle() { return Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z); },
    update(state) { lastState = state; }
  };
  wrap.classList.add('webgl-ready');
  window.addEventListener('pagehide', () => { controls.dispose(); renderer.dispose(); }, { once: true });
  requestAnimationFrame(frame);
} catch (error) {
  console.error('3D claw renderer could not start', error);
  if (status) status.textContent = '此瀏覽器未啟用 WebGL，請更新瀏覽器後再試。';
}
