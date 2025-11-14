const video = document.getElementById('webcam');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');

let poseNetModel; // Para la detección de postura
let faceLandmarksModel; // Para la detección de fatiga

// Variables globales para la lógica de fatiga (similares a Python)
let totalBlinks = 0;
let lastBlinkTime = Date.now();
const EAR_THRESHOLD = 0.21;
const NO_BLINK_SECONDS = 10;
const POSTURE_THRESHOLD = 170;

// Inicializa la cámara y los modelos de IA
async function setupWebcam() {
    // 1. Cargar modelos
    poseNetModel = await posenet.load();
    faceLandmarksModel = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFaceMesh
    );

    // 2. Iniciar video
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            // Ajustar canvas al tamaño del video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            resolve(video);
        };
    });
}

// Bucle principal de la aplicación (se ejecuta continuamente)
function detectLoop() {
    // Dibuja el frame del video en el canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Ejecuta las detecciones
    detectPosture(video);
    detectFatigue(video);

    // Pide al navegador que ejecute el bucle en el siguiente frame (alta frecuencia)
    requestAnimationFrame(detectLoop);
}

setupWebcam().then(() => {
    detectLoop(); // Iniciar el bucle cuando todo esté listo
});

function calculateAngle(A, B, C) {
    // Simula la función de ángulo de Python, usando coordenadas X, Y
    const AB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
    const BC = Math.sqrt(Math.pow(B.x - C.x, 2) + Math.pow(B.y - C.y, 2));
    const AC = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2));
    
    // Ley del coseno
    const angleRad = Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
    return angleRad * (180 / Math.PI); // Convertir a grados
}

async function detectPosture(input) {
    // PoseNet devuelve una lista de poses (solo nos interesa la primera)
    const pose = await poseNetModel.estimateSinglePose(input);

    if (pose.score > 0.5) {
        const keypoints = pose.keypoints;
        
        // Obtener hombros y nariz (claves para la alineación del cuello)
        const leftShoulder = keypoints.find(k => k.part === 'leftShoulder').position;
        const rightShoulder = keypoints.find(k => k.part === 'rightShoulder').position;
        const nose = keypoints.find(k => k.part === 'nose').position;

        // Asegurar que los puntos tengan suficiente confianza
        if (leftShoulder.score > 0.1 && rightShoulder.score > 0.1 && nose.score > 0.1) {
             const angle = calculateAngle(leftShoulder, nose, rightShoulder);

             if (angle < POSTURE_THRESHOLD) {
                 updateAlert('posture-alert', `⚠️ ¡MALA POSTURA! Ángulo ${angle.toFixed(2)}°.`, 'alert-bad');
             } else {
                 updateAlert('posture-alert', `✅ Postura Correcta (${angle.toFixed(2)}°).`, 'alert-ok');
             }
        }
        
        // Opcional: Dibujar keypoints de PoseNet en el canvas para debug
        // drawKeypoints(keypoints, 0.5, ctx); 
    }
}

function eyeAspectRatio(landmarks) {
    // Implementación del EAR en JS
    const p = (i) => landmarks[i];
    
    // Coordenadas del ojo izquierdo (ejemplo de 6 puntos)
    // El modelo Face Landmarks de TF.js usa índices diferentes, por lo que necesitarás mapearlos
    // Por simplicidad, usaremos un subconjunto.
    
    // Simula la implementación de Python para el cálculo de distancias (puedes ajustar los índices)
    const dist = (p1, p2) => Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));

    // Usaremos índices aproximados (deberás mapearlos con la documentación de Face Landmarks)
    const V1 = dist(p(160), p(144)); // Distancia vertical 1
    const V2 = dist(p(158), p(153)); // Distancia vertical 2
    const H = dist(p(33), p(133));   // Distancia horizontal
    
    return (V1 + V2) / (2.0 * H);
}

async function detectFatigue(input) {
    // TF.js Face Landmarks detection
    const faces = await faceLandmarksModel.estimateFaces({ input: input });

    if (faces.length > 0) {
        // Asumimos solo una persona
        const mesh = faces[0].scaledMesh;
        
        // Calcular EAR (se debe hacer para ambos ojos y promediar)
        // Nota: Los índices de MediaPipe Python (33, 160, etc.) deben ser validados
        // con la salida de `faces[0].scaledMesh` del modelo de TF.js.
        const avgEAR = eyeAspectRatio(mesh); // Función placeholder con índices de ejemplo

        // Lógica de Fatiga (similar a Python)
        if (avgEAR < EAR_THRESHOLD) {
            // Esto simula un contador de frames. En JS, se usa la variable global.
            // Para una simulación precisa, necesitarías un contador de frames o un estado de "ojos cerrados".
        }
        
        // Verificar Fatiga Visual por tiempo sin parpadear
        const timeSinceLastBlink = (Date.now() - lastBlinkTime) / 1000; // Segundos

        if (timeSinceLastBlink >= NO_BLINK_SECONDS) {
            updateAlert('fatigue-alert', `🚨 ¡FATIGA VISUAL! Descansa la vista.`, 'alert-bad');
        } else {
            updateAlert('fatigue-alert', `👁️ Ojos OK (${timeSinceLastBlink.toFixed(1)}s sin parpadear).`, 'alert-ok');
        }
    }
}

function updateAlert(id, message, className) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.className = className;
}

// **Falta la lógica precisa para actualizar `lastBlinkTime`**
// En un entorno de producción, la función `detectFatigue` debería determinar
// si un parpadeo completo ha ocurrido y, si es así, actualizar `lastBlinkTime = Date.now()`.

// --- Lógica a añadir en script.js, preferiblemente antes de setupWebcam ---
let blinkCounterJS = 0;
const CONSEC_FRAMES_JS = 2; // Frames consecutivos para considerarlo un parpadeo

// --- Dentro de async function detectFatigue(input) { ... } ---

// Asumiendo que avgEAR es el EAR promedio calculado...

const eyeClosed = avgEAR < EAR_THRESHOLD;

if (eyeClosed) {
    blinkCounterJS += 1;
} else {
    // Si el ojo se abre después de estar cerrado por X frames
    if (blinkCounterJS >= CONSEC_FRAMES_JS) {
        totalBlinks += 1;
        lastBlinkTime = Date.now(); // ¡Actualiza el tiempo del último parpadeo!
        console.log(`Parpadeo detectado! Total: ${totalBlinks}`);
    }
    blinkCounterJS = 0;
}

// ... El resto de la lógica de tiempo sin parpadear ya está definida:
/*
const timeSinceLastBlink = (Date.now() - lastBlinkTime) / 1000; // Segundos

if (timeSinceLastBlink >= NO_BLINK_SECONDS) {
    updateAlert('fatigue-alert', `🚨 ¡FATIGA VISUAL! Descansa la vista.`, 'alert-bad');
} else {
    updateAlert('fatigue-alert', `👁️ Ojos OK (${timeSinceLastBlink.toFixed(1)}s sin parpadear).`, 'alert-ok');
}
*/