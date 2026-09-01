# Harbor — Inmobarco

> Plataforma interna de operaciones inmobiliarias. SPA frontend que integra propiedades, agenda de citas, asesores y métricas en una sola interfaz.

![Nuxt 3](https://img.shields.io/badge/Nuxt-3-00DC82?logo=nuxt.js&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Deploy](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify&logoColor=white)

---

## Tabla de contenido

- [Descripción](#descripción)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Primeros pasos](#primeros-pasos)
- [Variables de entorno](#variables-de-entorno)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Secciones de la app](#secciones-de-la-app)
- [Fuentes de datos](#fuentes-de-datos)
- [Identidad visual](#identidad-visual)
- [Pendiente / Roadmap](#pendiente--roadmap)

---

## Descripción

Harbor es la plataforma de operaciones internas de Inmobarco. Es un **frontend SPA (sin backend propio)** construido en Nuxt 3 que consume tres fuentes de datos externas: Wasi API (propiedades), una API propia en VPS con PostgreSQL (asesores, citas, autenticación) y webhooks n8n (automatizaciones).

Está diseñado para uso en oficina (**desktop-first**). Los asesores de campo operan desde una app móvil independiente.

---

## Stack tecnológico

### Core

| Tecnología | Versión | Rol |
|---|---|---|
| [Nuxt 3](https://nuxt.com) | ^3.17 | Framework SPA (SSR desactivado) |
| [Vue 3](https://vuejs.org) | latest | UI reactiva (Composition API) |
| [TypeScript](https://www.typescriptlang.org) | ^5.9 | Tipado estático estricto |

### Estado y datos

| Tecnología | Versión | Rol |
|---|---|---|
| [Pinia](https://pinia.vuejs.org) | ^3.0 | Estado global |
| [TanStack Query (Vue)](https://tanstack.com/query) | ^5.92 | Cache y gestión de peticiones |

### Estilos y UI

| Tecnología | Versión | Rol |
|---|---|---|
| [Tailwind CSS](https://tailwindcss.com) | ^3.4 | Utilidades CSS |
| [shadcn-vue](https://www.shadcn-vue.com) | — | Componentes UI (instalación manual) |
| [Radix Vue](https://www.radix-vue.com) | ^1.9 | Primitivos headless (base de shadcn-vue) |
| [Reka UI](https://reka-ui.com) | ^2.9 | Primitivos headless adicionales |
| [class-variance-authority](https://cva.style) | ^0.7 | Variantes de clases |
| [clsx](https://github.com/lukeed/clsx) + [tailwind-merge](https://github.com/dcastil/tailwind-merge) | ^2 / ^3 | Fusión condicional de clases |
| [Lucide Vue Next](https://lucide.dev) | ^0.577 | Iconos |
| Quicksand + JetBrains Mono | — | Tipografías (Google Fonts) |

### Funcionalidades especializadas

| Tecnología | Versión | Rol |
|---|---|---|
| [FullCalendar Vue 3](https://fullcalendar.io) | ^6.1 | Calendario de agenda (day/week/month grid) |
| [Vue Leaflet](https://vue-leaflet.github.io/vue-leaflet) + [Leaflet](https://leafletjs.com) | ^0.10 / ^1.9 | Mapa interactivo OpenStreetMap |
| [vue3-apexcharts](https://apexcharts.com) + ApexCharts | ^1.11 / ^5.10 | Gráficas de desempeño |
| [VueUse](https://vueuse.org) | ^14.2 | Utilidades de composición |

### Infraestructura

| Herramienta | Rol |
|---|---|
| [Netlify](https://netlify.com) | Deploy y hosting |
| [n8n](https://n8n.io) | Automatización via webhooks |
| VPS + PostgreSQL | Backend propio (API externa) |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   Harbor (Nuxt SPA)                  │
│                                                     │
│  pages/ → layouts/ → components/                   │
│       ↓                                             │
│  composables/          stores/ (Pinia)              │
│  ├── useAuth.ts        ├── auth.ts                  │
│  ├── useWasi.ts        ├── properties.ts            │
│  ├── useAgenda.ts      ├── agenda.ts                │
│  ├── useAdvisors.ts    └── advisors.ts              │
│  └── useEncryption.ts                               │
└───────────┬──────────────────────┬──────────────────┘
            │                      │
     ┌──────▼──────┐    ┌──────────▼──────────┐
     │  Wasi API   │    │  API propia (VPS)   │
     │ Propiedades │    │ Auth · Citas · Staff │
     └─────────────┘    └──────────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   n8n Webhooks      │
                        │ Crear cita · Excel  │
                        └─────────────────────┘
```

### Patrones clave

- **Composables como capa de datos** — cada composable encapsula una fuente de datos.
- **Stores Pinia para estado global** — filtros, paginación, sesión, citas activas.
- **Auto-import de componentes** — los componentes UI se importan sin prefijo desde `~/components/ui`.
- **SPA pura** — SSR desactivado; todo el render ocurre en cliente.
- **Cifrado de IDs** — los IDs de propiedades se cifran con XOR + base64 para URLs externas (`useEncryption.ts`).
- **Autenticación por middleware global** — `middleware/auth.global.ts` protege todas las rutas excepto `/login`.

---

## Primeros pasos

### Requisitos

- Node.js 18+
- npm

### Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd harbor

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores reales

# 4. Iniciar en desarrollo
npm run dev
```

La app estará disponible en `http://localhost:3000`.

### Comandos disponibles

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run preview    # Preview del build
npm run generate   # Generar sitio estático
```

---

## Variables de entorno

Copiar `.env.example` a `.env` y completar todos los valores antes de iniciar.

```env
# ─── Wasi API (propiedades) ───────────────────────────
NUXT_PUBLIC_WASI_API_URL=https://api.wasi.co/v1
NUXT_PUBLIC_WASI_API_TOKEN=
NUXT_PUBLIC_WASI_API_ID=

# ─── API propia VPS (auth, citas, asesores) ───────────
NUXT_PUBLIC_API_BASE_URL=https://tu-vps.com/api
NUXT_PUBLIC_API_TOKEN=

# ─── n8n Webhooks ─────────────────────────────────────
NUXT_PUBLIC_N8N_WEBHOOK_CREATE_APPOINTMENT=
NUXT_PUBLIC_N8N_WEBHOOK_ADD_ROW=

# ─── Cifrado de IDs de propiedades ────────────────────
NUXT_PUBLIC_ENCRYPTION_KEY=
NUXT_PUBLIC_ENCRYPTION_SALT=

# ─── Ficha de propiedad externa ───────────────────────
NUXT_PUBLIC_CARD_URL=

# ─── App ──────────────────────────────────────────────
NUXT_PUBLIC_APP_NAME=Harbor
NUXT_PUBLIC_APP_ENV=development
```

---

## Estructura del proyecto

```
harbor/
├── assets/
│   └── css/main.css          # Variables CSS, Tailwind directives, fuentes
├── components/
│   ├── ui/                   # shadcn-vue: Button, Card, Dialog, Input, Select…
│   ├── layout/               # AppShell, AppSidebar, AppTopbar
│   ├── properties/           # PropertyCard, PropertiesGrid, PropertiesTable, FilterPanel
│   ├── agenda/               # Calendar, AppointmentModal, AppointmentDetails, WeeklySummary…
│   ├── dashboard/            # KpiCard, RecentProperties, UpcomingAppointments
│   ├── map/                  # PropertyMap, PropertyPin, PropertyPopup
│   └── advisors/             # AdvisorCard, AdvisorPerformance, PerformanceChart
├── composables/
│   ├── useAuth.ts            # Login / logout contra API propia
│   ├── useWasi.ts            # Búsqueda de propiedades y zonas (Wasi API)
│   ├── useAgenda.ts          # Asesores, citas y webhook de creación (n8n)
│   ├── useAdvisors.ts        # [TODO] Métricas de asesores
│   └── useEncryption.ts      # Cifrado XOR + base64 para IDs de propiedades
├── layouts/
│   ├── default.vue           # AppShell: sidebar fija + topbar
│   └── auth.vue              # Layout limpio centrado (login)
├── lib/
│   └── utils.ts              # cn() helper (clsx + tailwind-merge)
├── middleware/
│   └── auth.global.ts        # Protege todas las rutas; redirige a /login si no autenticado
├── pages/
│   ├── index.vue             # Dashboard
│   ├── login.vue             # Login
│   ├── propiedades/index.vue # Listado de propiedades
│   ├── agenda.vue            # Calendario de citas
│   ├── mapa.vue              # Mapa de propiedades
│   └── asesores.vue          # Métricas de asesores
├── plugins/
│   └── vue-query.ts          # TanStack Query (staleTime: 5 min)
├── public/
│   ├── favicon.svg
│   ├── isotipo.png
│   └── logo.png
├── stores/
│   ├── auth.ts               # Sesión (token + user en localStorage)
│   ├── properties.ts         # Lista, filtros, paginación, búsqueda por referencia
│   ├── agenda.ts             # Asesores, citas, visibilidad por asesor
│   └── advisors.ts           # [TODO] Métricas de asesores
├── types/
│   ├── auth.ts               # User, LoginPayload, LoginResponse
│   ├── property.ts           # Property, PropertyFilters, WasiPropertySearchResponse
│   ├── appointment.ts        # Appointment, CreateAppointmentPayload, AppointmentType/Status
│   └── advisor.ts            # Advisor, AdvisorMetrics, ADVISOR_COLORS
├── nuxt.config.ts
├── tailwind.config.ts
└── .env.example
```

---

## Secciones de la app

| Sección | Ruta | Estado | Descripción |
|---|---|---|---|
| **Login** | `/login` | ✅ Completo | Auth por usuario/contraseña contra API propia |
| **Dashboard** | `/` | 🚧 En progreso | KPIs, citas próximas, propiedades recientes |
| **Propiedades** | `/propiedades` | ✅ Completo | Listado/grid desde Wasi, filtros, paginación, búsqueda por referencia, ficha externa cifrada |
| **Agenda** | `/agenda` | ✅ Completo | FullCalendar con citas por asesor, modal de creación, resumen semanal, filtro por asesor |
| **Mapa** | `/mapa` | 🚧 En progreso | Leaflet con pins de propiedades activas desde Wasi |
| **Asesores** | `/asesores` | 🚧 En progreso | Métricas de desempeño por asesor con gráficas ApexCharts |

---

## Fuentes de datos

### Wasi API

- **Variables:** `NUXT_PUBLIC_WASI_API_URL`, `NUXT_PUBLIC_WASI_API_TOKEN`, `NUXT_PUBLIC_WASI_API_ID`
- **Composable:** `useWasi.ts`
- **Store:** `stores/properties.ts`
- **Endpoints usados:**
  - `POST /api/wasi/properties` — búsqueda con filtros
  - `GET /api/wasi/zones/{cityId}` — zonas por ciudad

### API Propia (VPS + PostgreSQL)

- **Variable:** `NUXT_PUBLIC_API_BASE_URL`
- **Autenticación:** Bearer token (almacenado en localStorage como `harbor_token`)
- **Composables:** `useAuth.ts`, `useAgenda.ts`, `useAdvisors.ts`
- **Stores:** `stores/auth.ts`, `stores/agenda.ts`, `stores/advisors.ts`
- **Endpoints usados:**
  - `POST /login` — autenticación
  - `GET /staff/users` — listado de asesores
  - `GET /staff/appointments` — listado de citas

### n8n Webhooks

- **Variables:** `NUXT_PUBLIC_N8N_WEBHOOK_CREATE_APPOINTMENT`, `NUXT_PUBLIC_N8N_WEBHOOK_ADD_ROW`
- **Flujo crear cita:** formulario → `POST` al webhook → n8n registra en la base de datos y notifica
- **Flujo agregar fila:** desde `PropertyCard` → `POST` al webhook → n8n agrega a hoja de Excel

---

## Identidad visual

### Paleta de colores

| Nombre | Hex | Token Tailwind | Uso |
|---|---|---|---|
| Blanco | `#f1fafe` | `harbor-white` | Background principal |
| Gris | `#d2d9e0` | `harbor-gray` | Borders, elementos muted |
| Negro | `#141f21` | `harbor-black` | Texto, sidebar |
| Azul | `#48bff7` | `harbor-blue` | Acciones primarias, CTA |
| Azul oscuro | `#1b99d3` | `harbor-blue-dark` | Hover, estados secundarios |

Los tokens están definidos en `tailwind.config.ts` y como variables CSS en `assets/css/main.css` (formato HSL para compatibilidad con shadcn-vue).

### Tipografía

- **UI general:** Quicksand (`font-sans`)
- **Código / mono:** JetBrains Mono (`font-mono`)

---

## Pendiente / Roadmap

### MVP — Completar secciones en progreso

- [ ] **Dashboard** — implementar KpiCard con datos reales de API, widget de citas próximas, widget de propiedades recientes
- [ ] **Mapa** — integrar `PropertyMap.vue` con Leaflet; mostrar pins de propiedades activas desde Wasi con popup de detalle
- [ ] **Asesores** — conectar `useAdvisors.ts` y `stores/advisors.ts` con la API; implementar gráficas de desempeño en `PerformanceChart.vue`

### Deuda técnica

- [ ] **Revisitar TanStack Query** — el plugin `plugins/vue-query.ts` está registrado (staleTime 5 min) pero ningún store lo usa todavía. `stores/properties.ts` implementa su propio cache manual (clave de request + TTL + dedup de peticiones en vuelo) para precargar propiedades desde `layouts/default.vue`. Evaluar migrar ese store — y luego `agenda` y `advisors` — a `useQuery`/`prefetchQuery` para tener cache multi-clave, invalidación y refetch en background sin código a mano.

### v2 — Funcionalidades futuras

- [ ] **CRM Pipeline** — pipeline de oportunidades (requiere mapear Wasi CRM primero)
- [ ] **Indicadores avanzados de asesores** — proyecciones, comparativas históricas
- [ ] **Ficha individual de propiedad** — página `/propiedades/[id]` con detalle completo
- [ ] **Notificaciones** — alertas de citas próximas en tiempo real

---

## Notas de desarrollo

- **No instalar axios.** Usar `$fetch` nativo de Nuxt para todas las peticiones HTTP.
- **No activar SSR.** El proyecto es SPA puro; mantener `ssr: false` en `nuxt.config.ts`.
- **Variables de entorno** siempre via `useRuntimeConfig().public.nombreVariable`.
- **Componentes nuevos de UI** seguir el patrón de shadcn-vue en `components/ui/[nombre]/`.
- **Desktop-first.** No hay requerimiento de diseño responsive para pantallas pequeñas en el MVP.
