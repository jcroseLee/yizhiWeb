import { describe, expect, it } from 'vitest'
import { getPasswordComplexityError, isPasswordComplex } from '@/lib/utils/passwordPolicy'

describe('passwordPolicy', () => {
  it('rejects short passwords', () => {
    expect(getPasswordComplexityError('Abc12')).toBe('密码至少8位')
    expect(isPasswordComplex('Abc12')).toBe(false)
  })

  it('requires lowercase, uppercase and digits', () => {
    expect(getPasswordComplexityError('ABCDEFG1')).toBe('密码需包含小写字母')
    expect(getPasswordComplexityError('abcdefg1')).toBe('密码需包含大写字母')
    expect(getPasswordComplexityError('Abcdefgh')).toBe('密码需包含数字')
  })

  it('accepts a compliant password', () => {
    expect(getPasswordComplexityError('Abcdef12')).toBeNull()
    expect(isPasswordComplex('Abcdef12')).toBe(true)
  })
})

