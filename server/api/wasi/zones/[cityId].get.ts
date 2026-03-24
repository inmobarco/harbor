export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cityId = getRouterParam(event, 'cityId')

  const response = await $fetch<Record<string, any>>(
    `https://api.wasi.co/v1/location/zones-from-city/${cityId}`, {
      params: {
        id_company: config.public.wasiApiId,
        wasi_token: config.public.wasiApiToken,
      },
    }
  )

  const { status, ...items } = response
  return Object.values(items)
})
