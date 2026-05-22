async function handleUpload(file) {
  if (!file) return;

  const confirmUpload = confirm(`¿Quieres enviar "${file.name}" a procesamiento en n8n?`);
  if (!confirmUpload) return;

  main.innerHTML = `
    <div class="upload-container" style="text-align: center;">
      <div style="width: 100px; height: 100px; border: 4px solid var(--primary); border-top-color: transparent; border-radius: 50%; margin: 0 auto 2rem; animation: rotate-slow 1s linear infinite;"></div>
      <h2 style="color: #fff;">Subiendo a Supabase...</h2>
      <p style="color: var(--fg-muted);">Tu archivo se está guardando antes de procesarlo.</p>
    </div>
  `;

  try {
    // === PASO 1: SUBIR EL VIDEO A SUPABASE STORAGE ===
    // Generar un nombre único para evitar colisiones
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `uploads/${timestamp}_${safeName}`;

    const { data: uploadData, error: uploadError } = await sb
      .storage
      .from('audio-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error('Error subiendo a Supabase: ' + uploadError.message);
    }

    // === PASO 2: OBTENER LA URL PÚBLICA ===
    const { data: urlData } = sb
      .storage
      .from('audio-uploads')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    if (!publicUrl) {
      throw new Error('No se pudo obtener la URL pública del archivo');
    }

    // Actualizar mensaje de progreso
    main.innerHTML = `
      <div class="upload-container" style="text-align: center;">
        <div style="width: 100px; height: 100px; border: 4px solid var(--primary); border-top-color: transparent; border-radius: 50%; margin: 0 auto 2rem; animation: rotate-slow 1s linear infinite;"></div>
        <h2 style="color: #fff;">Enviando a n8n...</h2>
        <p style="color: var(--fg-muted);">El motor de automatización está procesando tu video.</p>
      </div>
    `;

    // === PASO 3: DISPARAR EL WEBHOOK CON LA URL (JSON, no binario) ===
    const sourceType = file.type.startsWith('video/') ? 'video' : 'audio';

    const response = await fetch(N8N_TRIGGER_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_url: publicUrl,
        source_type: sourceType,
        filename: file.name
      })
    });

    if (response.ok) {
      alert("¡Enviado con éxito! n8n ha comenzado el procesamiento.");
      renderDashboard();
    } else {
      const errText = await response.text();
      throw new Error("Error en el servidor de n8n: " + errText);
    }
  } catch (e) {
    alert("Error: " + e.message);
    renderUpload();
  }
}