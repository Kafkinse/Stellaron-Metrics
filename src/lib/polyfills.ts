// `crypto.randomUUID` only exists in a secure context (HTTPS or localhost).
// When the app is self-hosted over plain HTTP it's missing, which breaks
// profile lookups. `crypto.getRandomValues` IS available over HTTP, so provide
// a spec-compliant v4 fallback built on it.
const c = globalThis.crypto as (Crypto & { randomUUID?: () => string }) | undefined

if (c && typeof c.randomUUID !== 'function' && typeof c.getRandomValues === 'function') {
  c.randomUUID = function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
    const bytes = c.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
}
