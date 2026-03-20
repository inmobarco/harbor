export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  return await $fetch('https://api.wasi.co/v1/property/search', {
    method: 'POST',
    body: {
      id_company: config.public.wasiApiId,
      wasi_token: config.public.wasiApiToken,
      ...body,
    },
  })
})
