# 👁️ Asistencia en el Estudio: Detección de Postura y Fatiga Visual (AI Study Assistant)

## 🌟 Descripción del Proyecto

Este proyecto implementa un sistema de monitoreo inteligente que utiliza **Inteligencia Artificial (IA)** para mejorar la salud y la productividad de los usuarios mientras estudian o trabajan frente a una pantalla.

[cite_start]La aplicación utiliza la *webcam* para detectar en tiempo real dos problemas principales[cite: 2]:
1.  **Mala Postura:** Detecta si el usuario está sentado con una mala postura (cabeza y hombros desalineados).
2.  **Fatiga Visual (Ojos):** Estima si el usuario ha estado mirando la pantalla por demasiado tiempo o necesita parpadear.

[cite_start]El objetivo es mostrar **notificaciones amigables** para que el usuario tome un descanso o corrija su postura[cite: 8].

---

## 🛠️ Tecnologías y Modelos de IA Aplicados

El proyecto se basa en el procesamiento de video/imágenes para el seguimiento de puntos clave (**landmarks**).

| Área | Herramienta/Modelo | Función Técnica |
| :--- | :--- | :--- |
| **Detección Corporal** | [cite_start]`MediaPipe Pose` o `YOLOv8-pose` [cite: 4] | [cite_start]Se usa para rastrear la posición de hombros y cabeza para determinar si la postura es correcta (espalda recta, cabeza alineada)[cite: 4]. |
| **Detección Facial/Ocular** | [cite_start]`MediaPipe Face Mesh` + **EAR (Eye Aspect Ratio)** [cite: 7] | [cite_start]El cálculo del EAR estima si el usuario está parpadeando o si sus ojos están demasiado abiertos/cansados[cite: 7]. |

---

## ⚙️ Estructura del Proyecto

El proyecto está diseñado para ser portable, con implementaciones clave en Python y una futura versión Web:

* `posture_ai.py`: Script principal de desarrollo en **Python (Google Colab)**. Contiene la lógica unificada de EAR y Detección de Postura.
* `README.md`: Este documento.
* `docs/`: Documentación, diagramas de flujo y explicación técnica para el TFC.
* `web/`: Contendrá la implementación en **JavaScript (TensorFlow.js)**.

---

## 💻 Instalación y Ejecución (Python)

Este proyecto se ejecuta idealmente en un entorno de Google Colab debido a la naturaleza de la captura de imágenes desde la *webcam* mediante JS.

### 1. Requisitos

Asegúrate de tener instaladas las librerías necesarias:

```bash
pip install mediapipe opencv-python numpy