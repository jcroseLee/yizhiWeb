import { describe, it, expect } from 'vitest'
import { createVerificationToken, decryptText, encryptText, hashToken } from '../../lib/api/recharge-records'

describe('recharge record security helpers', () => {
  it('encrypts and decrypts text consistently', () => {
    process.env.RECHARGE_ENCRYPTION_KEY = 'test-secret-key'
    const source = 'order-123456'
    const encrypted = encryptText(source)
    expect(encrypted).toBeTruthy()
    const decrypted = decryptText(encrypted || '')
    expect(decrypted).toBe(source)
  })

  it('returns null when decrypting invalid payload', () => {
    process.env.RECHARGE_ENCRYPTION_KEY = 'test-secret-key'
    expect(decryptText('invalid')).toBeNull()
  })

  it('creates verification token and hash deterministically', () => {
    const { token, hash } = createVerificationToken(1)
    expect(token).toHaveLength(48)
    expect(hash).toBe(hashToken(token))
  })
})
