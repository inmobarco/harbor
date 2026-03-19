# Harbor by Inmobarco

Plataforma interna de operaciones inmobiliarias. Frontend SPA que consume APIs externas (Wasi + API propia en VPS) para gestionar propiedades, citas, asesores y métricas.

## Stack Técnico

- **Framework:** Nuxt 3 + Vue 3 + TypeScript
- **Estado:** Pinia
- **Estilos:** Tailwind CSS v3 + shadcn-vue
- **Utilidades:** VueUse
- **Tipografía:** Quicksand (UI) + JetBrains Mono (código)
- **Mapa:** Vue Leaflet + OpenStreetMap
- **Calendario:** FullCalendar (Vue 3)
- **Gráficas:** ApexCharts (vue3-apexcharts)
- **Cache:** TanStack Query (Vue)
- **Deploy:** Netlify

## Requisitos previos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:3000`.

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores:

```bash
cp .env.example .env
```

Ver `.env.example` para la lista completa de variables necesarias.

## Estructura de carpetas

```
components/     → Componentes Vue organizados por sección
composables/    → Lógica de datos (fetch, CRUD)
stores/         → Estado global con Pinia
types/          → Interfaces TypeScript
middleware/     → Middleware de autenticación
pages/          → Rutas de la app
layouts/        → Layouts (default con sidebar, auth sin sidebar)
plugins/        → Plugins (TanStack Query)
assets/css/     → Estilos globales + variables CSS
```

## Secciones del MVP

| Sección       | Ruta           | Descripción                                |
|---------------|----------------|--------------------------------------------|
| Login         | `/login`       | Autenticación contra API propia            |
| Dashboard     | `/`            | KPIs, citas próximas, propiedades recientes|
| Propiedades   | `/propiedades` | Listado/grid desde Wasi API con filtros    |
| Agenda        | `/agenda`      | Calendario FullCalendar + crear citas      |
| Mapa          | `/mapa`        | Leaflet con pins de propiedades activas    |
| Asesores      | `/asesores`    | Métricas de desempeño por asesor           |

## Fuentes de datos

- **Wasi API** — Propiedades, filtros, coordenadas para mapa
- **API propia (VPS + PostgreSQL)** — Citas, asesores, métricas, autenticación
- **n8n Webhooks** — Se disparan al crear citas

## Paleta de colores

| Color       | Hex       | Uso                  |
|-------------|-----------|----------------------|
| Blanco      | `#f1fafe` | Background principal |
| Gris        | `#d2d9e0` | Borders, muted       |
| Negro       | `#141f21` | Texto, sidebar       |
| Azul        | `#48bff7` | Primario, acciones   |
| Azul oscuro | `#1b99d3` | Hover, secundario    |

## Notas

- **Desktop-first.** El uso principal es en oficina. Los asesores de campo usan una app móvil aparte.
- El proyecto no tiene backend propio — todo se consume desde APIs externas.
