// Solo se reenvian a Wasi los campos que Harbor permite modificar
const EDITABLE_FIELDS = [
  'for_sale', 'for_rent',
  'area', 'built_area', 'private_area',
  'sale_price', 'rent_price',
  'bedrooms', 'bathrooms', 'garages',
  'stratum', 'tv_share',
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'id de propiedad invalido' })
  }

  const body = await readBody<Record<string, unknown>>(event)
  const fields = Object.fromEntries(
    Object.entries(body || {}).filter(([key, value]) => EDITABLE_FIELDS.includes(key) && value !== undefined)
  )

  const response = await $fetch<{ status: string; message?: string }>(`https://api.wasi.co/v1/property/update/${id}`, {
    method: 'POST',
    body: {
      id_company: config.public.wasiApiId,
      wasi_token: config.public.wasiApiToken,
      ...fields,
    },
  })

  if (response?.status !== 'success') {
    throw createError({ statusCode: 502, statusMessage: response?.message || 'Wasi rechazo la actualizacion' })
  }
  return response
})
