/* ===================================================================
   OCTOBOT - Application Logic v4.0 (Dark Timeline Edition)
   =================================================================== */

const SUPABASE_URL = 'https://axemawckmfyfggxjxbyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW1hd2NrbWZ5ZmdneGp4YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDQ2MzQsImV4cCI6MjA5Mjk4MDYzNH0.yAGiZNRYBZ9vlgJ5VebjEM8nnpjfl1fg4uUWpkOrxBs';
const N8N_CALENDAR_WEBHOOK = 'https://n8n.almaquinta.com/webhook/52778385-f5b1-4770-983f-03617300c3c6';
const N8N_TRIGGER_WEBHOOK = 'https://n8n.almaquinta.com/webhook-test/pexels-video-test-cris';



let sb = null;
let userJobs = [];
let scheduledPosts = [
  { id: 101, text: "Cómo crear videos con IA", date: "2026-05-12", time: "10:00", network: "TikTok", status: "scheduled", media: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" }
];

let calendarViewMode = 'list'; // 'list' or 'grid'

const main = document.getElementById('main');
const modal = document.createElement('div');
modal.className = 'custom-modal';
document.body.appendChild(modal);


async function init() {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  renderLanding();
}

function updateNav(view) {
  document.querySelectorAll('.nav-link-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.toLowerCase() === view.toLowerCase());
  });
  window.scrollTo(0, 0);
}

// 1. LANDING VIEW
function renderLanding() {
  updateNav('home');
  main.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <span class="badge">Octobot Pro</span>
        <h1 class="hero-title">Contenido que escala contigo.</h1>
        <p class="hero-sub">La herramienta definitiva para creadores que valoran su tiempo. De audio a video profesional en segundos.</p>
        <div style="display: flex; gap: 1rem;">
          <button class="btn-primary" onclick="renderUpload()">Nueva Creación</button>
          <button class="nav-link-btn" onclick="renderDashboard()">Galería</button>
        </div>
      </div>
      <div class="timeline-wrap" style="transform: rotate(-1deg);">
         ${scheduledPosts.slice(0, 2).map(post => renderTimelineItem(post)).join('')}
      </div>
    </section>
  `;
}

function renderTimelineItem(post) {
  return `
    <div class="timeline-item" id="post-${post.id}">
      <div class="item-thumb">
        <video src="${post.media}" muted onmouseover="this.play()" onmouseout="this.pause()"></video>
      </div>
      <div class="item-info">
        <div class="item-title">${post.text}</div>
        <div class="item-meta">
          <span class="status-pill status-${post.status}">${post.status === 'scheduled' ? 'Programado' : 'Borrador'}</span>
          ${post.network.toUpperCase()} · ${post.date} · ${post.time}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="editPost(${post.id})">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon delete" onclick="deletePost(${post.id})">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `;
}

// 2. DASHBOARD VIEW (Gallery)
async function fetchJobs() {
  // Primero intentamos Supabase como base de datos de registro
  const { data } = await sb.from('jobs').select('*').order('created_at', { ascending: false });
  return data || [];
}

async function renderDashboard() {
  updateNav('galería');
  main.innerHTML = `<div class="container-full" style="padding-top: 6rem;"><div class="video-grid" id="gallery-grid"></div></div>`;
  const grid = document.getElementById('gallery-grid');
  
  userJobs = await fetchJobs();


  if (userJobs.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 6rem;"><h2 style="margin-bottom: 2rem; color: #fff;">Sin videos aún</h2><button class="btn-primary" onclick="renderUpload()">Generar Video</button></div>`;
    return;
  }

  grid.innerHTML = userJobs.map(job => `
    <div class="video-card">
      <div class="video-thumb">
        <video src="${job.video_url}#t=0.1" preload="metadata" onmouseover="this.play()" onmouseout="this.pause()" muted></video>
      </div>
      <div class="video-content">
        <h3>${job.filename || 'Proyecto de Video'}</h3>
        <button class="nav-link-btn" style="padding-left:0; color: var(--primary);" onclick="renderUpload()">Programar Post</button>
      </div>
    </div>
  `).join('');
}

// 3. TIMELINE / CALENDAR MODULE
const CalendarModule = {
  posts: [],
  async render() {
    updateNav('calendario');
    main.innerHTML = `
      <div class="container-full" style="padding-top: 6rem;">
        <div style="margin-bottom: 4rem; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="font-size: 3rem; font-weight: 800; letter-spacing: -0.04em; color: #fff;">Calendario</h1>
            <p style="color: var(--fg-muted);">Gestiona tus publicaciones conectadas a la base de datos.</p>
          </div>
          <div style="display: flex; gap: 1rem;">
             <div class="nav" style="border: 1px solid var(--line); border-radius: 8px; padding: 2px;">
                <button class="nav-link-btn ${calendarViewMode === 'list' ? 'active' : ''}" onclick="CalendarModule.setView('list')">Lista</button>
                <button class="nav-link-btn ${calendarViewMode === 'grid' ? 'active' : ''}" onclick="CalendarModule.setView('grid')">Cuadrícula</button>
             </div>
             <button class="btn-primary" onclick="renderUpload()">Nueva Publicación</button>
          </div>
        </div>
        <div id="calendar-content"></div>
      </div>
    `;
    await this.fetchPosts();
  },

  async fetchPosts() {
    try {
      const response = await fetch(N8N_CALENDAR_WEBHOOK);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        this.posts = data.map(p => ({
          id: p.id,
          text: p.text || 'Sin título',
          date: p.publicationDate?.dateTime?.split('T')[0] || '2026-05-01',
          time: p.publicationDate?.dateTime?.split('T')[1]?.substring(0, 5) || '00:00',
          network: p.providers?.[0]?.network || 'tiktok',
          status: p.draft ? 'draft' : 'scheduled',
          media: p.media?.[0] || 'https://placehold.co/400x600?text=Octobot+Media'
        }));
      } else {
        throw new Error("Invalid data format from n8n");
      }
    } catch (e) {
      console.warn("N8N fetch failed, falling back to Supabase/Mock:", e);
      // Fallback a Supabase
      const { data: sbData } = await sb.from('posts').select('*').order('publicationDate->dateTime', { ascending: true });
      if (sbData) {
        this.posts = sbData.map(p => ({
          id: p.id,
          text: p.text || 'Sin título',
          date: p.publicationDate?.dateTime?.split('T')[0] || '2026-05-01',
          time: p.publicationDate?.dateTime?.split('T')[1]?.substring(0, 5) || '00:00',
          network: p.providers?.[0]?.network || 'tiktok',
          status: p.draft ? 'draft' : 'scheduled',
          media: p.media?.[0] || 'https://placehold.co/400x600?text=Octobot+Media'
        }));
      } else {
        this.posts = scheduledPosts;
      }
    }
    this.renderContent();
  },


  setView(mode) {
    calendarViewMode = mode;
    this.render();
  },

  renderContent() {
    const container = document.getElementById('calendar-content');
    if (calendarViewMode === 'list') {
      container.innerHTML = `<div class="timeline-wrap">${this.posts.map(p => renderTimelineItem(p)).join('')}</div>`;
    } else {
      container.innerHTML = `
        <div class="calendar-view">
          <div class="calendar-header">
            ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<div class="cal-day-label">${d}</div>`).join('')}
          </div>
          <div class="calendar-grid">
            ${this.renderGridDays()}
          </div>
        </div>
      `;
    }
  },

  renderGridDays() {
    let html = '';
    for (let i = 1; i <= 31; i++) {
      const dayPosts = this.posts.filter(p => parseInt(p.date.split('-')[2]) === i);
      html += `
        <div class="cal-day">
          <span class="cal-num">${i}</span>
          ${dayPosts.map(p => `
            <div class="cal-post" onclick="editPost(${p.id})" style="border-color: ${p.status === 'scheduled' ? 'var(--primary)' : 'var(--accent)'}">
              <span class="post-title">${p.text}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
    return html;
  }
};


// 4. UPLOAD VIEW
function renderUpload() {
  updateNav('home'); // or highlight appropriate
  main.innerHTML = `
    <div class="upload-container">
      <div style="text-align: center; margin-bottom: 4rem;">
        <h1 style="font-size: 3.5rem; font-weight: 800; letter-spacing: -0.04em; color: #fff; margin-bottom: 1rem;">Crear</h1>
        <p style="color: var(--fg-muted);">El primer paso para tu próximo éxito viral.</p>
      </div>
      <div class="dropzone" id="dropzone">
        <input type="file" id="file-input" style="display:none" accept="audio/*,video/*">
        <div style="width: 80px; height: 80px; background: rgba(3, 194, 194, 0.1); color: var(--primary); border-radius: 50%; margin: 0 auto 2rem; display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4m4-10l4-4 4 4m-4-4v12"/></svg>
        </div>
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #fff;">Sube tu archivo</h2>
        <p style="color: var(--fg-muted);">Audio o Video (máx. 50MB)</p>
      </div>
    </div>
  `;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleUpload(e.target.files[0]));
}

// 5. INTERACTIVITY & MODAL
async function editPost(id) {
  const post = CalendarModule.posts.find(p => p.id === id);
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-card" onclick="event.stopPropagation()">
        <h2 style="margin-bottom: 1.5rem; color: #fff;">Editar Publicación</h2>
        <div style="margin-bottom: 1.5rem;">
          <label style="display:block; font-size: 0.8rem; color: var(--fg-muted); margin-bottom: 0.5rem;">Texto del Post</label>
          <textarea id="edit-text" style="width:100%; background: #1a1a1a; border: 1px solid var(--line); border-radius: 8px; color: #fff; padding: 1rem; font-family: var(--font); height: 100px;">${post.text}</textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
          <div>
            <label style="display:block; font-size: 0.8rem; color: var(--fg-muted); margin-bottom: 0.5rem;">Fecha</label>
            <input type="date" id="edit-date" value="${post.date}" style="width:100%; background: #1a1a1a; border: 1px solid var(--line); border-radius: 8px; color: #fff; padding: 0.75rem;">
          </div>
          <div>
            <label style="display:block; font-size: 0.8rem; color: var(--fg-muted); margin-bottom: 0.5rem;">Hora</label>
            <input type="time" id="edit-time" value="${post.time}" style="width:100%; background: #1a1a1a; border: 1px solid var(--line); border-radius: 8px; color: #fff; padding: 0.75rem;">
          </div>
        </div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button class="nav-link-btn" onclick="closeModal()">Cancelar</button>
          <button class="btn-primary" onclick="savePost(${id})">Guardar Cambios</button>
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'block';
}

function closeModal() {
  modal.style.display = 'none';
}

async function savePost(id) {
  const newText = document.getElementById('edit-text').value;
  const newDate = document.getElementById('edit-date').value;
  const newTime = document.getElementById('edit-time').value;

  // Actualización real en Supabase
  const { error } = await sb.from('posts').update({
    text: newText,
    publicationDate: { dateTime: `${newDate}T${newTime}:00` }
  }).eq('id', id);

  if (error) {
    alert("Error al actualizar: " + error.message);
  } else {
    closeModal();
    CalendarModule.render();
  }
}

async function deletePost(id) {
  if (confirm("¿Estás seguro de que quieres eliminar esta publicación de la base de datos?")) {
    const { error } = await sb.from('posts').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else CalendarModule.render();
  }
}


async function handleUpload(file) {
  if (!file) return;
  
  const confirmUpload = confirm(`¿Quieres enviar "${file.name}" a procesamiento en n8n?`);
  if (!confirmUpload) return;

  main.innerHTML = `
    <div class="upload-container" style="text-align: center;">
      <div style="width: 100px; height: 100px; border: 4px solid var(--primary); border-top-color: transparent; border-radius: 50%; margin: 0 auto 2rem; animation: rotate-slow 1s linear infinite;"></div>
      <h2 style="color: #fff;">Enviando a n8n...</h2>
      <p style="color: var(--fg-muted);">Tu archivo está siendo transferido al motor de automatización.</p>
    </div>
  `;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_type', file.type.startsWith('video/') ? 'video' : 'audio');

    const response = await fetch(N8N_TRIGGER_WEBHOOK, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      alert("¡Enviado con éxito! n8n ha comenzado el procesamiento.");
      renderDashboard();
    } else {
      throw new Error("Error en el servidor de n8n");
    }
  } catch (e) {
    alert("Error al conectar con n8n: " + e.message);
    renderUpload();
  }
}


window.renderLanding = renderLanding;
window.renderDashboard = renderDashboard;
window.renderUpload = renderUpload;
window.CalendarModule = CalendarModule;
window.editPost = editPost;
window.deletePost = deletePost;

document.addEventListener('DOMContentLoaded', init);
