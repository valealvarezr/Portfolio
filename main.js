// Importar Three.js y el cargador GLTF
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// =========================
// Config base
// =========================
const container = document.getElementById('model-wrapper');
const CANVAS_HEIGHT = 600; // alto fijo del canvas

// Renderer (canvas) con fondo transparente
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, CANVAS_HEIGHT);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Crear escena vacía
const scene = new THREE.Scene();

// =========================
// Variables nuevas
// =========================
let autoRotate = true;        // bandera: ¿rotamos automáticamente?
const AUTO_ROTATE_SPEED = 0.002; // velocidad de giro lento en radianes
let hintShown = true;         // bandera para mostrar la pista

// Crear un "hint" (mensaje flotante)
const hint = document.createElement('div');
hint.innerText = "Arrastra para girar el objeto";
hint.style.position = "absolute";
hint.style.bottom = "15px";
hint.style.left = "50%";
hint.style.transform = "translateX(-50%)";
hint.style.padding = "6px 12px";
hint.style.background = "rgba(0,0,0,0.6)";
hint.style.color = "#fff";
hint.style.fontSize = "13px";
hint.style.borderRadius = "8px";
hint.style.pointerEvents = "none";
hint.style.fontFamily = "sans-serif";
hint.style.transition = "opacity 0.5s";
container.style.position = "relative";
container.appendChild(hint);

// Función para ocultar el hint
function hideHint() {
  if (hintShown) {
    hint.style.opacity = "0";
    setTimeout(() => hint.remove(), 500);
    hintShown = false;
  }
}


// Cámara fija en perspectiva
const camera = new THREE.PerspectiveCamera(
  35,                                 // FOV
  container.clientWidth / CANVAS_HEIGHT, // aspecto (relación ancho/alto)
  0.01,                               // plano cercano
  500                                 // plano lejano
);
camera.position.set(0.05, -0.1, 1
); // cerca del modelo

scene.add(camera);

// Guardamos la posición inicial de cámara para restaurar zoom
// NUEVO: usaremos esto para el auto-reset del zoom
const initialCameraPosition = camera.position.clone();

// Luces suaves y direccionales
// Luz principal blanca
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(3, 5, 5);
scene.add(keyLight);

// Luz de relleno azulada suave
const fillLight = new THREE.HemisphereLight(0x88aaff, 0x444466, 4);
scene.add(fillLight);

// Luz de contra cálida
const rimLight = new THREE.DirectionalLight(0xffaa55,8);
rimLight.position.set(-5, 3, -5);
scene.add(rimLight);

let model = null; // variable donde guardaremos el modelo

// Variables para restaurar estado tras inactividad
// NUEVO: control de inactividad y restauración suave
let idleTimeout;
const IDLE_DELAY = 3000;     // ms antes de volver a estado inicial
let restoring = false;       // bandera: ¿estamos restaurando?
const EASE = 0.08;           // factor de suavizado por frame
const EPS = 0.001;           // umbral para “considerar igual”

// Guardaremos la rotación inicial REAL del modelo (cuando cargue)
let initialRotation = new THREE.Euler(0, 0, 0);

// Loader de GLTF (para cargar modelos 3D .glb o .gltf)
const loader = new GLTFLoader().setPath('public/model/');
loader.load(
  'Proyector.glb',  // archivo del modelo
  (gltf) => {
    model = gltf.scene;
    model.position.set(0.05, 0, 0); // bajarlo un poco
    model.rotation.set(0.33,-0.5,0);
    
    scene.add(model);

    // NUEVO: tomar la rotación inicial exacta del modelo tal cual llega
    initialRotation = model.rotation.clone();

    // Ocultar progreso
    const pc = document.getElementById('progress-container');
    if (pc) pc.style.display = 'none';

    // Arrancamos el timer de inactividad por si el usuario no hace nada
    resetIdleTimer();
  },
  (xhr) => console.log(`loading ${xhr.loaded / xhr.total * 100}%`), // progreso
  (err) => console.error(err) // errores
);

// =========================
// Interacción con el mouse
// =========================

// Rotación con arrastrar (drag)
// NUEVO: ahora rotamos en Y y también en X con el arrastre
let isDragging = false;
let prevX = 0;
let prevY = 0;

// Config rotación
const ROTATE_SPEED = 0.01;           // velocidad de rotación con el drag
const MAX_ROT_X_UP = 1.65;   // máximo hacia arriba 
const MAX_ROT_X_DOWN = 0; // máximo hacia abajo 

container.addEventListener('mousedown', (e) => {
  isDragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
  autoRotate = false;   // detener rotación automática
  hideHint();           // ocultar mensaje
  
  clearTimeout(idleTimeout);
});

container.addEventListener('mouseup', () => {
  isDragging = false;
  resetIdleTimer(); 
});

container.addEventListener('mouseleave', () => {
  isDragging = false;
  resetIdleTimer();
});

container.addEventListener('mousemove', (e) => {
  if (isDragging && model) {
    const deltaX = e.clientX - prevX;
    const deltaY = e.clientY - prevY;

    // Rotar en Y con el movimiento horizontal
    model.rotation.y += deltaX * ROTATE_SPEED;

    // Rotar en X con el movimiento vertical (invertido para sensación natural)
    model.rotation.x += deltaY * ROTATE_SPEED;

    // Clamp en X para evitar giros extremos
    if (model.rotation.x > MAX_ROT_X_UP) model.rotation.x = MAX_ROT_X_UP;
    if (model.rotation.x < MAX_ROT_X_DOWN) model.rotation.x = MAX_ROT_X_DOWN;

    prevX = e.clientX;
    prevY = e.clientY;
  }
});

// Zoom con la rueda del mouse (como estaba)
// IMPORTANTE: lo dejamos exactamente como en tu versión original,
// moviendo la cámara en Z según deltaY, con límites.
// Sugerencia: si quieres invertir el sentido, cambia "+=" por "-=".
const onWheel = (e) => {
   e.preventDefault();

  camera.position.z += e.deltaY * 0.001;

  // límites del zoom (para no pasarse)
  if (camera.position.z < 0.85) camera.position.z = 0.85; // muy cerca
  if (camera.position.z > 1.65) camera.position.z = 1.65;       // muy lejos

  // NUEVO: al interactuar, detenemos restauración y reiniciamos timer
  restoring = false;
  resetIdleTimer();
};
// Nota: si quieres usar preventDefault arriba, registra el listener como { passive:false }
container.addEventListener('wheel', onWheel /* , { passive: false } */);

container.addEventListener('wheel', (e) => {
  onWheel(e);
  autoRotate = false;   // detener rotación automática
  hideHint();
});
// =========================
// Auto-reset tras inactividad
// =========================

// NUEVO: cuando pasa IDLE_DELAY sin interacción, activamos "restoring"
function resetIdleTimer() {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    restoring = true;
  }, IDLE_DELAY);
}

// =========================
// Resize responsivo
// =========================
window.addEventListener('resize', () => {
  // Mantener la proporción en función del alto fijo que usamos
  camera.aspect = container.clientWidth / CANVAS_HEIGHT;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, CANVAS_HEIGHT);
});

// =========================
// Animación del render loop
// =========================
function animate() {
  requestAnimationFrame(animate);

 if (model) {
    if (restoring) {
      // restaurar modelo a posición inicial
      model.rotation.x += (initialRotation.x - model.rotation.x) * EASE;
      model.rotation.y += (initialRotation.y - model.rotation.y) * EASE;
      model.rotation.z += (initialRotation.z - model.rotation.z) * EASE;
      camera.position.lerp(initialCameraPosition, EASE);

      if (
        Math.abs(model.rotation.x - initialRotation.x) < EPS &&
        Math.abs(model.rotation.y - initialRotation.y) < EPS &&
        Math.abs(model.rotation.z - initialRotation.z) < EPS &&
        camera.position.distanceTo(initialCameraPosition) < EPS
      ) {
        model.rotation.copy(initialRotation);
        camera.position.copy(initialCameraPosition);
        restoring = false;
        autoRotate = true; // volver a girar lentamente tras reset
      }
    } else if (autoRotate) {
      // rotación automática lenta en Y
      model.rotation.y += AUTO_ROTATE_SPEED;
    }
  }

  renderer.render(scene, camera);
}
animate();