# English Fluency AI Pro

Proyecto completo listo para ejecutar en local: app web/mobile-first hecha con Angular para practicar speaking diario con frases cortas, CRUD completo, Supabase, Vercel y generación IA con `deepseek-v4-flash`.

## Ejecutar local

```bash
npm install
npm start
```

Abrir:

```text
http://localhost:4200
```

La app funciona en modo local usando `localStorage`, sin necesidad de Supabase ni API key para probarla rápido.

## Funcionalidades incluidas

- Dashboard innovador con métricas.
- CRUD completo de frases.
- CRUD completo de sesiones de speaking.
- Generador de frases con IA usando modelo configurado `deepseek-v4-flash`.
- Temporizador para hablar 2 a 5 minutos.
- Frase actual durante la práctica.
- Favoritos.
- Filtros y búsqueda.
- Perfil de usuario.
- PWA básica / mobile-first.
- Supabase schema con RLS.
- Vercel Function `/api/generate-phrases`.
- Modo fallback local si no existe API key.

## Configurar Supabase

1. Crear proyecto en Supabase.
2. Ejecutar el SQL:

```text
supabase/schema.sql
```

3. Poner URL y ANON KEY en:

```text
src/environments/environment.ts
src/environments/environment.prod.ts
```

## Configurar DeepSeek en Vercel

Variables de entorno:

```env
DEEPSEEK_API_KEY=TU_API_KEY
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-v4-flash
```

> Nota: el frontend nunca debe exponer `DEEPSEEK_API_KEY`. Por eso se incluye función serverless en `/api/generate-phrases`.

## Desplegar en Vercel

```bash
npm run build
```

En Vercel:

- Build command: `npm run vercel-build`
- Output directory: `dist/english-fluency-ai-pro/browser`

## Tema principal de aprendizaje

> Speak in short sentences every day. Avoid trying to sound “advanced.” Fluency grows from simple communication.

Meta diaria:

- Hablar 2–5 minutos.
- Usar frases simples.
- Repetir y cambiar una palabra.
- Guardar la sesión.
- Revisar progreso.
