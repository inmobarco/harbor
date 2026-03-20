export function useWasi() {
  async function searchProperties() {
    const response = await $fetch('/api/wasi/properties', {
      method: 'POST',
      body: { short: true },
    })
    return response
  }

  return { searchProperties }
}
