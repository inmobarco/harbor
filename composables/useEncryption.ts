export function useEncryption() {
  const config = useRuntimeConfig()
  const key = config.public.encryptionKey as string
  const salt = config.public.encryptionSalt as string
  const keyWithSalt = key + salt

  function xorTransform(input: string, xorKey: string): string {
    let result = ''
    const keyLength = xorKey.length
    for (let i = 0; i < input.length; i++) {
      result += String.fromCharCode(input.charCodeAt(i) ^ xorKey.charCodeAt(i % keyLength))
    }
    return result
  }

  function toUrlSafeBase64(input: string): string {
    return btoa(input)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  function fromUrlSafeBase64(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const padding = base64.length % 4
    if (padding) base64 += '='.repeat(4 - padding)
    return atob(base64)
  }

  function encrypt(propertyId: number | string): string | null {
    if (!key || !salt) return null
    try {
      const encrypted = xorTransform(String(propertyId), keyWithSalt)
      return toUrlSafeBase64(encrypted)
    } catch {
      return null
    }
  }

  function decrypt(encryptedId: string): string | null {
    if (!key || !salt || !encryptedId) return null
    try {
      const decoded = fromUrlSafeBase64(encryptedId)
      return xorTransform(decoded, keyWithSalt)
    } catch {
      return null
    }
  }

  return { encrypt, decrypt }
}
