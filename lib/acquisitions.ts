import { ADVISOR_COLORS } from '~/types/advisor'
import {
  ACQUISITIONS_ROSTER_ROLES,
  type Acquisition,
  type AcquisitionAdvisor,
  type AcquisitionApiRow,
  type AdvisorAcquisitionsRow,
  type WeekRange,
} from '~/types/acquisition'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Semana de lunes a domingo. offset 0 = semana en curso, -1 = semana pasada. */
export function weekRange(offset: number, now = new Date()): WeekRange {
  const daysSinceMonday = (now.getDay() + 6) % 7
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday + offset * 7)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1)

  const label = start.getMonth() === last.getMonth()
    ? `${start.getDate()} – ${last.getDate()} ${MONTHS[last.getMonth()]}`
    : `${start.getDate()} ${MONTHS[start.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`

  return { start, end, label }
}

export function inRange(date: Date, range: { start: Date; end: Date }): boolean {
  return date >= range.start && date < range.end
}

/** Fecha-hora local sin zona, para el parametro `after` de la API */
export function toLocalIso(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

export function formatShortDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

/**
 * acquisition_date puede ser `date` (YYYY-MM-DD) o timestamp. Una fecha sola
 * se interpreta como medianoche local; new Date('YYYY-MM-DD') la tomaria en UTC
 * y en Colombia caeria el dia anterior.
 */
function parseAcquisitionDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(value)
}

function toNumber(value: number | string | null): number | null {
  if (value === null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(' ').trim()
}

export function normalizeAcquisition(row: AcquisitionApiRow): Acquisition {
  return {
    id: row.id,
    date: parseAcquisitionDate(row.acquisition_date),
    userId: row.user_id,
    advisorName: fullName(row.first_name, row.last_name) || 'Sin asesor',
    wasiCode: row.wasi_code,
    unitName: row.unit_name,
    apartmentNumber: row.apartment_number,
    city: row.city,
    businessType: row.business_type,
    salePrice: toNumber(row.sale_price),
    rentPrice: toNumber(row.rent_price),
  }
}

export function normalizeAdvisor(user: any, index: number): AcquisitionAdvisor {
  return {
    id: user.id,
    name: fullName(user.first_name, user.last_name) || user.username,
    color: user.color || ADVISOR_COLORS[index % ADVISOR_COLORS.length],
    role: user.role,
    isActive: user.is_active !== false,
  }
}

function fallbackColor(id: number | null): string {
  return ADVISOR_COLORS[Math.abs(id ?? 0) % ADVISOR_COLORS.length]
}

/**
 * Una fila por asesor con sus captaciones de cada semana. Incluye a los
 * asesores activos del roster aunque no hayan captado, para que se vea quien
 * va en cero. Orden: semana actual, luego semana pasada, luego nombre.
 */
export function buildAdvisorRows(
  acquisitions: Acquisition[],
  roster: AcquisitionAdvisor[],
  current: WeekRange,
  previous: WeekRange,
): AdvisorAcquisitionsRow[] {
  const rosterById = new Map(roster.map(a => [a.id, a]))
  const rows = new Map<string, AdvisorAcquisitionsRow>()

  function rowFor(userId: number | null, name: string): AdvisorAcquisitionsRow {
    const key = userId === null ? `name:${name}` : `id:${userId}`
    let row = rows.get(key)
    if (!row) {
      const known = userId === null ? undefined : rosterById.get(userId)
      row = {
        advisor: {
          id: userId,
          name: known?.name ?? name,
          color: known?.color ?? fallbackColor(userId),
        },
        current: [],
        previous: [],
      }
      rows.set(key, row)
    }
    return row
  }

  for (const a of roster) {
    if (a.isActive && ACQUISITIONS_ROSTER_ROLES.includes(a.role)) rowFor(a.id, a.name)
  }

  for (const acq of acquisitions) {
    if (inRange(acq.date, current)) rowFor(acq.userId, acq.advisorName).current.push(acq)
    else if (inRange(acq.date, previous)) rowFor(acq.userId, acq.advisorName).previous.push(acq)
  }

  return [...rows.values()].sort((a, b) =>
    b.current.length - a.current.length ||
    b.previous.length - a.previous.length ||
    a.advisor.name.localeCompare(b.advisor.name, 'es'),
  )
}

/** Conteo por tipo de negocio, de mayor a menor */
export function countByBusinessType(acquisitions: Acquisition[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>()
  for (const a of acquisitions) {
    const label = a.businessType?.trim() || 'Sin tipo'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatCop(value: number): string {
  return copFormatter.format(value)
}
