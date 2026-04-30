# Octobot

> Audio in. Video out. Pipeline automatizado de transcripción + segmentación + stock footage.

Frontend de Octobot — interfaz minimalista para subir audios narrados y recibir un video automáticamente generado con material de Pexels sincronizado al audio original.

## Stack

- HTML/CSS/JS vanilla (sin framework, sin bundler)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript) (Storage + Realtime + Postgres)
- Backend: n8n workflow en `n8n.almaquinta.com`
- Hosting: GitHub Pages

## Estructura

```
octobot/
├── index.html       ← estructura
├── styles.css       ← estilos
├── app.js           ← lógica + configuración
├── README.md
└── .gitignore
```

## Configuración

Editá `app.js` y reemplazá las dos constantes con tus datos de Supabase:

```js
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

Las encontrás en: Supabase Dashboard → Project Settings → API.

⚠️ La `anon` key está diseñada para ser pública (frontend). La seguridad real está en las políticas RLS de Supabase, no en ocultarla.

## Deploy con GitHub Pages

1. `git push origin main`
2. En el repo: Settings → Pages → Source: `main` branch, folder `/ (root)`
3. Esperar 1-2 minutos
4. La página queda disponible en `https://tu-usuario.github.io/octobot/`

## Pipeline backend

```
Octobot Frontend (GitHub Pages)
        ↓
   Audio + URL pública
        ↓
n8n Workflow (Pexels Video Pipeline)
   ├── AssemblyAI - transcripción
   ├── Claude - segmentación en escenas
   ├── Pexels - búsqueda de stock footage
   └── Shotstack - render del video final
        ↓
      Supabase
        ↓
   Realtime push → UI actualiza progreso
```

## Licencia

© 2026 Alma Quinta — Todos los derechos reservados.
