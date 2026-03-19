# CLAUDE.md — Harbor by Inmobarco

## Qué es este proyecto
Harbor es la plataforma interna de operaciones inmobiliarias de Inmobarco. Es un frontend SPA construido con Nuxt 3 que consume APIs externas. No tiene backend propio.

## Stack
- **Framework:** Nuxt 3 + Vue 3 + TypeScript
- **Estado:** Pinia (`pinia` + `@pinia/nuxt`)
- **Estilos:** Tailwind CSS v3 (`@nuxtjs/tailwindcss`) + shadcn-vue (manual: `radix-vue`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-vue-next`)
- **Utilidades:** VueUse (`@vueuse/core`)
- **Tipografía:** Quicksand (font-sans), JetBrains Mono (font-mono)
- **Mapa:** Vue Leaflet (`@vue-leaflet/vue-leaflet` + `leaflet`)
- **Calendario:** FullCalendar Vue 3 (`@fullcalendar/vue3` + core, daygrid, timegrid, interaction)
- **Gráficas:** ApexCharts (`vue3-apexcharts` + `apexcharts`)
- **Tablas:** TanStack Table (pendiente de integrar)
- **HTTP:** $fetch nativo de Nuxt
- **Cache:** TanStack Query (`@tanstack/vue-query`)
- **Deploy:** Netlify

## Paleta de colores (Manual de Identidad Inmobarco)
| Color         | Hex       | Uso                  |
|---------------|-----------|----------------------|
| Blanco        | #f1fafe   | Background principal |
| Gris          | #d2d9e0   | Borders, muted       |
| Negro         | #141f21   | Texto, sidebar       |
| Azul          | #48bff7   | Primario, acciones   |
| Azul oscuro   | #1b99d3   | Hover, secundario    |

Los colores están en `tailwind.config.ts` como `harbor-white`, `harbor-gray`, `harbor-black`, `harbor-blue`, `harbor-blue-dark`. También como CSS variables en `assets/css/main.css`.

## Fuentes de datos

### Wasi API
- **URL base:** env `NUXT_PUBLIC_WASI_API_URL`
- **Qué trae:** Propiedades (listado, filtros, coordenadas para mapa)
- **Composable:** `useWasi.ts`
- **Store:** `stores/properties.ts`

### API Propia (VPS + PostgreSQL)
- **URL base:** env `NUXT_PUBLIC_API_BASE_URL`
- **Qué trae:** Citas de asesores, métricas de desempeño, autenticación
- **Composables:** `useAgenda.ts`, `useAdvisors.ts`, `useAuth.ts`
- **Stores:** `stores/agenda.ts`, `stores/advisors.ts`, `stores/auth.ts`

### n8n Webhooks
- **Webhook crear cita:** env `NUXT_PUBLIC_N8N_WEBHOOK_CREATE_APPOINTMENT`
- **Flujo:** Al crear una cita en Agenda, se envía POST al webhook de n8n

## Secciones del MVP
1. **Login** (`pages/login.vue`) — Layout `auth.vue` (sin sidebar). Auth contra API propia.
2. **Dashboard** (`pages/index.vue`) — KPIs, citas próximas, propiedades recientes.
3. **Propiedades** (`pages/propiedades.vue`) — Lista/grid desde Wasi. Filtros. Sin ficha individual aún.
4. **Agenda** (`pages/agenda.vue`) — FullCalendar con citas. Modal para crear → webhook n8n.
5. **Mapa** (`pages/mapa.vue`) — Leaflet con pins de propiedades activas desde Wasi.
6. **Asesores** (`pages/asesores.vue`) — Métricas de desempeño desde API propia.

## Secciones v2 (no implementar aún)
- CRM Pipeline (requiere mapear Wasi CRM primero)
- Indicadores avanzados de asesores

## Arquitectura

### Composables (capa de datos)
Cada composable encapsula la comunicación con una fuente de datos:
- `useWasi()` → propiedades, filtros, coordenadas
- `useAgenda()` → GET/POST citas, webhook n8n
- `useAdvisors()` → métricas por asesor
- `useAuth()` → login, logout, estado sesión

### Stores (estado global con Pinia)
- `properties` → lista, filtros activos, paginación
- `agenda` → citas cargadas, cita seleccionada
- `advisors` → lista de asesores, métricas
- `auth` → user, token, isAuthenticated

### Middleware
- `middleware/auth.ts` → verifica sesión, redirige a `/login` si no autenticado. La página de login usa layout `auth` y no pasa por este middleware.

### Layout
- `layouts/default.vue` → AppShell con sidebar fija a la izquierda + topbar
- `layouts/auth.vue` → Layout limpio centrado para login

## Convenciones de código
- Composables: `use[Nombre].ts` en `composables/`
- Stores: nombre en minúscula singular en `stores/`
- Componentes: PascalCase, agrupados por sección en `components/[seccion]/`
- Types: interfaces en `types/[entidad].ts`
- Variables de entorno: usar `useRuntimeConfig().public.nombreVariable`
- HTTP: usar `$fetch` nativo de Nuxt, no instalar axios

## Diseño
- **Desktop-first.** No es mobile-first. El uso principal es en oficina.
- **Sidebar fija** a la izquierda con navegación.
- **Topbar** con nombre de usuario y acciones.
- **Fuente Quicksand** para todo el UI.
