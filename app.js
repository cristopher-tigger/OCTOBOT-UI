async function renderDashboard() {
  updateNav('galería');
  main.innerHTML = `<div class="container-full" style="padding-top: 6rem;"><div class="video-grid" id="gallery-grid"></div></div>`;
  const grid = document.getElementById('gallery-grid');

  userJobs = await fetchJobs();

  if (userJobs.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 6rem;"><h2 style="margin-bottom: 2rem; color: #fff;">Sin videos aún</h2><button class="btn-primary" onclick="renderUpload()">Generar Video</button></div>`;
    return;
  }

  grid.innerHTML = userJobs.map(job => {
    // Determinar el estado visual del job
    const hasVideo = job.video_url && job.video_url !== 'null' && job.video_url.trim() !== '';
    const status = job.status || 'desconocido';

    // Thumbnail: video real si existe, placeholder si no
    let thumbHtml;
    if (hasVideo) {
      thumbHtml = `<video src="${job.video_url}#t=0.1" preload="metadata" onmouseover="this.play()" onmouseout="this.pause()" muted></video>`;
    } else {
      // Placeholder según el estado
      let statusLabel = 'Procesando...';
      let statusColor = 'var(--primary)';
      if (status === 'done') { statusLabel = 'Listo'; statusColor = 'var(--primary)'; }
      else if (status === 'error' || status === 'failed') { statusLabel = 'Error'; statusColor = '#ff5555'; }
      else if (status === 'rendering') { statusLabel = 'Renderizando...'; statusColor = '#ffaa00'; }
      else if (status === 'queued') { statusLabel = 'En cola...'; statusColor = '#888'; }

      thumbHtml = `
        <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1a1a1a; gap:0.75rem;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
            <line x1="7" y1="2" x2="7" y2="22"></line>
            <line x1="17" y1="2" x2="17" y2="22"></line>
            <line x1="2" y1="12" x2="22" y2="12"></line>
          </svg>
          <span style="color:${statusColor}; font-size:0.8rem; font-weight:600;">${statusLabel}</span>
        </div>
      `;
    }

    return `
      <div class="video-card">
        <div class="video-thumb">
          ${thumbHtml}
        </div>
        <div class="video-content">
          <h3>${job.filename || 'Proyecto de Video'}</h3>
          <button class="nav-link-btn" style="padding-left:0; color: var(--primary);" onclick="renderUpload()">Programar Post</button>
        </div>
      </div>
    `;
  }).join('');
}