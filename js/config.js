/* =====================================================================
   OCTOBOT · CONFIGURACIÓN CENTRAL
   ---------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas editar.
   Completa tus datos de Supabase y de n8n y guarda.
   ===================================================================== */
window.OCTOBOT_CONFIG = {

  /* ---- SUPABASE (Project Settings → API) ---- */
  SUPABASE_URL:      'https://axemawckmfyfggxjxbyq.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW1hd2NrbWZ5ZmdneGp4YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDQ2MzQsImV4cCI6MjA5Mjk4MDYzNH0.yAGiZNRYBZ9vlgJ5VebjEM8nnpjfl1fg4uUWpkOrxBs',

  /* Bucket de Storage (debe existir y ser público).
     En tu proyecto se llama 'audio-uploads'. */
  STORAGE_BUCKET: 'audio-uploads',

  /* ---- n8n ---- */
  /* URL base de tus webhooks (sin slash final).
     Usa la URL de PRODUCCIÓN del flujo activo. */
  N8N_BASE: 'https://n8n.almaquinta.com/webhook',

  /* Webhook del pipeline de video (debe terminar en /pexels-video-test-cris) */
  PIPELINE_WEBHOOK: 'https://n8n.almaquinta.com/webhook-test/pexels-video-test-cris',

  /* ---- Otros ---- */
  TIMEZONE: 'America/Lima',
  USER_ID:  null,   // opcional, si manejas usuarios
};

/* Endpoints de Metricool derivados de N8N_BASE (no editar) */
window.OCTOBOT_CONFIG.METRICOOL = {
  list:   window.OCTOBOT_CONFIG.N8N_BASE + '/octobot/posts/list',
  update: window.OCTOBOT_CONFIG.N8N_BASE + '/octobot/posts/update',
  delete: window.OCTOBOT_CONFIG.N8N_BASE + '/octobot/posts/delete',
};
