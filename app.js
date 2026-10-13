/**
 * ==============================================================================
 * APP.JS - PENDIENTES CAMILO GUERRA & MANAGER
 * PWA + Google Sheets Sync Engine
 * ==============================================================================
 */

// Storage Keys & Constants
const STORAGE_KEYS = {
  TASKS: 'cg_manager_tasks_v1',
  ACTIVE_USER: 'cg_manager_active_user',
  SHEETS_URL: 'cg_manager_sheets_url',
  LAST_SYNC: 'cg_manager_last_sync'
};

const LEGACY_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxjkcKE4ol9C8LhZ1jeG7Zot2U3MLdqNimI6btBQrA2k_pKkGLgv21mgewt3DIqPZw/exec';
const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwZMlDciNjm3rdFQJvTHwFiN4Lk9GHGx0ZSzD_5WUA-Et0PheS1XMgRtUQBBlU7djMG/exec';

// Cleans up duplicated or malformed URLs (e.g. accidental double-paste)
function sanitizeSheetsUrl(url) {
  if (!url) return '';
  const match = String(url).match(/https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_\-]+\/exec/);
  return match ? match[0] : String(url).trim();
}

// App State (Starts completely empty as requested)
const state = {
  tasks: [],
  activeUser: 'Manager', // 'Manager' or 'Camilo Guerra'
  sheetsUrl: DEFAULT_SHEETS_URL,
  selectedCategory: 'ALL',
  selectedStatus: 'ALL',
  searchQuery: '',
  sortBy: 'priority',
  isSyncing: false,
  isOnline: navigator.onLine
};

// UI Elements
const els = {
  syncStatusBadge: document.getElementById('syncStatusBadge'),
  syncStatusText: document.getElementById('syncStatusText'),
  activeUserSelect: document.getElementById('activeUserSelect'),
  currentRoleIcon: document.getElementById('currentRoleIcon'),
  btnManualSync: document.getElementById('btnManualSync'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  
  // Counters
  countUrgent: document.getElementById('countUrgent'),
  countMedia: document.getElementById('countMedia'),
  countMine: document.getElementById('countMine'),
  countIdeas: document.getElementById('countIdeas'),
  
  // Filters
  searchInput: document.getElementById('searchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  categoryTabs: document.getElementById('categoryTabs'),
  statusFilters: document.getElementById('statusFilters'),
  sortBySelect: document.getElementById('sortBySelect'),
  
  // Feed
  taskFeedContainer: document.getElementById('taskFeedContainer'),
  
  // FAB & Modals
  btnOpenNewTaskModal: document.getElementById('btnOpenNewTaskModal'),
  taskModal: document.getElementById('taskModal'),
  taskModalTitle: document.getElementById('taskModalTitle'),
  btnCloseTaskModal: document.getElementById('btnCloseTaskModal'),
  btnCancelTaskModal: document.getElementById('btnCancelTaskModal'),
  taskForm: document.getElementById('taskForm'),
  
  // Form fields
  formTaskId: document.getElementById('formTaskId'),
  formCategory: document.getElementById('formCategory'),
  formTitle: document.getElementById('formTitle'),
  formDescription: document.getElementById('formDescription'),
  formAssignee: document.getElementById('formAssignee'),
  formPriority: document.getElementById('formPriority'),
  formReferenceLink: document.getElementById('formReferenceLink'),
  formDeliveryLink: document.getElementById('formDeliveryLink'),
  deliveryLinkGroup: document.getElementById('deliveryLinkGroup'),
  formDeadline: document.getElementById('formDeadline'),
  formStatus: document.getElementById('formStatus'),
  btnSaveTask: document.getElementById('btnSaveTask'),
  
  // Settings Modal
  settingsModal: document.getElementById('settingsModal'),
  btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
  sheetsScriptUrl: document.getElementById('sheetsScriptUrl'),
  btnTestConnection: document.getElementById('btnTestConnection'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnLoadDemoData: document.getElementById('btnLoadDemoData'),
  btnExportJson: document.getElementById('btnExportJson'),
  btnClearAllData: document.getElementById('btnClearAllData'),
  
  // Toasts
  toastContainer: document.getElementById('toastContainer')
};

// Initialize Application
function init() {
  loadStoredPreferences();
  loadTasks();
  setupEventListeners();
  registerServiceWorker();
  updateSyncStatus();
  render();

  // If a Sheets URL is already configured, attempt sync
  if (state.sheetsUrl) {
    syncWithGoogleSheets(false);
  }
}

// Load local state from localStorage
function loadStoredPreferences() {
  const savedUser = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
  if (savedUser) {
    state.activeUser = savedUser;
  }
  els.activeUserSelect.value = state.activeUser;
  updateRoleIcon();

  const savedUrl = localStorage.getItem(STORAGE_KEYS.SHEETS_URL);
  const normalizedUrl = sanitizeSheetsUrl(savedUrl);
  const effectiveUrl = !normalizedUrl || normalizedUrl === LEGACY_SHEETS_URL ? DEFAULT_SHEETS_URL : normalizedUrl;
  state.sheetsUrl = effectiveUrl;
  localStorage.setItem(STORAGE_KEYS.SHEETS_URL, effectiveUrl);
  els.sheetsScriptUrl.value = effectiveUrl;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Filtrar tareas demo mock si quedaron de la versión anterior
      state.tasks = Array.isArray(parsed)
        ? parsed.filter(t => !['task-1', 'task-2', 'task-3', 'task-4'].includes(t.id))
        : [];
    } else {
      state.tasks = [];
    }
  } catch (err) {
    console.error('Error loading tasks:', err);
    state.tasks = [];
  }
  persistTasksLocal();
}

function persistTasksLocal() {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
}

// Service Worker Registration for PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('Service Worker registrado con éxito:', reg.scope);
        })
        .catch((err) => {
          console.warn('Fallo al registrar Service Worker:', err);
        });
    });
  }
}

// Audio Feedback (Gentle synth click)
function playHapticAudio(type = 'click') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'done') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch (e) {
    // AudioContext may require user gesture on some browsers
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// Update Sync Status Badge
function updateSyncStatus(status = null) {
  const dot = els.syncStatusBadge.querySelector('.status-dot');
  dot.className = 'status-dot';

  if (status === 'syncing') {
    dot.classList.add('syncing');
    els.syncStatusText.textContent = 'Sincronizando...';
    els.btnManualSync.classList.add('spinning');
    return;
  }

  els.btnManualSync.classList.remove('spinning');

  if (!navigator.onLine) {
    dot.classList.add('offline');
    els.syncStatusText.textContent = 'Sin conexión';
  } else if (state.sheetsUrl) {
    dot.classList.add('online');
    els.syncStatusText.textContent = 'Google Sheets conectado';
  } else {
    dot.classList.add('offline');
    els.syncStatusText.textContent = 'Modo Local (Sin URL)';
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Online/Offline detection
  window.addEventListener('online', () => {
    state.isOnline = true;
    updateSyncStatus();
    showToast('Conexión a internet reanudada', 'info');
    if (state.sheetsUrl) syncWithGoogleSheets(true);
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    updateSyncStatus();
    showToast('Trabajando sin conexión (Offline)', 'info');
  });

  // Switch Active User
  els.activeUserSelect.addEventListener('change', (e) => {
    state.activeUser = e.target.value;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, state.activeUser);
    updateRoleIcon();
    render();
    showToast(`Cambiado a vista de: ${state.activeUser}`, 'info');
  });

  // Manual Sync Button
  els.btnManualSync.addEventListener('click', () => {
    playHapticAudio('click');
    syncWithGoogleSheets(true);
  });

  // Open Settings Modal
  els.btnOpenSettings.addEventListener('click', () => {
    openModal(els.settingsModal);
  });

  // Close Settings Modal
  els.btnCloseSettingsModal.addEventListener('click', () => {
    closeModal(els.settingsModal);
  });

  // Open Task Modal
  els.btnOpenNewTaskModal.addEventListener('click', () => {
    openTaskModalForCreate();
  });

  // Close Task Modal
  els.btnCloseTaskModal.addEventListener('click', () => {
    closeModal(els.taskModal);
  });

  els.btnCancelTaskModal.addEventListener('click', () => {
    closeModal(els.taskModal);
  });

  // Close modals on backdrop click
  [els.taskModal, els.settingsModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Task Form Submit
  els.taskForm.addEventListener('submit', handleTaskFormSubmit);
  els.formStatus.addEventListener('change', updateDeliveryLinkVisibility);

  // Search input
  els.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    els.btnClearSearch.hidden = state.searchQuery.length === 0;
    render();
  });

  els.btnClearSearch.addEventListener('click', () => {
    els.searchInput.value = '';
    state.searchQuery = '';
    els.btnClearSearch.hidden = true;
    render();
  });

  // Category Tabs
  els.categoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-pill');
    if (!btn) return;
    playHapticAudio('click');
    els.categoryTabs.querySelectorAll('.tab-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedCategory = btn.dataset.category;
    render();
  });

  // Status Filters
  els.statusFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.subfilter-btn');
    if (!btn) return;
    playHapticAudio('click');
    els.statusFilters.querySelectorAll('.subfilter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedStatus = btn.dataset.status;
    render();
  });

  // Sort Select
  els.sortBySelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    render();
  });

  // Quick Metric Card clicks as shortcut filters
  document.querySelectorAll('.metric-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      playHapticAudio('click');
      if (filter === 'urgente') {
        activateCategoryTab('Pendientes Urgentes');
      } else if (filter === 'media') {
        activateCategoryTab('Solicitudes de Videos y Media');
      } else if (filter === 'mine') {
        activateCategoryTab('MINE');
      } else if (filter === 'ideas') {
        activateCategoryTab('Ideas Vagas');
      }
    });
  });

  // Settings Actions
  els.btnSaveSettings.addEventListener('click', handleSaveSettings);
  els.btnTestConnection.addEventListener('click', handleTestConnection);
  els.btnLoadDemoData.addEventListener('click', () => {
    if (confirm('¿Restablecer datos de ejemplo iniciales?')) {
      state.tasks = JSON.parse(JSON.stringify(INITIAL_DEMO_TASKS));
      persistTasksLocal();
      render();
      closeModal(els.settingsModal);
      showToast('Datos de demostración cargados', 'success');
    }
  });

  els.btnExportJson.addEventListener('click', handleExportJson);
  els.btnClearAllData.addEventListener('click', () => {
    if (confirm('¿Seguro que deseas vaciar todos los pendientes locales?')) {
      state.tasks = [];
      persistTasksLocal();
      render();
      closeModal(els.settingsModal);
      showToast('Datos locales vaciados', 'info');
    }
  });
}

function updateRoleIcon() {
  els.currentRoleIcon.textContent = state.activeUser === 'Manager' ? '👔' : '🎬';
}

function activateCategoryTab(category) {
  state.selectedCategory = category;
  els.categoryTabs.querySelectorAll('.tab-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  render();
}

function openModal(modal) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Create new task dialog setup
function openTaskModalForCreate() {
  els.formTaskId.value = '';
  els.taskModalTitle.textContent = 'Nuevo Pendiente';
  els.taskForm.reset();

  // Smart defaults according to who is active
  if (state.activeUser === 'Manager') {
    els.formAssignee.value = 'Camilo Guerra';
    els.formCategory.value = 'Solicitudes de Videos y Media';
  } else {
    els.formAssignee.value = 'Manager';
    els.formCategory.value = 'Tareas de Gestión';
  }

  els.formPriority.value = 'Media';
  els.formStatus.value = 'Pendiente';
  els.formReferenceLink.value = '';
  els.formDeliveryLink.value = '';
  updateDeliveryLinkVisibility();
  openModal(els.taskModal);
  els.formTitle.focus();
}

// Open task dialog for edit
function openTaskModalForEdit(task) {
  els.formTaskId.value = task.id;
  els.taskModalTitle.textContent = 'Editar Pendiente';
  els.formCategory.value = task.categoria || 'Pendientes Urgentes';
  els.formTitle.value = task.titulo || '';
  els.formDescription.value = task.descripcion || '';
  els.formAssignee.value = task.asignadoA || 'Camilo Guerra';
  els.formPriority.value = task.prioridad || 'Media';
  els.formReferenceLink.value = task.linkReferencia || task.linkMedia || '';
  els.formDeliveryLink.value = task.linkEntrega || '';
  els.formDeadline.value = task.fechaLimite || '';
  els.formStatus.value = task.estado || 'Pendiente';
  updateDeliveryLinkVisibility();
  
  openModal(els.taskModal);
}

function updateDeliveryLinkVisibility() {
  const shouldShow = els.formStatus.value === 'En Proceso' || els.formStatus.value === 'Listo';
  els.deliveryLinkGroup.hidden = !shouldShow;
  els.formDeliveryLink.disabled = !shouldShow;
}

// Handle Form Submit
async function handleTaskFormSubmit(e) {
  e.preventDefault();
  const id = els.formTaskId.value;
  const isEditing = Boolean(id);

  const taskData = {
    id: isEditing ? id : 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    fechaCreacion: isEditing 
      ? (state.tasks.find(t => t.id === id)?.fechaCreacion || new Date().toISOString())
      : new Date().toISOString(),
    creador: isEditing 
      ? (state.tasks.find(t => t.id === id)?.creador || state.activeUser)
      : state.activeUser,
    asignadoA: els.formAssignee.value,
    categoria: els.formCategory.value,
    titulo: els.formTitle.value.trim(),
    descripcion: els.formDescription.value.trim(),
    prioridad: els.formPriority.value,
    estado: isEditing ? els.formStatus.value : 'Pendiente',
    linkReferencia: els.formReferenceLink.value.trim(),
    linkEntrega: els.formDeliveryLink.value.trim(),
    fechaLimite: els.formDeadline.value,
    ultimaModificacion: new Date().toISOString()
  };

  if (isEditing) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      state.tasks[idx] = taskData;
    }
    showToast('Pendiente actualizado', 'success');
  } else {
    state.tasks.unshift(taskData);
    showToast('Guardado localmente; enviando a Sheets…', 'info');
  }

  persistTasksLocal();
  closeModal(els.taskModal);
  render();
  playHapticAudio('click');

  // Sync with Google Sheets
  if (state.sheetsUrl) {
    syncSingleTaskToSheets(taskData);
  }
}

// Status cycle directly from card button
async function handleStatusChange(taskId, newStatus) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.estado = newStatus;
  task.ultimaModificacion = new Date().toISOString();
  persistTasksLocal();
  render();

  if (newStatus === 'Listo') {
    playHapticAudio('done');
    showToast(`¡Tarea "${task.titulo.substring(0, 25)}..." marcada como lista!`, 'success');
  } else {
    playHapticAudio('click');
    showToast(`Estado cambiado a ${newStatus}`, 'info');
  }

  if (state.sheetsUrl) {
    sendToSheets({
      action: 'updateStatus',
      id: taskId,
      estado: newStatus
    }).catch(err => console.warn('Sync status pending offline:', err));
  }
}

// Delete Task
async function handleDeleteTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (!confirm(`¿Eliminar "${task.titulo}"?`)) return;

  state.tasks = state.tasks.filter(t => t.id !== taskId);
  persistTasksLocal();
  render();
  showToast('Pendiente eliminado', 'info');

  if (state.sheetsUrl) {
    sendToSheets({
      action: 'deleteItem',
      id: taskId
    }).catch(err => console.warn('Sync delete pending offline:', err));
  }
}

// Google Sheets Sync
async function sendToSheets(payload) {
  if (!state.sheetsUrl) return null;
  if (payload.action === 'batchSync') {
    for (const item of payload.items) await sendToSheets({ action: 'saveItem', item });
    return { success: true };
  }
  const validate = data => {
    if (!data || data.success !== true || !data.result) throw new Error(data?.error || 'El servidor no confirmó la operación. Actualiza Apps Script.');
    if (data.result.action === 'not_found') throw new Error('La tarea no existe en Sheets');
    return data;
  };
  const cleanUrl = sanitizeSheetsUrl(state.sheetsUrl);

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return validate(await res.json());
  } catch (postErr) {
    console.warn('POST a Google Sheets falló, intentando alternativa GET:', postErr);
    let getUrl = `${cleanUrl}?action=${encodeURIComponent(payload.action)}`;
    if (payload.action === 'saveItem' && payload.item) {
      getUrl += `&item=${encodeURIComponent(JSON.stringify(payload.item))}`;
    } else if (payload.action === 'updateStatus') {
      getUrl += `&id=${encodeURIComponent(payload.id)}&estado=${encodeURIComponent(payload.estado)}`;
    } else if (payload.action === 'deleteItem') {
      getUrl += `&id=${encodeURIComponent(payload.id)}`;
    }
    const getRes = await fetch(getUrl);
    return validate(await getRes.json());
  }
}

async function syncSingleTaskToSheets(task) {
  if (!state.sheetsUrl) return;
  try {
    updateSyncStatus('syncing');
    await sendToSheets({
      action: 'saveItem',
      item: task
    });
    showToast('Guardado confirmado en Google Sheets', 'success');
    updateSyncStatus();
  } catch (err) {
    console.error('Error guardando en Google Sheets:', err);
    showToast('Guardado solo en este dispositivo. Sheets falló: ' + err.message, 'error');
    updateSyncStatus();
  }
}

async function syncWithGoogleSheets(userInitiated = false) {
  if (!state.sheetsUrl) {
    if (userInitiated) {
      showToast('Configura la URL de Apps Script en Ajustes ⚙️', 'info');
      openModal(els.settingsModal);
    }
    return;
  }

  if (!navigator.onLine) {
    if (userInitiated) showToast('No hay conexión a internet para sincronizar', 'error');
    return;
  }

  const cleanUrl = sanitizeSheetsUrl(state.sheetsUrl);

  try {
    state.isSyncing = true;
    updateSyncStatus('syncing');

    // 1. Fetch remote items via GET
    const response = await fetch(`${cleanUrl}?action=getItems`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const result = await response.json();

    if (result && result.success && Array.isArray(result.data)) {
      const remoteItems = result.data;

      // Smart Merge: combine remote items with local items
      const remoteMap = new Map(remoteItems.map(item => [item.id, item]));
      const localMap = new Map(state.tasks.map(item => [item.id, item]));

      // Merge by latest modification
      const allIds = new Set([...remoteMap.keys(), ...localMap.keys()]);
      const mergedList = [];
      const pendingPushToRemote = [];

      allIds.forEach(id => {
        const local = localMap.get(id);
        const remote = remoteMap.get(id);

        if (local && !remote) {
          mergedList.push(local);
          pendingPushToRemote.push(local);
        } else if (!local && remote) {
          mergedList.push(remote);
        } else if (local && remote) {
          const localTime = new Date(local.ultimaModificacion || 0).getTime();
          const remoteTime = new Date(remote.ultimaModificacion || 0).getTime();
          if (localTime >= remoteTime) {
            mergedList.push(local);
            if (localTime > remoteTime) pendingPushToRemote.push(local);
          } else {
            mergedList.push(remote);
          }
        }
      });

      state.tasks = mergedList;
      persistTasksLocal();
      render();

      // If local had unsynced new items, batch send them to Google Sheets
      if (pendingPushToRemote.length > 0) {
        await sendToSheets({
          action: 'batchSync',
          items: pendingPushToRemote
        });
      }

      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      if (userInitiated) {
        showToast('¡Sincronizado con Google Sheets correctamente!', 'success');
      }
    } else {
      throw new Error(result.error || 'Respuesta inválida');
    }
  } catch (err) {
    console.error('Error sincronizando con Google Sheets:', err);
    if (userInitiated) {
      showToast(`Error al sincronizar: ${err.message || 'Verifica la URL'}`, 'error');
    }
  } finally {
    state.isSyncing = false;
    updateSyncStatus();
  }
}

// Settings Handlers
function handleSaveSettings() {
  const url = sanitizeSheetsUrl(els.sheetsScriptUrl.value);
  els.sheetsScriptUrl.value = url;
  state.sheetsUrl = url;
  localStorage.setItem(STORAGE_KEYS.SHEETS_URL, url);
  updateSyncStatus();
  closeModal(els.settingsModal);
  showToast('Configuración guardada', 'success');

  if (url) {
    syncWithGoogleSheets(true);
  }
}

async function handleTestConnection() {
  const rawUrl = els.sheetsScriptUrl.value.trim();
  const url = sanitizeSheetsUrl(rawUrl);
  els.sheetsScriptUrl.value = url;

  if (!url) {
    alert('Ingresa una URL válida de Apps Script (debe terminar en /exec)');
    return;
  }

  try {
    els.btnTestConnection.disabled = true;
    els.btnTestConnection.textContent = 'Probando...';

    const response = await fetch(`${url}?action=getItems`);
    const json = await response.json();

    if (json && json.success) {
      alert(`✅ ¡Conexión Exitosa!\nFilas leídas de Google Sheets: ${json.data ? json.data.length : 0}`);
    } else {
      alert(`⚠️ Respuesta recibida pero con aviso del script: ${json.error || 'Desconocido'}\n\nSi dice "getLastRowNum is not a function", actualiza la implementación en Apps Script a una Nueva Versión.`);
    }
  } catch (err) {
    alert(`❌ No se pudo conectar a Google Sheets.\nMotivo: ${err.message}\n\nAsegúrate de que la implementación en Apps Script esté configurada con Acceso: "Cualquiera" (Anyone).`);
  } finally {
    els.btnTestConnection.disabled = false;
    els.btnTestConnection.textContent = '🔗 Probar Conexión';
  }
}

function handleExportJson() {
  const blob = new Blob([JSON.stringify(state.tasks, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pendientes_camilo_manager_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Render Logic
function render() {
  updateMetricsCounters();

  let filtered = [...state.tasks];

  // 1. Category Filter
  if (state.selectedCategory === 'MINE') {
    filtered = filtered.filter(t => t.asignadoA === state.activeUser);
  } else if (state.selectedCategory === 'BYME') {
    filtered = filtered.filter(t => t.creador === state.activeUser);
  } else if (state.selectedCategory !== 'ALL') {
    filtered = filtered.filter(t => t.categoria === state.selectedCategory);
  }

  // 2. Status Filter
  if (state.selectedStatus !== 'ALL') {
    filtered = filtered.filter(t => t.estado === state.selectedStatus);
  }

  // 3. Search Query
  if (state.searchQuery) {
    const q = state.searchQuery;
    filtered = filtered.filter(t => {
      return (
        (t.titulo && t.titulo.toLowerCase().includes(q)) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(q)) ||
        (t.categoria && t.categoria.toLowerCase().includes(q)) ||
        (t.asignadoA && t.asignadoA.toLowerCase().includes(q)) ||
        (t.creador && t.creador.toLowerCase().includes(q))
      );
    });
  }

  // 4. Sorting
  filtered.sort((a, b) => {
    if (state.sortBy === 'priority') {
      const weight = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
      const wA = weight[a.prioridad] || 2;
      const wB = weight[b.prioridad] || 2;
      if (wB !== wA) return wB - wA;
      return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
    } else if (state.sortBy === 'deadline') {
      if (!a.fechaLimite) return 1;
      if (!b.fechaLimite) return -1;
      return new Date(a.fechaLimite) - new Date(b.fechaLimite);
    } else {
      // Newest
      return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
    }
  });

  // Render cards
  els.taskFeedContainer.innerHTML = '';

  if (filtered.length === 0) {
    els.taskFeedContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <h3 class="empty-title">No hay pendientes aquí</h3>
        <p class="empty-desc">Todo al día o no se encontraron tareas con estos filtros. Pulsa el botón flotante (+) para crear una nueva.</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach(task => {
    fragment.appendChild(createTaskCardElement(task));
  });

  els.taskFeedContainer.appendChild(fragment);
}

function updateMetricsCounters() {
  const urgentCount = state.tasks.filter(t => t.categoria === 'Pendientes Urgentes' && t.estado !== 'Listo').length;
  const mediaCount = state.tasks.filter(t => t.categoria === 'Solicitudes de Videos y Media' && t.estado !== 'Listo').length;
  const mineCount = state.tasks.filter(t => t.asignadoA === state.activeUser && t.estado !== 'Listo').length;
  const ideasCount = state.tasks.filter(t => t.categoria === 'Ideas Vagas' && t.estado !== 'Listo').length;

  els.countUrgent.textContent = urgentCount;
  els.countMedia.textContent = mediaCount;
  els.countMine.textContent = mineCount;
  els.countIdeas.textContent = ideasCount;
}

function createTaskCardElement(task) {
  const card = document.createElement('article');
  card.className = `task-card status-${task.estado.toLowerCase().replace(/\s+/g, '-')}`;
  card.dataset.id = task.id;

  // Category badge class & icon
  let catClass = 'badge-gestion';
  let catIcon = '📋';
  if (task.categoria === 'Pendientes Urgentes') {
    catClass = 'badge-urgente';
    catIcon = '🚨';
  } else if (task.categoria === 'Solicitudes de Videos y Media') {
    catClass = 'badge-media';
    catIcon = '🎥';
  } else if (task.categoria === 'Ideas Vagas') {
    catClass = 'badge-ideas';
    catIcon = '💡';
  }

  // Priority badge class
  const prioClass = `badge-priority-${(task.prioridad || 'media').toLowerCase()}`;

  // Deadline formatting
  let deadlineHtml = '';
  if (task.fechaLimite) {
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.fechaLimite < today && task.estado !== 'Listo';
    const isToday = task.fechaLimite === today;
    
    let text = `📅 ${task.fechaLimite}`;
    if (isToday) text = `🔥 Vence hoy`;
    else if (isOverdue) text = `⚠️ Vencido (${task.fechaLimite})`;

    deadlineHtml = `
      <span class="deadline-tag ${isOverdue ? 'overdue' : ''}">
        ${text}
      </span>
    `;
  }

  // Media Link
  let mediaLinkHtml = '';
  const referenceLink = task.linkReferencia || task.linkMedia;
  if (referenceLink) {
    let cleanUrl = referenceLink;
    try {
      const parsed = new URL(referenceLink);
      cleanUrl = parsed.hostname + parsed.pathname;
    } catch (e) {}

    mediaLinkHtml = `
      <a href="${referenceLink}" target="_blank" rel="noopener noreferrer" class="media-link-card" title="Abrir enlace de referencia">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span>${cleanUrl}</span>
      </a>
    `;
  }

  if (task.linkEntrega) {
    mediaLinkHtml += `<a href="${task.linkEntrega}" target="_blank" rel="noopener noreferrer" class="media-link-card" title="Abrir entrega">✅ Entrega: ${escapeHtml(task.linkEntrega)}</a>`;
  }

  // Assigned me badge highlight
  const isAssignedToActiveUser = task.asignadoA === state.activeUser;
  const isCreatedByActiveUser = task.creador === state.activeUser;

  card.innerHTML = `
    <div class="card-header">
      <div class="card-badges">
        <span class="badge ${catClass}">
          ${catIcon} ${task.categoria}
        </span>
        <span class="badge ${prioClass}">
          ${task.prioridad}
        </span>
      </div>

      <div class="card-menu">
        <button class="card-action-btn edit" title="Editar tarea">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </button>
        <button class="card-action-btn delete" title="Eliminar tarea">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>

    <h3 class="task-title">${escapeHtml(task.titulo)}</h3>
    ${task.descripcion ? `<p class="task-description">${escapeHtml(task.descripcion)}</p>` : ''}
    ${mediaLinkHtml}

    <div class="card-footer">
      <div class="meta-people">
        <span class="person-tag ${isAssignedToActiveUser ? 'assigned-me' : ''}">
          👉 Para: <strong>${escapeHtml(task.asignadoA)}</strong>
        </span>
        <span class="person-tag">
          De: ${escapeHtml(task.creador)}
        </span>
        ${deadlineHtml}
      </div>

      <div class="status-pill-group">
        <button class="status-step-btn ${task.estado === 'Pendiente' ? 'active-pendiente' : ''}" data-state="Pendiente">
          ⏳ Pendiente
        </button>
        <button class="status-step-btn ${task.estado === 'En Proceso' ? 'active-proceso' : ''}" data-state="En Proceso">
          ⚡ En Proceso
        </button>
        <button class="status-step-btn ${task.estado === 'Listo' ? 'active-listo' : ''}" data-state="Listo">
          ✅ Listo
        </button>
      </div>
    </div>
  `;

  // Attach card specific handlers
  card.querySelector('.card-action-btn.edit').addEventListener('click', () => {
    openTaskModalForEdit(task);
  });

  card.querySelector('.card-action-btn.delete').addEventListener('click', () => {
    handleDeleteTask(task.id);
  });

  card.querySelectorAll('.status-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newStatus = btn.dataset.state;
      if (newStatus !== task.estado) {
        handleStatusChange(task.id, newStatus);
      }
    });
  });

  return card;
}

// Utility function to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start application
document.addEventListener('DOMContentLoaded', init);
