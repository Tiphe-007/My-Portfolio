import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const themeButton = document.querySelector('#theme-toggle');
const savedTheme = localStorage.getItem('portfolio-theme');

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.querySelector('.theme-icon').textContent = theme === 'dark' ? '☾' : '☼';
  themeButton.querySelector('.theme-label').textContent = theme === 'dark' ? 'Dark' : 'Light';
  themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0b1230' : '#f6f9ff';
}

setTheme(savedTheme === 'dark' ? 'dark' : 'light');
themeButton.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('portfolio-theme', nextTheme);
  setTheme(nextTheme);
});

const pointerAmbient = document.querySelector('.ambient');
let pointerFrame = 0;
window.addEventListener('pointermove', (event) => {
  if (reducedMotion || event.pointerType === 'touch') return;
  cancelAnimationFrame(pointerFrame);
  pointerFrame = requestAnimationFrame(() => {
    const offsetX = (event.clientX / window.innerWidth - 0.5) * 22;
    const offsetY = (event.clientY / window.innerHeight - 0.5) * 22;
    pointerAmbient.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
  });
}, { passive: true });

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const canvasHost = document.querySelector('#lab-scene');
const previewHost = document.querySelector('#scene-canvas');
const timeline = document.querySelector('#timeline');
const frameReadout = document.querySelector('#frame-readout');
const timeReadout = document.querySelector('#time-readout');
const coordinateReadout = document.querySelector('#coordinate-readout');
const playButton = document.querySelector('#play-toggle');
const onionToggle = document.querySelector('#onion-toggle');
const contourToggle = document.querySelector('#contour-toggle');
const frameCount = 60;
let currentFrame = Number(timeline.value);
let isPlaying = !reducedMotion;
let lastTick = 0;
let animationFrameId = 0;
const visibleLayers = { path: true, ghost: true, form: true };

const previewScene = new THREE.Scene();
const previewCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
previewCamera.position.set(0, 0.25, 5.6);
const previewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
previewRenderer.toneMappingExposure = 1.15;
previewHost.appendChild(previewRenderer.domElement);

previewScene.add(new THREE.HemisphereLight(0xffffff, 0x929dc7, 2.4));
const previewKey = new THREE.DirectionalLight(0xffffff, 3.5);
previewKey.position.set(-3, 4, 5);
previewScene.add(previewKey);
const previewRim = new THREE.PointLight(0xff8cbd, 35, 9, 2);
previewRim.position.set(2, 1, -2);
previewScene.add(previewRim);

const previewRoot = new THREE.Group();
previewScene.add(previewRoot);
const previewGeometry = new THREE.IcosahedronGeometry(0.86, 3);
const previewForm = new THREE.Mesh(previewGeometry, new THREE.MeshPhysicalMaterial({ color: 0xffd23f, roughness: 0.2, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.15 }));
previewRoot.add(previewForm);
const previewWire = new THREE.Mesh(previewGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 }));
previewWire.scale.setScalar(1.008);
previewForm.add(previewWire);
const previewGhostGeometry = new THREE.IcosahedronGeometry(0.62, 2);
const previewGhosts = [
  new THREE.Mesh(previewGhostGeometry, new THREE.MeshPhysicalMaterial({ color: 0x486aff, transparent: true, opacity: 0.23, depthWrite: false })),
  new THREE.Mesh(previewGhostGeometry, new THREE.MeshPhysicalMaterial({ color: 0xff78bd, transparent: true, opacity: 0.23, depthWrite: false }))
];
previewGhosts[0].position.set(-1.28, -0.28, -0.25);
previewGhosts[1].position.set(1.28, 0.28, -0.25);
previewRoot.add(...previewGhosts);
const previewOrbit = new THREE.Mesh(
  new THREE.TorusGeometry(1.46, 0.008, 5, 120),
  new THREE.MeshBasicMaterial({ color: 0x7488e6, transparent: true, opacity: 0.48 })
);
previewOrbit.rotation.set(0.9, 0.2, -0.24);
previewRoot.add(previewOrbit);
const previewControls = new OrbitControls(previewCamera, previewRenderer.domElement);
previewControls.enableDamping = true;
previewControls.dampingFactor = 0.07;
previewControls.enablePan = false;
previewControls.minDistance = 4.7;
previewControls.maxDistance = 7;
previewControls.minPolarAngle = Math.PI * 0.2;
previewControls.maxPolarAngle = Math.PI * 0.8;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6f9ff);
scene.fog = new THREE.Fog(0xf6f9ff, 8, 18);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
camera.position.set(0, 1.35, 9.2);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
canvasHost.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 12;
controls.minPolarAngle = Math.PI * 0.2;
controls.maxPolarAngle = Math.PI * 0.8;

scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa9d5, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
keyLight.position.set(-3, 5, 6);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0xffa3d1, 65, 13, 2);
rimLight.position.set(4, -1, -2);
scene.add(rimLight);

const motionRoot = new THREE.Group();
scene.add(motionRoot);

const pathCurve = new THREE.EllipseCurve(0, 0, 2.05, 1.23, Math.PI * 0.08, Math.PI * 1.9, false, 0);
const pathPoints = pathCurve.getPoints(100).map((point) => new THREE.Vector3(point.x, point.y, -0.12));
const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
const pathMaterial = new THREE.LineDashedMaterial({ color: 0x8999d4, dashSize: 0.09, gapSize: 0.075, transparent: true, opacity: 0.62 });
const motionPath = new THREE.Line(pathGeometry, pathMaterial);
motionPath.computeLineDistances();
motionRoot.add(motionPath);

const coreGeometry = new THREE.IcosahedronGeometry(0.82, 3);
const coreMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffd23f,
  roughness: 0.23,
  metalness: 0.05,
  clearcoat: 0.95,
  clearcoatRoughness: 0.18,
  emissive: 0x493100,
  emissiveIntensity: 0.13
});
const core = new THREE.Mesh(coreGeometry, coreMaterial);
motionRoot.add(core);

const coreWire = new THREE.Mesh(coreGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.34 }));
coreWire.scale.setScalar(1.008);
core.add(coreWire);

const ghostGeometry = new THREE.IcosahedronGeometry(0.68, 2);
const previousGhost = new THREE.Mesh(ghostGeometry, new THREE.MeshPhysicalMaterial({ color: 0x486aff, roughness: 0.34, metalness: 0.02, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
const nextGhost = new THREE.Mesh(ghostGeometry, new THREE.MeshPhysicalMaterial({ color: 0xff78bd, roughness: 0.34, metalness: 0.02, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
motionRoot.add(previousGhost, nextGhost);

const previousWire = new THREE.LineSegments(new THREE.EdgesGeometry(ghostGeometry, 15), new THREE.LineBasicMaterial({ color: 0x3152e8, transparent: true, opacity: 0.5 }));
const nextWire = new THREE.LineSegments(new THREE.EdgesGeometry(ghostGeometry, 15), new THREE.LineBasicMaterial({ color: 0xdb3a8b, transparent: true, opacity: 0.5 }));
previousWire.scale.setScalar(1.008);
nextWire.scale.setScalar(1.008);
previousGhost.add(previousWire);
nextGhost.add(nextWire);

const contourMaterial = new THREE.LineBasicMaterial({ color: 0x18328e, transparent: true, opacity: 0.35 });
const contourLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TorusGeometry(1.14, 0.009, 5, 96), 1), contourMaterial);
contourLines.rotation.x = Math.PI * 0.48;
motionRoot.add(contourLines);

const floorGeometry = new THREE.CircleGeometry(2.4, 64);
const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x8ea3ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.72;
motionRoot.add(floor);

const floaters = [];
const floaterMaterial = new THREE.MeshBasicMaterial({ color: 0x6b7ed1, transparent: true, opacity: 0.42 });
for (let index = 0; index < 14; index += 1) {
  const size = index % 3 === 0 ? 0.034 : 0.02;
  const fleck = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), floaterMaterial);
  const angle = (index / 14) * Math.PI * 2;
  fleck.position.set(Math.cos(angle) * (2.5 + (index % 2) * 0.4), Math.sin(angle * 1.4) * 1.7, -0.35 - (index % 4) * 0.12);
  fleck.userData.baseY = fleck.position.y;
  motionRoot.add(fleck);
  floaters.push(fleck);
}

function poseAt(frame) {
  const progress = frame / frameCount;
  const point = pathCurve.getPointAt(progress);
  return new THREE.Vector3(point.x, point.y, 0);
}

function updatePose(frame, updateInput = true) {
  currentFrame = Math.max(0, Math.min(frameCount, frame));
  const progress = currentFrame / frameCount;
  const pose = poseAt(currentFrame);
  const before = poseAt(Math.max(0, currentFrame - 7));
  const after = poseAt(Math.min(frameCount, currentFrame + 7));
  core.position.copy(pose);
  previousGhost.position.copy(before);
  nextGhost.position.copy(after);
  previousGhost.rotation.set(0.22, -0.48 - progress * 1.3, 0.12);
  nextGhost.rotation.set(-0.17, 0.58 + progress * 1.2, -0.12);
  core.rotation.set(0.25 + Math.sin(progress * Math.PI * 2) * 0.24, progress * Math.PI * 3.5, 0.18 + Math.cos(progress * Math.PI * 2) * 0.16);
  core.scale.setScalar(1 + Math.sin(progress * Math.PI * 4) * 0.045);
  contourLines.position.copy(pose);
  contourLines.rotation.z = progress * Math.PI * 1.2;
  previousGhost.visible = onionToggle.checked && visibleLayers.ghost && currentFrame > 0;
  nextGhost.visible = onionToggle.checked && visibleLayers.ghost && currentFrame < frameCount;
  motionPath.visible = contourToggle.checked && visibleLayers.path;
  contourLines.visible = contourToggle.checked && visibleLayers.path;
  core.visible = visibleLayers.form;
  coreWire.visible = contourToggle.checked && visibleLayers.form;
  previousWire.visible = contourToggle.checked && previousGhost.visible;
  nextWire.visible = contourToggle.checked && nextGhost.visible;
  if (updateInput) timeline.value = String(currentFrame);
  timeline.setAttribute('aria-valuetext', `Frame ${currentFrame} of ${frameCount}`);
  frameReadout.textContent = `FRAME ${String(currentFrame).padStart(3, '0')} / ${String(frameCount).padStart(3, '0')}`;
  const seconds = Math.floor(currentFrame / 24);
  const frameWithinSecond = currentFrame % 24;
  timeReadout.textContent = `00:${String(seconds).padStart(2, '0')}:${String(frameWithinSecond).padStart(2, '0')}`;
  coordinateReadout.textContent = `X ${pose.x.toFixed(2)}   Y ${pose.y.toFixed(2)}   Z 0.00`;
  document.querySelectorAll('.keyframe-buttons button').forEach((button) => {
    button.classList.toggle('is-current', Number(button.dataset.frame) === currentFrame);
  });
  document.querySelector('.timeline').style.setProperty('--progress', `${progress * 100}%`);
}

function setPlaying(playing) {
  isPlaying = playing;
  playButton.setAttribute('aria-pressed', String(playing));
  playButton.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
  playButton.querySelector('.play-glyph').textContent = playing ? 'Ⅱ' : '▶';
  document.querySelector('.viewer-status').classList.toggle('is-paused', !playing);
}

timeline.addEventListener('input', () => {
  setPlaying(false);
  updatePose(Number(timeline.value), false);
});
playButton.addEventListener('click', () => setPlaying(!isPlaying));
onionToggle.addEventListener('change', () => updatePose(currentFrame, false));
contourToggle.addEventListener('change', () => updatePose(currentFrame, false));
document.querySelectorAll('.layer-row').forEach((button) => {
  button.addEventListener('click', () => {
    const layer = button.dataset.layer;
    visibleLayers[layer] = !visibleLayers[layer];
    button.setAttribute('aria-pressed', String(visibleLayers[layer]));
    button.setAttribute('aria-label', `${visibleLayers[layer] ? 'Hide' : 'Show'} ${button.querySelector('.layer-name').textContent.toLowerCase()} layer`);
    button.classList.toggle('is-hidden', !visibleLayers[layer]);
    updatePose(currentFrame, false);
  });
});
document.querySelectorAll('.keyframe-buttons button').forEach((button) => {
  button.addEventListener('click', () => {
    setPlaying(false);
    updatePose(Number(button.dataset.frame));
  });
});

function resizeRenderer() {
  const { width, height } = canvasHost.getBoundingClientRect();
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.position.z = width < 560 ? 10.6 : 9.2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

new ResizeObserver(resizeRenderer).observe(canvasHost);
resizeRenderer();
function resizePreview() {
  const { width, height } = previewHost.getBoundingClientRect();
  if (!width || !height) return;
  previewCamera.aspect = width / height;
  previewCamera.updateProjectionMatrix();
  previewRenderer.setSize(width, height, false);
}
new ResizeObserver(resizePreview).observe(previewHost);
resizePreview();
updatePose(currentFrame);
setPlaying(isPlaying);

function render(now = 0) {
  animationFrameId = requestAnimationFrame(render);
  if (isPlaying && now - lastTick > 1000 / 24) {
    lastTick = now;
    updatePose((currentFrame + 1) % (frameCount + 1));
  }
  const elapsed = now * 0.00035;
  floaters.forEach((fleck, index) => {
    fleck.position.y = fleck.userData.baseY + (reducedMotion ? 0 : Math.sin(elapsed + index) * 0.08);
  });
  if (!reducedMotion) {
    previewForm.rotation.set(Math.sin(elapsed * 0.9) * 0.24, elapsed * 2, Math.cos(elapsed * 0.7) * 0.15);
    previewRoot.position.y = Math.sin(elapsed * 1.15) * 0.12;
    previewOrbit.rotation.z = -0.24 + Math.sin(elapsed * 0.6) * 0.12;
  }
  controls.update();
  renderer.render(scene, camera);
  previewControls.update();
  previewRenderer.render(previewScene, previewCamera);
}

render();

window.addEventListener('pagehide', () => {
  cancelAnimationFrame(animationFrameId);
  renderer.dispose();
  previewRenderer.dispose();
  coreGeometry.dispose();
  ghostGeometry.dispose();
  previewGeometry.dispose();
  previewGhostGeometry.dispose();
}, { once: true });