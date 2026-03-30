<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventClickArg } from '@fullcalendar/core'

const { calendarEvents, selectAppointment } = useAgenda()

function handleEventClick(info: EventClickArg) {
  selectAppointment(info.event.id)
}

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'twoWeeks',
  views: {
    twoWeeks: {
      type: 'dayGrid',
      duration: { weeks: 2 },
      buttonText: '2 Semanas',
    },
  },
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'twoWeeks,dayGridMonth',
  },
  locale: esLocale,
  firstDay: 0,
  events: calendarEvents.value,
  editable: false,
  droppable: false,
  eventClick: handleEventClick,
  height: 'auto',
  dayMaxEvents: 3,
  eventDisplay: 'block',
}))
</script>

<template>
  <div class="harbor-calendar bg-white rounded-xl border border-harbor-gray p-6">
    <FullCalendar :options="calendarOptions" />
  </div>
</template>

<style>
.harbor-calendar .fc {
  font-family: 'Quicksand', sans-serif;
}

/* Toolbar title */
.harbor-calendar .fc-toolbar-title {
  font-size: 1.25rem !important;
  font-weight: 700 !important;
  color: #141f21;
}

/* Toolbar buttons */
.harbor-calendar .fc-button {
  background-color: #48bff7 !important;
  border-color: #48bff7 !important;
  font-weight: 600 !important;
  font-family: 'Quicksand', sans-serif !important;
  font-size: 0.875rem !important;
  border-radius: 0.5rem !important;
  padding: 0.375rem 0.75rem !important;
  text-transform: capitalize !important;
  box-shadow: none !important;
}

.harbor-calendar .fc-button:hover {
  background-color: #1b99d3 !important;
  border-color: #1b99d3 !important;
}

.harbor-calendar .fc-button:focus {
  box-shadow: 0 0 0 2px rgba(72, 191, 247, 0.3) !important;
}

.harbor-calendar .fc-button-active,
.harbor-calendar .fc-button:active {
  background-color: #1b99d3 !important;
  border-color: #1b99d3 !important;
}

/* Today button when not relevant */
.harbor-calendar .fc-today-button:disabled {
  background-color: #d2d9e0 !important;
  border-color: #d2d9e0 !important;
  color: #141f21 !important;
  opacity: 0.6 !important;
}

/* Column headers (day names) */
.harbor-calendar .fc-col-header-cell {
  background-color: #f8f9fa;
  border-color: #d2d9e0 !important;
  padding: 0.5rem 0 !important;
}

.harbor-calendar .fc-col-header-cell-cushion {
  color: #141f21;
  font-weight: 600;
  font-size: 0.8125rem;
  text-transform: capitalize;
  text-decoration: none !important;
}

/* Day numbers */
.harbor-calendar .fc-daygrid-day-number {
  color: #141f21;
  font-weight: 600;
  font-size: 0.8125rem;
  padding: 0.375rem 0.5rem !important;
  text-decoration: none !important;
}

/* Today highlight */
.harbor-calendar .fc-day-today {
  background-color: rgba(72, 191, 247, 0.06) !important;
}

/* Grid borders */
.harbor-calendar .fc-scrollgrid,
.harbor-calendar .fc-scrollgrid td,
.harbor-calendar .fc-scrollgrid th {
  border-color: #d2d9e0 !important;
}

.harbor-calendar .fc-theme-standard td,
.harbor-calendar .fc-theme-standard th {
  border-color: #d2d9e0 !important;
}

/* Events */
.harbor-calendar .fc-event {
  border-radius: 0.375rem !important;
  padding: 2px 6px !important;
  font-size: 0.8125rem !important;
  font-weight: 600 !important;
  font-family: 'Quicksand', sans-serif !important;
  cursor: pointer !important;
  border: none !important;
  margin-bottom: 2px !important;
}

.harbor-calendar .fc-event:hover {
  opacity: 0.85;
  transform: translateY(-1px);
  transition: all 0.15s ease;
}

.harbor-calendar .fc-event-title {
  font-weight: 600;
}

/* More events link */
.harbor-calendar .fc-daygrid-more-link {
  color: #48bff7;
  font-weight: 600;
  font-size: 0.75rem;
}

/* Remove outer border */
.harbor-calendar .fc-scrollgrid {
  border: none !important;
}

/* Toolbar spacing */
.harbor-calendar .fc-toolbar {
  margin-bottom: 1rem !important;
}

.harbor-calendar .fc-toolbar.fc-header-toolbar {
  gap: 0.5rem;
}

/* Button group spacing */
.harbor-calendar .fc-button-group {
  gap: 0 !important;
}

.harbor-calendar .fc-button-group .fc-button {
  border-radius: 0 !important;
}

.harbor-calendar .fc-button-group .fc-button:first-child {
  border-radius: 0.5rem 0 0 0.5rem !important;
}

.harbor-calendar .fc-button-group .fc-button:last-child {
  border-radius: 0 0.5rem 0.5rem 0 !important;
}

/* Other month days */
.harbor-calendar .fc-day-other .fc-daygrid-day-number {
  opacity: 0.4;
}
</style>
