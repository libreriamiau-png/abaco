// =============================================================
// APP.JS — Lógica principal: formulario, captura, envío
// =============================================================

import { startCamera, stopCamera, capturePhoto, loadAndCompressFile,
         removePhoto, getPhotos, clearPhotos, canAddMore } from './camera.js';
import { savePending, saveDraft, loadDraft, clearDraft, countPending } from './db.js';
import { runSync, onSyncUpdate, registerNetworkListeners, startAutoSync } from './sync.js';

// --- Referencias DOM ---
const video       = document.getElementById('camera-video');
const snapBtn     = document.getElementById('btn-snap');
const fileInput   = document.getElementById('file-input');
const photoGrid   = document.getElementById('photo-grid');
const photoCount  = document.getElementById('photo-count');
const form        = document.getElementById('capture-form');
const submitBtn   = document.getElementById('btn-submit');
const statusBar   = document.getElementById('status-bar');
const pendingBadge = document.getElementById('pending-badge');
const syncBtn     = document.getElementById('btn-sync');
const cameraSection = document.getElementById('camera-section');
const startCamBtn = document.getElementById('btn-start-camera');

// --- Estado ---
let cameraActive = false;

// --- Inicialización ---

async function init() {
  registerNetworkListeners();
  startAutoSync(10_000);

  onSyncUpdate(handleSyncEvent);

  await restoreDraft();
  await refreshPendingBadge();

  // Eventos
  startCamBtn.addEventListener('click', toggleCamera);
  snapBtn.addEventListener('click', onSnap);
  fileInput.addEventListener('change', onFileSelect);
  form.addEventListener('submit', onSubmit);
  form.addEventListener('input', debounceDraft());
  syncBtn.addEventListener('click', () => runSync());
}

// --- Cámara ---

async function toggleCamera() {
  if (cameraActive) {
    stopCamera();
    cameraActive = false;
    cameraSection.classList.add('hidden');
    startCamBtn.textContent = 'Abrir cámara';
    return;
  }

  try {
    await startCamera(video);
    cameraActive = true;
    cameraSection.classList.remove('hidden');
    startCamBtn.textContent = 'Cerrar cámara';
    setStatus('Cámara activa', 'info');
  } catch (err) {
    setStatus('No se pudo acceder a la cámara: ' + err.message, 'error');
  }
}

async function onSnap() {
  if (!cameraActive) return;
  if (!canAddMore()) {
    setStatus('Máximo 3 fotos por registro', 'warn');
    return;
  }
  try {
    const { photo, total } = capturePhoto(video);
    renderPhoto(photo, total - 1);
    updatePhotoCount();
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

async function onFileSelect(e) {
  const files = [...e.target.files];
  for (const file of files) {
    if (!canAddMore()) break;
    try {
      const { photo, total } = await loadAndCompressFile(file);
      renderPhoto(photo, total - 1);
      updatePhotoCount();
    } catch (err) {
      setStatus(err.message, 'error');
    }
  }
  fileInput.value = '';
}

// --- Renderizado de fotos ---

function renderPhoto(photo, index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'photo-thumb';
  wrapper.dataset.index = index;

  const img = document.createElement('img');
  img.src = photo.dataUrl;
  img.alt = `Foto ${index + 1}`;

  const size = document.createElement('span');
  size.className = 'photo-size';
  size.textContent = `${photo.sizeKB} KB`;

  const del = document.createElement('button');
  del.className = 'btn-delete-photo';
  del.textContent = '✕';
  del.setAttribute('aria-label', 'Eliminar foto');
  del.addEventListener('click', () => {
    removePhoto(index);
    wrapper.remove();
    rebuildPhotoIndexes();
    updatePhotoCount();
  });

  wrapper.append(img, size, del);
  photoGrid.appendChild(wrapper);
}

function rebuildPhotoIndexes() {
  photoGrid.querySelectorAll('.photo-thumb').forEach((el, i) => {
    el.dataset.index = i;
    el.querySelector('button').onclick = () => {
      removePhoto(i);
      el.remove();
      rebuildPhotoIndexes();
      updatePhotoCount();
    };
  });
}

function updatePhotoCount() {
  const n = getPhotos().length;
  photoCount.textContent = `${n}/3`;
  snapBtn.disabled = !canAddMore();
}

// --- Formulario ---

async function onSubmit(e) {
  e.preventDefault();

  const photos = getPhotos();
  if (photos.length === 0) {
    setStatus('Añade al menos 1 foto', 'warn');
    return;
  }

  const data = collectFormData();
  data.fotos = photos.map((p) => p.dataUrl);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando…';

  try {
    await savePending(data);
    await clearDraft();

    setStatus('Guardado offline. Sincronizando…', 'success');
    resetForm();
    await refreshPendingBadge();
    runSync(); // intento inmediato
  } catch (err) {
    setStatus('Error al guardar: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar registro';
  }
}

function collectFormData() {
  const fd = new FormData(form);
  return {
    isbn:   fd.get('isbn')?.trim() || null,
    titulo: fd.get('titulo')?.trim() || null,
    autor:  fd.get('autor')?.trim() || null,
    precio: fd.get('precio') ? parseFloat(fd.get('precio')) : null,
    estado: fd.get('estado') || null,
    notas:  fd.get('notas')?.trim() || null,
  };
}

function resetForm() {
  form.reset();
  clearPhotos();
  photoGrid.innerHTML = '';
  updatePhotoCount();
  if (cameraActive) {
    stopCamera();
    cameraActive = false;
    cameraSection.classList.add('hidden');
    startCamBtn.textContent = 'Abrir cámara';
  }
}

// --- Draft ---

async function restoreDraft() {
  const draft = await loadDraft();
  if (!draft) return;
  ['isbn', 'titulo', 'autor', 'precio', 'estado', 'notas'].forEach((key) => {
    const el = form.elements[key];
    if (el && draft[key] != null) el.value = draft[key];
  });
}

function debounceDraft() {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => saveDraft(collectFormData()), 800);
  };
}

// --- Badge de pendientes ---

async function refreshPendingBadge() {
  const n = await countPending();
  pendingBadge.textContent = n > 0 ? n : '';
  pendingBadge.hidden = n === 0;
}

// --- Eventos de sincronización ---

function handleSyncEvent(event) {
  switch (event.type) {
    case 'sync-start':
      setStatus('Sincronizando…', 'info');
      break;
    case 'sync-done':
      setStatus(
        event.synced > 0
          ? `${event.synced} registro(s) sincronizado(s)${event.failed ? `, ${event.failed} con error` : ''}`
          : 'Sin cambios pendientes',
        event.failed > 0 ? 'warn' : 'success'
      );
      refreshPendingBadge();
      break;
    case 'sync-skip':
      setStatus('Sin conexión — datos guardados offline', 'warn');
      break;
    case 'network-online':
      setStatus('Conexión restaurada', 'success');
      break;
    case 'network-offline':
      setStatus('Modo offline', 'warn');
      break;
  }
}

// --- Status bar ---

let _statusTimer;

function setStatus(msg, type = 'info') {
  statusBar.textContent = msg;
  statusBar.className = `status-bar status-${type}`;
  statusBar.hidden = false;
  clearTimeout(_statusTimer);
  if (type === 'success' || type === 'info') {
    _statusTimer = setTimeout(() => { statusBar.hidden = true; }, 4000);
  }
}

// --- Arranque ---

document.addEventListener('DOMContentLoaded', init);
