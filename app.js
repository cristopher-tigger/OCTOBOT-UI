/* ===================================================================
   OCTOBOT - Application Logic
   Alma Quinta © 2026
   =================================================================== */

// CONFIGURACIÓN (NO MODIFICAR SEGÚN REGLA 6)
const SUPABASE_URL = 'https://axemawckmfyfggxjxbyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW1hd2NrbWZ5ZmdneGp4YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDQ2MzQsImV4cCI6MjA5Mjk4MDYzNH0.yAGiZNRYBZ9vlgJ5VebjEM8nnpjfl1fg4uUWpkOrxBs';
const N8N_WEBHOOK_URL = 'https://n8n.almaquinta.com/webhook-test/pexels-video-test-cris';

const STATUS_LABELS = {
  queued: 'En cola',
  transcribing: 'Transcribiendo audio',
  segmenting: 'Analizando escenas',
  searching: 'Buscando en Pexels',
  rendering: 'Ensamblando video',
  done: 'Listo',
  failed: 'Error'
};

const STATUS_PROGRESS = {
  queued: 5, transcribing: 25, segmenting: 50,
  searching: 70, rendering: 90, done: 100, failed: 0
};

let sb = null;
let currentJob = null;
let realtimeChannel = null;

const main = document.getElementById('main');
const statusPill = document.getElementById('status-pill');

// 1. checkConfig
function checkConfig() {
  if (SUPABASE_URL.startsWith('PEGA_AQUI') || SUPABASE_ANON_KEY.startsWith('PEGA_AQUI')) {
    statusPill.textContent = 'Sin configurar';
    statusPill.classList.add('is-error');
    main.innerHTML = `
      <section class="hero">
        <span class="hero-eyebrow">CONFIGURACIÓN PENDIENTE</span>
        <h1 class="hero-title">Falta <span class="accent">conectar</span><br>Supabase.</h1>
        <p class="hero-sub">Edita el archivo <code>app.js</code> y reemplaza las constantes <code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code>.</p>
      </section>
    `;
    return false;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

// 2. renderUpload
function renderUpload(error = null) {
  main.innerHTML = `
    <section class="hero">
      <span class="hero-eyebrow">PIPELINE · AUDIO TO VIDEO</span>
      <h1 class="hero-title">Tu voz, <span class="accent">video</span> en minutos.</h1>
      <p class="hero-sub">Sube un audio narrado y Octobot lo transcribe, lo divide en escenas y genera un video con stock footage relevante automáticamente.</p>
    </section>

    <section class="stage">
      <div id="dropzone" class="dropzone">
        <input type="file" id="file-input" accept="audio/*" style="display:none">
        <div class="dropzone-content">
          <span class="dropzone-icon-wrap">
            <svg viewBox="0 0 24 24"><path d="M12 4v12m0-12l-4 4m4-4l4 4"/><circle cx="12" cy="12" r="10" style="opacity:0.2"/></svg>
          </span>
          <h2 class="dropzone-title">Suelta tu audio aquí</h2>
          <p class="dropzone-hint">o haz clic para seleccionar desde tu equipo</p>
          <span class="dropzone-meta">
            <span>MP3 · WAV · M4A</span>
            <span class="dropzone-meta-sep">·</span>
            <span>Máximo 50 MB</span>
          </span>
        </div>
      </div>

      ${error ? `<div class="error-card" style="margin-top:1.5rem"><div class="error-body"><div class="error-detail">${error}</div></div></div>` : ''}

      <div class="flow">
        <span class="flow-step">01 Sube</span>
        <span class="flow-arrow">→</span>
        <span class="flow-step">02 Transcribe</span>
        <span class="flow-arrow">→</span>
        <span class="flow-step">03 Escenifica</span>
        <span class="flow-arrow">→</span>
        <span class="flow-step">04 Renderiza</span>
        <span class="flow-arrow">→</span>
        <span class="flow-step">05 Descarga</span>
      </div>
    </section>
  `;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-active'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-active'));
  dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('is-active'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
}

// 3. renderUploading
function renderUploading(percent) {
  main.innerHTML = `
    <section class="stage">
      <div class="dropzone is-busy">
        <div class="dropzone-content">
          <span class="spinner"></span>
          <h2 class="dropzone-title">Subiendo ${percent}%</h2>
          <p class="dropzone-hint">Mantén esta ventana abierta</p>
        </div>
      </div>
    </section>
  `;
}

// 4. renderProcessing
function renderProcessing(job) {
  const progress = STATUS_PROGRESS[job.status] || 0;
  const stepsHTML = Object.entries(STATUS_LABELS).filter(([k]) => k !== 'done' && k !== 'failed').map(([key, label], idx) => {
    const isActive = job.status === key;
    const isDone = STATUS_PROGRESS[job.status] > STATUS_PROGRESS[key];
    const cls = isActive ? 'is-active' : (isDone ? 'is-done' : '');
    return `
      <div class="progress-step ${cls}">
        <span class="step-marker"><span class="step-num">${idx + 1}</span></span>
        <span class="step-label">${label}</span>
        ${isActive ? '<span class="step-time">en curso</span>' : ''}
      </div>`;
  }).join('');

  main.innerHTML = `
    <section class="stage">
      <div class="progress-card">
        <div class="progress-head">
          <div class="progress-meta">
            <span class="progress-eyebrow">Procesando</span>
            <span class="progress-id">JOB · ${(job.id || '').slice(0, 8)}</span>
          </div>
          <div class="progress-percent">
            <span class="progress-percent-num">${String(progress).padStart(2, '0')}</span>
            <span class="progress-percent-sym">%</span>
          </div>
          <div class="progress-status">${STATUS_LABELS[job.status]}</div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="progress-steps">${stepsHTML}</div>
      </div>
    </section>
  `;
}

// 5. renderDone
function renderDone(job) {
  let transcriptText = '', audioDuration = '—', wordCount = '—';
  if (job.transcript) {
    try {
      const t = typeof job.transcript === 'string' ? JSON.parse(job.transcript) : job.transcript;
      transcriptText = t.text || '';
      if (t.audio_duration) audioDuration = (t.audio_duration / 1000).toFixed(1) + 's';
      if (t.words) wordCount = t.words.length;
    } catch (e) { transcriptText = '(no se pudo parsear)'; }
  }
  main.innerHTML = `
    <section class="stage">
      <div class="result-card">
        <div class="result-head">
          <div class="result-head-title">
            <span class="result-head-title-icon">✓</span>
            <span>Procesamiento completo</span>
          </div>
          <span class="result-head-meta">${(job.id || '').slice(0, 8)}</span>
        </div>
        <div class="result-section">
          <div class="result-section-title">Transcripción</div>
          <div class="transcript-box">${transcriptText}</div>
        </div>
        <div class="result-section">
          <div class="result-section-title">Detalles</div>
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">Duración audio</span><span class="meta-value">${audioDuration}</span></div>
            <div class="meta-item"><span class="meta-label">Palabras detectadas</span><span class="meta-value">${wordCount}</span></div>
            <div class="meta-item"><span class="meta-label">Filename</span><span class="meta-value">${job.filename || '—'}</span></div>
            <div class="meta-item"><span class="meta-label">Estado</span><span class="meta-value">${job.status}</span></div>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-ghost" onclick="reset()">↻ Subir otro</button>
        </div>
      </div>
    </section>
  `;
}

// 6. renderError
function renderError(job) {
  main.innerHTML = `
    <section class="stage">
      <div class="error-card">
        <div class="error-head">
          <span class="error-tag">ERROR</span>
          <h2 class="error-title">Algo salió mal</h2>
        </div>
        <div class="error-body">
          <div class="error-detail">${job.error_message || 'Error desconocido en el workflow'}</div>
        </div>
        <div class="actions"><button class="btn btn-primary" onclick="reset()">Intentar de nuevo</button></div>
      </div>
    </section>
  `;
}

// 7. handleFile
async function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith('audio/')) return renderUpload('Solo se aceptan archivos de audio.');
  if (file.size > 50 * 1024 * 1024) return renderUpload('El archivo excede 50 MB.');
  try {
    renderUploading(0);
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('audio-uploads').upload(filename, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw new Error(`Upload: ${upErr.message}`);
    renderUploading(100);
    const { data: { publicUrl } } = supabase.storage.from('audio-uploads').getPublicUrl(filename);
    const res = await fetch(N8N_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio_url: publicUrl, filename: file.name }) });
    if (!res.ok) throw new Error(`Webhook ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.job_id) throw new Error('Webhook no devolvió job_id');
    currentJob = { id: data.job_id, status: data.status || 'queued' };
    renderProcessing(currentJob);
    subscribeToJob(currentJob.id);
  } catch (e) { console.error(e); renderUpload(e.message); }
}

// 8. subscribeToJob
function subscribeToJob(jobId) {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase.channel(`job-${jobId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` }, (payload) => {
    currentJob = payload.new;
    handleJobUpdate(currentJob);
  }).subscribe();
  pollJob(jobId);
}

// 9. pollJob
async function pollJob(jobId) {
  if (!currentJob || ['done', 'failed'].includes(currentJob.status)) return;
  try {
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    if (data) { currentJob = data; handleJobUpdate(data); }
  } catch (e) { console.warn('Polling error:', e); }
  if (!['done', 'failed'].includes(currentJob.status)) { setTimeout(() => pollJob(jobId), 5000); }
}

// 10. handleJobUpdate
function handleJobUpdate(job) {
  if (job.status === 'done') { renderDone(job); if (realtimeChannel) supabase.removeChannel(realtimeChannel); }
  else if (job.status === 'failed') { renderError(job); if (realtimeChannel) supabase.removeChannel(realtimeChannel); }
  else { renderProcessing(job); }
}

// 11. reset
function reset() {
  currentJob = null;
  if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
  renderUpload();
}

// 12. Init
if (checkConfig()) renderUpload();
