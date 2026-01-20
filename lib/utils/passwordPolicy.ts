export function getPasswordComplexityError(password: string): string | null {
  const value = password || ''
  if (value.length < 8) return '密码至少8位'
  if (!/[a-z]/.test(value)) return '密码需包含小写字母'
  if (!/[A-Z]/.test(value)) return '密码需包含大写字母'
  if (!/\d/.test(value)) return '密码需包含数字'
  return null
}

export function isPasswordComplex(password: string): boolean {
  return getPasswordComplexityError(password) === null
}

