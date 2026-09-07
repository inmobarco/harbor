import type { Property } from '~/types/property'

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

/**
 * Precio con el que se ordena: el de arriendo si la propiedad se arrienda,
 * si no el de venta.
 */
function priceOf(p: Property): number {
  return num(isTrue(p.for_rent) ? p.rent_price : p.sale_price)
}

/** Municipio alfabetico, y dentro de cada municipio precio de menor a mayor. */
function sortForReport(properties: Property[]): Property[] {
  return [...properties].sort((a, b) => {
    const byCity = (a.city_label || '').localeCompare(b.city_label || '', 'es')
    if (byCity !== 0) return byCity
    return priceOf(a) - priceOf(b)
  })
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

const MONEY = '"$"#,##0'

function header(title: string) {
  return { value: title, ...HEADER_STYLE }
}

/** Columnas del informe general, en el orden en que salen en la hoja. */
function generalColumns() {
  return [
    { header: header('ID'), width: 11, cell: (p: Property) => ({ value: num(p.id_property), type: Number }) },
    { header: header('Referencia'), width: 34, cell: (p: Property) => ({ value: displayRef(p), type: String }) },
    { header: header('Venta'), width: 8, cell: (p: Property) => ({ value: yesNo(isTrue(p.for_sale)), type: String, align: 'center' as const }) },
    { header: header('Arriendo'), width: 10, cell: (p: Property) => ({ value: yesNo(isTrue(p.for_rent)), type: String, align: 'center' as const }) },
    { header: header('Precio venta'), width: 17, cell: (p: Property) => ({ value: isTrue(p.for_sale) ? num(p.sale_price) : undefined, type: Number, format: MONEY }) },
    { header: header('Precio arriendo'), width: 17, cell: (p: Property) => ({ value: isTrue(p.for_rent) ? num(p.rent_price) : undefined, type: Number, format: MONEY }) },
    { header: header('Municipio'), width: 16, cell: (p: Property) => ({ value: p.city_label || '', type: String }) },
    { header: header('Barrio'), width: 22, cell: (p: Property) => ({ value: p.zone_label || '', type: String }) },
    { header: header('Habitaciones'), width: 13, cell: (p: Property) => ({ value: num(p.bedrooms), type: Number, align: 'center' as const }) },
    { header: header('Baños'), width: 9, cell: (p: Property) => ({ value: num(p.bathrooms), type: Number, align: 'center' as const }) },
    { header: header('Área (m²)'), width: 11, cell: (p: Property) => ({ value: num(p.area), type: Number, align: 'center' as const }) },
    { header: header('Garajes'), width: 9, cell: (p: Property) => ({ value: num(p.garages), type: Number, align: 'center' as const }) },
    { header: header('Cuarto útil'), width: 12, cell: (p: Property) => ({ value: yesNo(hasCuartoUtil(p)), type: String, align: 'center' as const }) },
  ]
}

async function toXlsxBlob(properties: Property[]): Promise<Blob> {
  // Import dinamico: la libreria solo entra al bundle cuando se pide el informe.
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  return await writeXlsxFile(sortForReport(properties), {
    columns: generalColumns(),
    sheet: 'Propiedades',
    stickyRowsCount: 1,
  } as any).toBlob()
}

// --- CSV -----------------------------------------------------------------

const CSV_COLUMNS = [
  'id', 'referencia', 'venta', 'arriendo', 'precio_venta', 'precio_arriendo',
  'ciudad', 'barrio', 'habitaciones', 'banos', 'area_m2', 'garajes', 'cuarto_util',
]

function toCsvRow(p: Property): (string | number)[] {
  const forSale = isTrue(p.for_sale)
  const forRent = isTrue(p.for_rent)

  return [
    p.id_property,
    displayRef(p),
    yesNo(forSale),
    yesNo(forRent),
    forSale ? (p.sale_price_label || '') : '',
    forRent ? (p.rent_price_label || '') : '',
    p.city_label || '',
    p.zone_label || '',
    p.bedrooms,
    p.bathrooms,
    p.area,
    p.garages,
    yesNo(hasCuartoUtil(p)),
  ]
}

/** Entrecomilla solo si hace falta, para que Excel siga leyendo los numeros como numeros. */
function escapeCell(value: string | number): string {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function toCsvBlob(properties: Property[]): Blob {
  const lines = [CSV_COLUMNS, ...sortForReport(properties).map(toCsvRow)]
    .map(row => row.map(escapeCell).join(';'))
  // BOM para que Excel respete los acentos
  const csv = '\uFEFF' + lines.join('\r\n')
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

export type ReportFormat = 'xlsx' | 'csv'

export function usePropertyReport() {
  const loading = ref(false)
  const progress = ref({ loaded: 0, total: 0 })
  const error = ref(false)

  /** Informe de todas las propiedades activas, sin importar los filtros en pantalla. */
  async function downloadGeneralReport(format: ReportFormat = 'xlsx') {
    if (loading.value) return

    loading.value = true
    error.value = false
    progress.value = { loaded: 0, total: 0 }

    try {
      const { searchAllProperties } = useWasi()
      const properties = await searchAllProperties(
        { id_status_on_page: 1 },
        { pageSize: 50, onProgress: p => { progress.value = p } }
      )
      const blob = format === 'csv' ? toCsvBlob(properties) : await toXlsxBlob(properties)
      downloadBlob(`informe-general-propiedades-${today()}.${format}`, blob)
    } catch (e) {
      console.error('Error al generar el informe general:', e)
      error.value = true
    } finally {
      loading.value = false
    }
  }

  return { loading, progress, error, downloadGeneralReport }
}
