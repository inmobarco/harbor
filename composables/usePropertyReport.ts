import type { Property } from '~/types/property'

// --- Lectura de campos ---------------------------------------------------

/** Wasi con short=true devuelve booleanos, precios y medidas como string. */
function isTrue(value: boolean | string | null): boolean {
  return String(value) === 'true'
}

function yesNo(value: boolean): string {
  return value ? 'Sí' : 'No'
}

function num(value: string | number | null | undefined): number {
  return Number(value) || 0
}

function hasCuartoUtil(p: Property): boolean {
  return !!p.tv_share && String(p.tv_share) !== '0'
}

function displayRef(p: Property): string {
  return p.reference || p.registration_number || ''
}

function cityOf(p: Property): string {
  return p.city_label || ''
}

/**
 * Referencia = prefijo de tipo de inmueble (AP, CS, LC, AE...) + numero de apto + unidad.
 * Los prefijos mas largos van primero para que la alternacion no corte de menos (APTO antes que AP).
 */
const REF_PATTERN = /^(?:(?:APTO|APT|AP|AE|CS|CA|LC|OF|BG|LT|PH)\s*)?(\d+[A-Za-z]?)\s*(.*)$/i

/**
 * Parte la referencia en numero de apto y nombre de la unidad.
 *   'AP 1212 Mazzaro'  -> { apto: '1212', unidad: 'Mazzaro' }
 *   'AP 2202 77 Tower' -> { apto: '2202', unidad: '77 Tower' }  (solo el primer numero)
 *   'CS 1'             -> { apto: '1',    unidad: '' }
 * Si no calza el patron no se pierde nada: la referencia entera queda en `unidad`.
 */
function splitRef(p: Property): { apto: string; unidad: string } {
  const raw = displayRef(p).trim().replace(/\s+/g, ' ')
  const m = REF_PATTERN.exec(raw)
  if (!m) return { apto: '', unidad: raw }
  return { apto: m[1], unidad: m[2].trim() }
}

/** El apto va como numero para que Excel lo ordene bien; si trae letra, como texto. */
function aptoCell(apto: string) {
  return /^\d+$/.test(apto)
    ? { value: Number(apto), type: Number, align: 'center' as const }
    : { value: apto, type: String, align: 'center' as const }
}

/** Precio vigente: el de arriendo si la propiedad se arrienda, si no el de venta. */
function priceOf(p: Property): number {
  return num(isTrue(p.for_rent) ? p.rent_price : p.sale_price)
}

/** Mismo criterio que priceOf, pero con la etiqueta ya formateada por Wasi. */
function priceLabelOf(p: Property): string {
  return (isTrue(p.for_rent) ? p.rent_price_label : p.sale_price_label) || ''
}

/**
 * El nombre y el celular del propietario no vienen como campo: estan dentro del
 * comentario interno, en una linea con el formato `Propietario: <nombre>, <celular>`.
 *
 * El ancla al inicio de linea es a proposito. Hay comentarios que mencionan la
 * palabra en texto libre ("el propietario Porta las llaves") o en otro campo de la
 * plantilla ("Llaves: CITA CON LA PROPIETARIO"), y buscar la palabra suelta traeria
 * esa linea en vez del dato real.
 */
const OWNER_LINE = /^[ \t]*propietario[ \t]*:[ \t]*(.*)$/im

function ownerOf(p: Property): { nombre: string; celular: string } {
  const m = OWNER_LINE.exec(p.comment || '')
  if (!m) return { nombre: '', celular: '' }

  const rest = m[1].trim()
  // El celular va despues de la ultima coma; los nombres no traen comas.
  const cut = rest.lastIndexOf(',')
  if (cut < 0) return { nombre: rest, celular: '' }
  return { nombre: rest.slice(0, cut).trim(), celular: rest.slice(cut + 1).trim() }
}

// --- Ordenamientos -------------------------------------------------------

/** Informe general: municipio alfabetico, y dentro de cada uno precio de menor a mayor. */
function sortByCityName(properties: Property[]): Property[] {
  return [...properties].sort((a, b) => {
    const byCity = cityOf(a).localeCompare(cityOf(b), 'es')
    if (byCity !== 0) return byCity
    return priceOf(a) - priceOf(b)
  })
}

/**
 * Informe detallado: primero el municipio donde hay mas propiedades y de ahi hacia
 * abajo; dentro de cada municipio, precio de menor a mayor.
 * El orden se recalcula en cada descarga, no es una lista fija de municipios.
 */
function sortByCityVolume(properties: Property[]): Property[] {
  const count = new Map<string, number>()
  for (const p of properties) count.set(cityOf(p), (count.get(cityOf(p)) || 0) + 1)

  return [...properties].sort((a, b) => {
    const ca = cityOf(a)
    const cb = cityOf(b)
    if (ca !== cb) {
      const byVolume = (count.get(cb) || 0) - (count.get(ca) || 0)
      // Empate de volumen: alfabetico, para que el orden sea estable entre descargas
      return byVolume !== 0 ? byVolume : ca.localeCompare(cb, 'es')
    }
    return priceOf(a) - priceOf(b)
  })
}

// --- Columnas ------------------------------------------------------------

const MONEY = '"$"#,##0'
const CENTER = { align: 'center' as const }

interface ReportColumn {
  /** Encabezado en el .xlsx */
  title: string
  /** Encabezado en el .csv */
  csvTitle: string
  /** Ancho de columna, en caracteres */
  width: number
  cell: (p: Property) => Record<string, unknown>
  csvCell: (p: Property) => string | number
}

/** Una entrada por campo; cada informe elige cuales usa y en que orden. */
const COL = {
  municipio: {
    title: 'Municipio', csvTitle: 'municipio', width: 16,
    cell: p => ({ value: cityOf(p), type: String }),
    csvCell: p => cityOf(p),
  },
  id: {
    title: 'ID', csvTitle: 'id', width: 11,
    cell: p => ({ value: num(p.id_property), type: Number }),
    csvCell: p => p.id_property,
  },
  apto: {
    title: 'Apto', csvTitle: 'apto', width: 9,
    cell: p => aptoCell(splitRef(p).apto),
    csvCell: p => splitRef(p).apto,
  },
  unidad: {
    title: 'Unidad', csvTitle: 'unidad', width: 30,
    cell: p => ({ value: splitRef(p).unidad, type: String }),
    csvCell: p => splitRef(p).unidad,
  },
  venta: {
    title: 'Venta', csvTitle: 'venta', width: 8,
    cell: p => ({ value: yesNo(isTrue(p.for_sale)), type: String, ...CENTER }),
    csvCell: p => yesNo(isTrue(p.for_sale)),
  },
  arriendo: {
    title: 'Arriendo', csvTitle: 'arriendo', width: 10,
    cell: p => ({ value: yesNo(isTrue(p.for_rent)), type: String, ...CENTER }),
    csvCell: p => yesNo(isTrue(p.for_rent)),
  },
  precioVenta: {
    title: 'Precio venta', csvTitle: 'precio_venta', width: 17,
    cell: p => ({ value: isTrue(p.for_sale) ? num(p.sale_price) : undefined, type: Number, format: MONEY }),
    csvCell: p => (isTrue(p.for_sale) ? p.sale_price_label || '' : ''),
  },
  precioArriendo: {
    title: 'Precio arriendo', csvTitle: 'precio_arriendo', width: 17,
    cell: p => ({ value: isTrue(p.for_rent) ? num(p.rent_price) : undefined, type: Number, format: MONEY }),
    csvCell: p => (isTrue(p.for_rent) ? p.rent_price_label || '' : ''),
  },
  /** Columna unica: el de arriendo si la propiedad se arrienda, si no el de venta. */
  precio: {
    title: 'Precio', csvTitle: 'precio', width: 17,
    cell: p => ({ value: priceOf(p) || undefined, type: Number, format: MONEY }),
    csvCell: p => priceLabelOf(p),
  },
  barrio: {
    title: 'Barrio', csvTitle: 'barrio', width: 22,
    cell: p => ({ value: p.zone_label || '', type: String }),
    csvCell: p => p.zone_label || '',
  },
  propietario: {
    title: 'Propietario', csvTitle: 'propietario', width: 24,
    cell: p => ({ value: ownerOf(p).nombre, type: String }),
    csvCell: p => ownerOf(p).nombre,
  },
  celular: {
    // Como texto a proposito: los celulares con indicativo llegan a 13 digitos y
    // Excel los mostraria en notacion cientifica si los tomara como numero.
    title: 'Celular propietario', csvTitle: 'celular_propietario', width: 20,
    cell: p => ({ value: ownerOf(p).celular, type: String }),
    csvCell: p => ownerOf(p).celular,
  },
  habitaciones: {
    title: 'Habitaciones', csvTitle: 'habitaciones', width: 13,
    cell: p => ({ value: num(p.bedrooms), type: Number, ...CENTER }),
    csvCell: p => p.bedrooms,
  },
  banos: {
    title: 'Baños', csvTitle: 'banos', width: 9,
    cell: p => ({ value: num(p.bathrooms), type: Number, ...CENTER }),
    csvCell: p => p.bathrooms,
  },
  area: {
    title: 'Área (m²)', csvTitle: 'area_m2', width: 11,
    cell: p => ({ value: num(p.area), type: Number, ...CENTER }),
    csvCell: p => p.area,
  },
  garajes: {
    title: 'Garajes', csvTitle: 'garajes', width: 9,
    cell: p => ({ value: num(p.garages), type: Number, ...CENTER }),
    csvCell: p => p.garages,
  },
  cuartoUtil: {
    title: 'Cuarto útil', csvTitle: 'cuarto_util', width: 12,
    cell: p => ({ value: yesNo(hasCuartoUtil(p)), type: String, ...CENTER }),
    csvCell: p => yesNo(hasCuartoUtil(p)),
  },
} satisfies Record<string, ReportColumn>

export type ReportKind = 'general' | 'detailed' | 'contacts'
export type ReportFormat = 'xlsx' | 'csv'

interface ReportSpec {
  /** Va en el nombre del archivo: informe-<slug>-<fecha>.<formato> */
  slug: string
  columns: ReportColumn[]
  sort: (properties: Property[]) => Property[]
}

const REPORTS: Record<ReportKind, ReportSpec> = {
  general: {
    slug: 'general-propiedades',
    columns: [
      COL.id, COL.apto, COL.unidad,
      COL.venta, COL.arriendo, COL.precioVenta, COL.precioArriendo,
      COL.municipio, COL.barrio,
      COL.habitaciones, COL.banos, COL.area, COL.garajes, COL.cuartoUtil,
    ],
    sort: sortByCityName,
  },
  detailed: {
    slug: 'detallado-propiedades',
    columns: [
      COL.municipio, COL.id, COL.apto, COL.unidad, COL.precio, COL.barrio,
      COL.habitaciones, COL.banos, COL.area, COL.garajes, COL.cuartoUtil,
    ],
    sort: sortByCityVolume,
  },
  contacts: {
    slug: 'contactos-propietarios',
    columns: [
      COL.id, COL.apto, COL.unidad, COL.precio, COL.municipio, COL.barrio,
      COL.propietario, COL.celular,
    ],
    sort: sortByCityName,
  },
}

// --- Excel ---------------------------------------------------------------

const HEADER_STYLE = {
  fontWeight: 'bold',
  backgroundColor: '#1b99d3',
  textColor: '#ffffff',
  align: 'center',
  alignVertical: 'center',
  wrap: true,
  height: 28,
} as const

async function toXlsxBlob(spec: ReportSpec, properties: Property[]): Promise<Blob> {
  // Import dinamico: la libreria solo entra al bundle cuando se pide el informe.
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const columns = spec.columns.map(c => ({
    header: { value: c.title, ...HEADER_STYLE },
    width: c.width,
    cell: c.cell,
  }))
  return await writeXlsxFile(spec.sort(properties), {
    columns,
    sheet: 'Propiedades',
    stickyRowsCount: 1,
  } as any).toBlob()
}

// --- CSV -----------------------------------------------------------------

/** Entrecomilla solo si hace falta, para que Excel siga leyendo los numeros como numeros. */
function escapeCell(value: string | number): string {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function toCsvBlob(spec: ReportSpec, properties: Property[]): Blob {
  const rows = [
    spec.columns.map(c => c.csvTitle),
    ...spec.sort(properties).map(p => spec.columns.map(c => c.csvCell(p))),
  ]
  // BOM para que Excel respete los acentos
  const csv = '\uFEFF' + rows.map(row => row.map(escapeCell).join(';')).join('\r\n')
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
}

// --- Descarga ------------------------------------------------------------

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function usePropertyReport() {
  const loading = ref(false)
  /** Cual de los dos informes se pidio de ultimas, para ubicar el estado en su boton. */
  const running = ref<ReportKind | null>(null)
  const progress = ref({ loaded: 0, total: 0 })
  const error = ref(false)

  /** Informe de todas las propiedades activas, sin importar los filtros en pantalla. */
  async function downloadReport(kind: ReportKind, format: ReportFormat = 'xlsx') {
    if (loading.value) return

    const spec = REPORTS[kind]
    loading.value = true
    running.value = kind
    error.value = false
    progress.value = { loaded: 0, total: 0 }

    try {
      const { searchAllProperties } = useWasi()
      const properties = await searchAllProperties(
        { id_status_on_page: 1 },
        { pageSize: 50, onProgress: p => { progress.value = p } }
      )
      const blob = format === 'csv' ? toCsvBlob(spec, properties) : await toXlsxBlob(spec, properties)
      downloadBlob(`informe-${spec.slug}-${today()}.${format}`, blob)
    } catch (e) {
      console.error(`Error al generar el informe ${spec.slug}:`, e)
      error.value = true
    } finally {
      loading.value = false
    }
  }

  return { loading, running, progress, error, downloadReport }
}
