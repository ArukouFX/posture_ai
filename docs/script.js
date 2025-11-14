const video = document.getElementById('webcam');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');

let poseNetModel; // Para la detección de postura
let faceLandmarksModel; // Para la detección de fatiga

// Variables globales para la lógica de fatiga
let totalBlinks = 0;
let lastBlinkTime = Date.now();
const EAR_THRESHOLD = 0.21;
const NO_BLINK_SECONDS = 10;
const POSTURE_THRESHOLD = 170;

// Variables para el contador de frames de parpadeo
let blinkCounterJS = 0;
const CONSEC_FRAMES_JS = 2; // Frames consecutivos para considerarlo un parpadeo


// Inicializa la cámara y los modelos de IA
async function setupWebcam() {
    try {
        // 1. Cargar modelos
        poseNetModel = await posenet.load();

        // *** CORRECCIÓN COMPLETA para Face Landmarks Detection ***
        faceLandmarksModel = await faceLandmarksDetection.load(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh'
            }
        );

        // 2. Iniciar video
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        video.srcObject = stream;

        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                // Ajustar canvas al tamaño del video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                resolve(video);
            };
        });
    } catch (error) {
        console.error("Error en setupWebcam:", error);
        throw error;
    }
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
}).catch(error => {
    // Manejo del error de cámara si el usuario la niega o falla el acceso
    console.error("Error al iniciar la cámara. Asegúrese de estar en HTTPS y de dar permiso.", error);
    alert("Error: Se requiere permiso para usar la cámara. Verifique la consola.");
});


function calculateAngle(A, B, C) {
    // Tu función calculateAngle
    const AB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
    const BC = Math.sqrt(Math.pow(B.x - C.x, 2) + Math.pow(B.y - C.y, 2));
    const AC = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2));
    
    // Ley del coseno
    const angleRad = Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
    return angleRad * (180 / Math.PI); // Convertir a grados
}

async function detectPosture(input) {
    // Tu función detectPosture
    const pose = await poseNetModel.estimateSinglePose(input);

    if (pose.score > 0.5) {
        const keypoints = pose.keypoints;
        
        const leftShoulder = keypoints.find(k => k.part === 'leftShoulder').position;
        const rightShoulder = keypoints.find(k => k.part === 'rightShoulder').position;
        const nose = keypoints.find(k => k.part === 'nose').position;

        if (leftShoulder.score > 0.1 && rightShoulder.score > 0.1 && nose.score > 0.1) {
             const angle = calculateAngle(leftShoulder, nose, rightShoulder);

             if (angle < POSTURE_THRESHOLD) {
                 updateAlert('posture-alert', `⚠️ ¡MALA POSTURA! Ángulo ${angle.toFixed(2)}°.`, 'alert-bad');
             } else {
                 updateAlert('posture-alert', `✅ Postura Correcta (${angle.toFixed(2)}°).`, 'alert-ok');
             }
        }
    }
}

function eyeAspectRatio(landmarks) {
    // Implementación del EAR en JS
    const p = (i) => landmarks[i];
    
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
        const mesh = faces[0].scaledMesh;
        
        // *** CORRECCIÓN: avgEAR definido antes de ser usado ***
        const avgEAR = eyeAspectRatio(mesh);

        // --- Lógica de Detección de Parpadeo ---
        const eyeClosed = avgEAR < EAR_THRESHOLD;

        if (eyeClosed) {
            blinkCounterJS += 1;
        } else {
            // Se detecta el parpadeo cuando el ojo se vuelve a abrir después de X frames
            if (blinkCounterJS >= CONSEC_FRAMES_JS) {
                totalBlinks += 1;
                lastBlinkTime = Date.now(); // ¡Actualiza el tiempo del último parpadeo!
                console.log(`Parpadeo detectado! Total: ${totalBlinks}`);
            }
            blinkCounterJS = 0;
        }
        
        // --- Lógica de Detección de Fatiga Visual (por tiempo) ---
        const timeSinceLastBlink = (Date.now() - lastBlinkTime) / 1000; // Segundos

        if (timeSinceLastBlink >= NO_BLINK_SECONDS) {
            updateAlert('fatigue-alert', `🚨 ¡FATIGA VISUAL! Descansa la vista.`, 'alert-bad');
        } else {
            updateAlert('fatigue-alert', `👁️ Ojos OK (${timeSinceLastBlink.toFixed(1)}s sin parpadear).`, 'alert-ok');
        }

    } else {
        // Si no se detecta rostro, la alerta se mantiene neutral
        updateAlert('fatigue-alert', `👁️ Ojos OK (Esperando rostro...).`, 'alert-ok');
    }
}

function updateAlert(id, message, className) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.className = className;
}
