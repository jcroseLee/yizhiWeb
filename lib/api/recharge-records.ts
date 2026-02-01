import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const algorithm = 'aes-256-gcm'

function getDerivedKey() {
  const raw = process.env.RECHARGE_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('Missing RECHARGE_ENCRYPTION_KEY')
  }
  return createHash('sha256').update(raw).digest()
}

export function encryptText(value?: string | null) {
  if (!value) return null
  const iv = randomBytes(12)
  const key = getDerivedKey()
  const cipher = createCipheriv(algorithm, key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

export function decryptText(value?: string | null) {
  if (!value) return null
  const [ivPart, tagPart, encryptedPart] = value.split('.')
  if (!ivPart || !tagPart || !encryptedPart) return null
  const key = getDerivedKey()
  const iv = Buffer.from(ivPart, 'base64')
  const tag = Buffer.from(tagPart, 'base64')
  const encrypted = Buffer.from(encryptedPart, 'base64')
  const decipher = createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function createVerificationToken(ttlMinutes = 5) {
  const token = randomBytes(24).toString('hex')
  const hash = hashToken(token)
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
  return { token, hash, expiresAt }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return null
}
