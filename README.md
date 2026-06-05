# ñañelis AI Pro 🎙️

Plataforma inteligente para practicar fluidez en inglés mediante frases dinámicas y sesiones de speaking cronometradas.

## 🚀 Inicio Rápido

```bash
npm install
npm start
```
Accede a `http://localhost:4200`

## � Desarrollo local con variables de Vercel

Si ya tienes el proyecto creado en [vercel.com](https://vercel.com) con las variables configuradas, puedes traerlas al entorno local en 3 pasos:

```bash
# 1. Vincula esta carpeta a tu proyecto de Vercel (solo la primera vez)
npm run vercel:link

# 2. Descarga las variables de entorno → genera .env.local
npm run vercel:pull

# 3a. Opción A · Frontend solo (rápido, las /api usan modo demo)
npm start

# 3b. Opción B · Frontend + Vercel Functions reales (recomendado)
npm run vercel:dev
```

> 💡 `npm start` ejecuta `set-env.js` automáticamente (`prestart`), que lee `.env.local`
> y regenera `src/environments/environment.ts` con tus valores reales.
>
> 💡 `npm run vercel:dev` levanta Angular **y** los serverless functions de `/api/*`
> en el mismo origen, así puedes probar la generación IA real localmente.

### Flujo cuando agregas/cambias una variable en Vercel

```bash
npm run vercel:pull   # refresca .env.local
npm start             # reinicia el dev server
```

## �🛠️ Configuración (Vercel)

Configura estas variables de entorno en el panel de Vercel:

| Variable | Descripción |
| :--- | :--- |
| `DEEPSEEK_API_KEY` | Clave secreta de DeepSeek para generación IA. |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com/chat/completions` |
| `SUPABASE_URL` | URL de tu proyecto Supabase. |
| `SUPABASE_ANON_KEY` | Clave anónima pública de Supabase. |

## 🌟 Características

- **Generador IA de Frases**: Frases cortas personalizadas por nivel y tema (`/`).
- **Generador IA de Conversaciones / Párrafos**: Diálogos A↔B y párrafos coherentes por subtema (`/conversations`).
- **TTS multi-voz**: Reproducción línea por línea o "Play full" del diálogo con voces diferentes para A y B.
- **Smart Feed**: Interfaz iOS-style con "Silent Refresh".
- **Achievements**: Gestión de frases dominadas (`/mastered`).
- **Mobile First**: Diseño premium optimizado para móviles.
- **PWA**: Instalable como aplicación nativa.

## 🧠 Endpoints serverless (Vercel)

| Ruta | Descripción |
| :--- | :--- |
| `/api/generate-phrases` | Genera frases cortas por tema/nivel/cantidad. |
| `/api/generate-conversation` | Genera diálogo (A/B) o párrafo narrativo por tema/nivel/longitud. |

Ambos caen en **modo demo** automáticamente si no existe `DEEPSEEK_API_KEY`, así la app sigue siendo usable sin claves.

## 🗄️ Migración Supabase

La tabla `conversations` se incluye en [supabase/schema.sql](supabase/schema.sql).
Mientras no apliques la migración, las conversaciones se guardan en `localStorage` (verás un banner amarillo discreto en la UI).

---
*Hecho con ❤️ para mejorar el speaking diario.*
