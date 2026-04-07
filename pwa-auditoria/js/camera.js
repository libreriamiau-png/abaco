// =============================================================
// CAMERA.JS — Media API + compresión Canvas
// =============================================================

import CONFIG from './config.js';

const { maxWidthPx, maxFileSizeKB, quality, mimeType } = CONFIG.image;
const MAX_PHOTOS = 3;

let stream = null;
const photos = []; // Array de { dataUrl, sizeKB }

// --- Stream ---

export async function startCamera(videoEl) {
  if (stream) stopCamera();

  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  });

  videoEl.srcObject = stream;
  await videoEl.play();
}

export function stopCamera() {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
  stream = null;
}

// --- Captura y compresión ---

export function capturePhoto(videoEl) {
  if (photos.length >= MAX_PHOTOS) {
    throw new Error(`Máximo ${MAX_PHOTOS} fotos por registro`);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const { videoWidth, videoHeight } = videoEl;
  const scale = Math.min(1, maxWidthPx / videoWidth);
  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);

  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  // Compresión iterativa si supera el límite
  let q = quality;
  let dataUrl = canvas.toDataURL(mimeType, q);

  while (base64SizeKB(dataUrl) > maxFileSizeKB && q > 0.3) {
    q -= 0.05;
    dataUrl = canvas.toDataURL(mimeType, q);
  }

  const sizeKB = base64SizeKB(dataUrl);
  const photo = { dataUrl, sizeKB, capturedAt: Date.now() };
  photos.push(photo);

  return { photo, index: photos.length - 1, total: photos.length };
}

export function removePhoto(index) {
  if (index < 0 || index >= photos.length) return;
  photos.splice(index, 1);
}

export function getPhotos() {
  return [...photos];
}

export function clearPhotos() {
  photos.length = 0;
}

export function canAddMore() {
  return photos.length < MAX_PHOTOS;
}

// --- Utilidades ---

function base64SizeKB(dataUrl) {
  // Aproximación: cada carácter base64 = 6 bits → 3/4 bytes
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4 / 1024);
}

// Carga una foto desde input[type=file] y la comprime igual que la cámara
export function loadAndCompressFile(file) {
  return new Promise((resolve, reject) => {
    if (photos.length >= MAX_PHOTOS) {
      return reject(new Error(`Máximo ${MAX_PHOTOS} fotos por registro`));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = Math.min(1, maxWidthPx / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let q = quality;
        let dataUrl = canvas.toDataURL(mimeType, q);
        while (base64SizeKB(dataUrl) > maxFileSizeKB && q > 0.3) {
          q -= 0.05;
          dataUrl = canvas.toDataURL(mimeType, q);
        }

        const sizeKB = base64SizeKB(dataUrl);
        const photo = { dataUrl, sizeKB, capturedAt: Date.now() };
        photos.push(photo);
        resolve({ photo, index: photos.length - 1, total: photos.length });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
