export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'id de propiedad invalido' })
  }

  return await $fetch(`https://api.wasi.co/v1/property/get/${id}`, {
    params: {
      id_company: config.public.wasiApiId,
      wasi_token: config.public.wasiApiToken,
    },
  })
})
