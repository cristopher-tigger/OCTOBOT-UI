/* ===================================================================
   OCTOBOT - Application Logic v0.2
   =================================================================== */

const SUPABASE_URL = 'https://axemawckmfyfggxjxbyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW1hd2NrbWZ5ZmdneGp4YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDQ2MzQsImV4cCI6MjA5Mjk4MDYzNH0.yAGiZNRYBZ9vlgJ5VebjEM8nnpjfl1fg4uUWpkOrxBs';
const N8N_WEBHOOK_URL = 'https://n8n.almaquinta.com/webhook-test/pexels-video-test-cris';

const STATUS_LABELS = {
  queued: 'En cola',
  transcribing: 'Transcribiendo',
  segmenting: 'Escenificando',
  searching: 'Buscando b-roll',
  rendering: 'Ensamblando',
  done: 'Completado',
  failed: 'Error'
};

const STATUS_PROGRESS = {
  queued: 5, transcribing: 25, segmenting: 50,
  searching: 70, rendering: 90, done: 100, failed: 0
};

let sb = null;
let currentJob = null;
let realtimeChannel = null;
let userJobs = [];
let currentFile = null;
let currentSourceType = 'audio';
let currentFilter = 'all';

const main = document.getElementById('main');
const topbarActions = document.getElementById('topbar-actions');
const viewTitle = document.getElementById('view-title');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');

// 1. checkConfig
function checkConfig() {
  if (SUPABASE_URL.startsWith('PEGA_AQUI') || SUPABASE_ANON_KEY.startsWith('PEGA_AQUI')) {
    main.innerHTML = `<section class="hero"><h1 class="hero-title">Configuración <span class="accent">pendiente</span>.</h1></section>`;
    return false;
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

// 2. fetchJobs
async function fetchJobs() {
  const { data, error } = await sb
    .from('jobs')
    .select('*')
    .eq('status', 'done')
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
  return data || [];
}

// 3. updateSidebar
function updateSidebar(view) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.innerText.toLowerCase().includes(view.toLowerCase()) || 
        (view === 'dashboard' && btn.innerText.toLowerCase().includes('mis videos')) ||
        (view === 'upload' && btn.innerText.toLowerCase().includes('crear video'))) {
      btn.classList.add('active');
    }
  });
}

// 4. renderDashboard
async function renderDashboard() {
  userJobs = await fetchJobs();
  viewTitle.innerText = 'Mi Galería';
  updateSidebar('dashboard');
  
  const filteredJobs = userJobs.filter(job => {
    if (currentFilter === 'all') return true;
    const isVideo = job.filename?.match(/\.(mp4|mov|webm)$/i);
    return currentFilter === 'video' ? isVideo : !isVideo;
  });

  const totalMinutes = Math.round(userJobs.reduce((acc, job) => {
    try {
      const scenes = typeof job.scenes === 'string' ? JSON.parse(job.scenes) : job.scenes;
      const duration = scenes?.reduce((sAcc, s) => sAcc + (s.duration || 0), 0) || 0;
      return acc + duration;
    } catch (e) { return acc; }
  }, 0) / 60);

  topbarActions.innerHTML = `<button class="btn btn-primary" onclick="renderUpload()">+ Crear nuevo proyecto</button>`;

  if (userJobs.length === 0) {
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>Tu galería está vacía</h3>
        <p>Comienza subiendo un audio o video para generar contenido increíble.</p>
        <button class="btn btn-primary" onclick="renderUpload()">Empezar ahora</button>
      </div>
    `;
    return;
  }

  main.innerHTML = `
    <div class="dashboard-hero">
      <div class="dashboard-summary">
        <div class="summary-item">
          <span class="summary-val">${userJobs.length}</span>
          <span class="summary-lab">Proyectos totales</span>
        </div>
        <div class="summary-sep"></div>
        <div class="summary-item">
          <span class="summary-val">${totalMinutes}m</span>
          <span class="summary-lab">Tiempo generado</span>
        </div>
      </div>

      <div class="filter-bar">
        <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="setFilter('all')">Todos</button>
        <button class="filter-btn ${currentFilter === 'audio' ? 'active' : ''}" onclick="setFilter('audio')">Desde audio</button>
        <button class="filter-btn ${currentFilter === 'video' ? 'active' : ''}" onclick="setFilter('video')">Con video propio</button>
      </div>
    </div>

    <div class="video-grid">
      ${filteredJobs.map(job => {
        const scenes = typeof job.scenes === 'string' ? JSON.parse(job.scenes) : job.scenes;
        const duration = scenes?.reduce((acc, s) => acc + (s.duration || 0), 0) || 0;
        const isVideo = job.filename?.match(/\.(mp4|mov|webm)$/i);
        
        const placeholder = `
          <div class="video-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8M12 17v4M7 8l5 5 5-5"/></svg>
          </div>
        `;

        return `
          <div class="video-card">
            <div class="video-thumb" onclick="renderVideoModal('${job.id}')">
              <span class="type-badge ${isVideo ? 'v-vid' : 'v-aud'}">Video</span>
              ${job.video_url ? `<img src="${job.video_url}#t=0.1" alt="Thumbnail" onerror="this.style.opacity='0'">` : ''}
              ${placeholder}
              <div class="video-overlay">
                <div class="play-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
              </div>
              <span class="video-duration">${Math.round(duration)}s</span>
            </div>
            <div class="video-info">
              <input type="text" class="card-title-input" value="${job.filename || ''}" onchange="updateJobInline('${job.id}', this.value)" placeholder="Sin título">
              <div class="video-meta">
                <span>${timeAgo(job.created_at)}</span>
                <span class="dot">·</span>
                <span>HD</span>
              </div>
              <div class="video-actions">
                <button class="action-btn" onclick="renderVideoModal('${job.id}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Ver
                </button>
                <a href="${job.video_url}" download="${job.filename || 'video'}.mp4" class="action-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </a>
                <button class="action-btn delete" onclick="deleteJob('${job.id}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function setFilter(filter) {
  currentFilter = filter;
  renderDashboard();
}

// 5. renderUpload
function renderUpload(error = null) {
  viewTitle.innerText = 'Nuevo Video';
  updateSidebar('upload');
  topbarActions.innerHTML = '';
  currentFile = null;
  
  main.innerHTML = `
    <section class="hero">
      <h1 class="hero-title">Tu voz, <span class="accent">video</span> en minutos.</h1>
      <p class="hero-sub">Sube un audio narrado o un video propio y Octobot se encarga de lo demás.</p>
    </section>

    <div id="dropzone" class="dropzone">
      <input type="file" id="file-input" accept="audio/*,video/*" style="display:none">
      <div class="dropzone-icon-wrap">
        <svg viewBox="0 0 24 24"><path d="M12 4v12m0-12l-4 4m4-4l4 4"/><circle cx="12" cy="12" r="10" style="opacity:0.2"/></svg>
      </div>
      <h2 class="dropzone-title">Suelta tu archivo aquí</h2>
      <p class="dropzone-hint">Audio (MP3, WAV, M4A) o Video (MP4, MOV, WEBM) hasta 100MB</p>
      ${error ? `<div class="error-detail" style="margin-top:1.5rem; color:var(--error); font-family:var(--mono); font-size:0.8rem;">${error}</div>` : ''}
    </div>
  `;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
}

// 6. renderPreview
async function renderPreview(file, isVertical = false) {
  viewTitle.innerText = 'Vista previa';
  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith('video/');

  main.innerHTML = `
    <div class="preview-container">
      <div class="preview-media">
        ${isVideo ? `<video src="${url}" controls muted></video>` : 
          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`}
      </div>
      
      <div class="preview-info">
        <h2 class="preview-filename">${file.name}</h2>
        <span class="preview-meta">${(file.size / (1024 * 1024)).toFixed(1)} MB · ${isVideo ? 'Video source' : 'Audio only'}</span>
      </div>

      ${isVertical ? `
        <div class="warning-box">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Video vertical detectado. Se recomienda horizontal (16:9) para mejores resultados.</span>
        </div>
      ` : ''}

      <div class="modal-actions" style="justify-content: center;">
        <button class="btn btn-outline" onclick="renderUpload()">Cancelar</button>
        <button class="btn btn-primary" onclick="startUpload()">Generar video</button>
      </div>
    </div>
  `;
}

// 7. handleFile
async function handleFile(file) {
  if (!file) return;
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  
  if (!isVideo && !isAudio) return renderUpload('Formato no soportado.');
  if (file.size > 100 * 1024 * 1024) return renderUpload('El archivo supera los 100MB.');

  currentFile = file;
  currentSourceType = isVideo ? 'video' : 'audio';

  if (isVideo) {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const isVertical = video.videoHeight > video.videoWidth;
      renderPreview(file, isVertical);
    };
    video.src = URL.createObjectURL(file);
  } else {
    renderPreview(file);
  }
}

// 8. startUpload
async function startUpload() {
  if (!currentFile) return;
  const file = currentFile;
  
  try {
    renderProcessing({ status: 'queued' });
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    
    const { error: upErr } = await sb.storage.from('audio-uploads').upload(filename, file);
    if (upErr) throw upErr;

    const { data: { publicUrl } } = sb.storage.from('audio-uploads').getPublicUrl(filename);
    
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        source_url: publicUrl, 
        filename: file.name,
        source_type: currentSourceType
      })
    });
    
    const data = await res.json();
    if (!data.job_id) throw new Error('No job id received');

    currentJob = { id: data.job_id, status: 'queued' };
    subscribeToJob(currentJob.id);
  } catch (e) {
    console.error(e);
    renderUpload(e.message);
  }
}

// 9. renderProcessing
function renderProcessing(job) {
  viewTitle.innerText = 'Procesando';
  topbarActions.innerHTML = '';
  const progress = STATUS_PROGRESS[job.status] || 0;
  const stepsHTML = Object.entries(STATUS_LABELS).filter(([k]) => k !== 'done' && k !== 'failed').map(([key, label], idx) => {
    const isActive = job.status === key;
    const isDone = STATUS_PROGRESS[job.status] > STATUS_PROGRESS[key];
    const cls = isActive ? 'is-active' : (isDone ? 'is-done' : '');
    return `<div class="step ${cls}"><span class="step-num">${idx + 1}</span><span class="step-label">${label}</span></div>`;
  }).join('');

  main.innerHTML = `
    <div class="processing-card">
      <div class="processing-head">
        <div class="processing-percent">${String(progress).padStart(2, '0')}%</div>
        <div class="processing-status">${STATUS_LABELS[job.status]}</div>
      </div>
      <div class="processing-track"><div class="processing-fill" style="width:${progress}%"></div></div>
      <div class="processing-steps">${stepsHTML}</div>
    </div>
  `;
}

// 10. renderVideoModal
function renderVideoModal(jobId) {
  const job = userJobs.find(j => j.id === jobId);
  if (!job) return;

  const scenes = typeof job.scenes === 'string' ? JSON.parse(job.scenes) : job.scenes;
  const duration = Math.round(scenes?.reduce((acc, s) => acc + (s.duration || 0), 0) || 0);

  modalBody.innerHTML = `
    <div class="video-container">
      <video src="${job.video_url}" controls autoplay loop></video>
    </div>
    <div class="modal-footer">
      <div class="modal-info">
        <input type="text" id="edit-name-${job.id}" class="modal-input-name" value="${job.filename || ''}" placeholder="Nombre del video">
        <div class="modal-meta">${duration}s · ${timeAgo(job.created_at)}</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="updateJob('${job.id}')" style="flex:1">Guardar cambios</button>
        <a href="${job.video_url}" download="${job.filename || 'video'}.mp4" class="btn btn-outline">Descargar</a>
        <button class="btn btn-outline btn-danger" onclick="deleteJob('${job.id}')">Eliminar</button>
      </div>
    </div>
  `;
  modal.classList.add('is-open');
}

async function updateJob(jobId) {
  const newName = document.getElementById(`edit-name-${jobId}`).value;
  if (!newName) return alert('El nombre no puede estar vacío');

  try {
    const { error } = await sb.from('jobs').update({ filename: newName }).eq('id', jobId);
    if (error) throw error;
    closeModal();
    renderDashboard();
  } catch (e) {
    alert('Error al actualizar: ' + e.message);
  }
}

async function deleteJob(jobId) {
  if (!confirm('¿Estás seguro de eliminar este video? Esta acción no se puede deshacer.')) return;

  try {
    const { error } = await sb.from('jobs').delete().eq('id', jobId);
    if (error) throw error;
    closeModal();
    renderDashboard();
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  }
}

function closeModal() {
  modal.classList.remove('is-open');
  modalBody.innerHTML = '';
}

// 11. subscribeToJob
function subscribeToJob(jobId) {
  if (realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = sb.channel(`job-${jobId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` }, (payload) => {
      currentJob = payload.new;
      if (currentJob.status === 'done') {
        init();
      } else if (currentJob.status === 'failed') {
        renderUpload(currentJob.error_message);
      } else {
        renderProcessing(currentJob);
      }
    })
    .subscribe();
}

// 12. Utilities
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return `Hace ${Math.floor(interval)} años`;
  interval = seconds / 2592000;
  if (interval > 1) return `Hace ${Math.floor(interval)} meses`;
  interval = seconds / 86400;
  if (interval > 1) return `Hace ${Math.floor(interval)} días`;
  interval = seconds / 3600;
  if (interval > 1) return `Hace ${Math.floor(interval)} horas`;
  interval = seconds / 60;
  if (interval > 1) return `Hace ${Math.floor(interval)} min`;
  return 'Hace unos segundos';
}

function copyLink(url) {
  navigator.clipboard.writeText(url);
  alert('Enlace copiado al portapapeles');
}

function goHome() {
  if (userJobs.length > 0) renderDashboard();
  else renderUpload();
}

// 13. Init
async function init() {
  if (!checkConfig()) return;
  userJobs = await fetchJobs();
  if (userJobs.length > 0) {
    renderDashboard();
  } else {
    renderUpload();
  }
}

document.addEventListener('DOMContentLoaded', init);
async function updateJobInline(jobId, newName) {
  if (!newName) return;
  try {
    const { error } = await sb.from('jobs').update({ filename: newName }).eq('id', jobId);
    if (error) throw error;
  } catch (e) {
    alert('Error al actualizar: ' + e.message);
  }
}

window.goHome = goHome;
window.renderUpload = renderUpload;
window.renderVideoModal = renderVideoModal;
window.updateJob = updateJob;
window.updateJobInline = updateJobInline;
window.deleteJob = deleteJob;
window.closeModal = closeModal;
window.downloadVideo = (url) => window.open(url, '_blank');
