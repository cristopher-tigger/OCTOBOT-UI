# Octobot · SaaS Frontend (ALMAV Studio)

Panel unificado para el pipeline de video con IA y la gestión de publicaciones en Metricool.

## Estructura

```
octobot-saas/
├── index.html          ← abre este archivo
├── css/
│   └── styles.css      ← estilos (paleta Alma Quinta)
└── js/
    ├── config.js       ← ⚙️ ÚNICO archivo que editas
    ├── uploader.js     ← módulo: subir video → pipeline
    ├── calendar.js     ← módulo: calendario Metricool
    └── app.js          ← navegación entre vistas
```

## Configuración (solo `js/config.js`)

1. `SUPABASE_URL` y `SUPABASE_ANON_KEY` → Supabase → Project Settings → API.
2. `STORAGE_BUCKET` → ya está en `audio-uploads` (debe ser público).
3. `N8N_BASE` → URL base de tus webhooks de n8n (sin slash final).
4. `PIPELINE_WEBHOOK` → webhook del pipeline (termina en `/pexels-video-test-cris`).

## Checklist de backend (n8n)

Para que el navegador pueda hablar con n8n, activa **Allowed Origins (CORS) = `*`** en:

- ✅ `Webhook` del pipeline (`pexels-video-test-cris`)
- ✅ `Webhook Update Post` (ya lo tiene)
- ✅ `Webhook Delete Post` (ya lo tiene)
- ⚠️ **`Webhook Listar Posts`** → ESTE NO LO TIENE. Agrégalo o el calendario no carga.

## Cómo se usa

- **Subir Video:** arrastra un archivo → se sube a Supabase → dispara el pipeline → ves el avance etapa por etapa → al terminar, link al video final.
- **Calendario:** muestra tus posts del mes. Clic en uno para reprogramar (fecha/hora), cambiar Borrador↔Programado o eliminar.

## Nota sobre "editar"

El flujo de update actual solo cambia fecha/hora y estado (draft). No edita el texto ni la media (el nodo PUT preserva el contenido original). Para editar texto se requiere un ajuste pequeño en el nodo `PUT Metricool`.

## Hosting

Sube la carpeta completa a cualquier hosting estático (Vercel, Netlify, tu Proxmox/nginx). Mantén la estructura de carpetas intacta.
