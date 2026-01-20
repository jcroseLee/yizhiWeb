import crypto from 'crypto';

const WECHAT_PAY_API_BASE = 'https://api.mch.weixin.qq.com'

export type WechatPayScene = 'NATIVE' | 'H5' | 'JSAPI'

export type WechatPayCreateResult =
  | { type: 'NATIVE'; code_url: string }
  | { type: 'H5'; h5_url: string }
  | { type: 'JSAPI'; prepay_id: string; pay_params: WechatJsapiPayParams }

export type WechatJsapiPayParams = {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'RSA'
  paySign: string
}

export type WechatPayConfig = {
  appId: string
  mchId: string
  serialNo: string
  privateKeyPem: string
  apiV3Key: string
}

export function getWechatPayConfig(): WechatPayConfig | null {
  return getWechatPayConfigWithReason().config
}

export function getWechatPayConfigWithReason(): { config: WechatPayConfig | null; reason: string | null } {
  const mchId = (process.env.WECHAT_PAY_MCHID || '').trim()
  const serialNo = (process.env.WECHAT_PAY_SERIAL_NO || '').trim()
  const apiV3Key = (process.env.WECHAT_PAY_API_V3_KEY || '').trim()

  const appId = (process.env.WECHAT_PAY_APPID || process.env.WECHAT_APPID || '').trim()
  const privateKeyPemRaw = (process.env.WECHAT_PAY_PRIVATE_KEY || '').trim()
  const privateKeyPem = resolvePrivateKeyPem(privateKeyPemRaw)

  if (!mchId || !serialNo || !apiV3Key || !appId || !privateKeyPem) {
    const hasAny =
      Boolean(mchId) ||
      Boolean(serialNo) ||
      Boolean(apiV3Key) ||
      Boolean(appId) ||
      Boolean(privateKeyPemRaw)
    if (!hasAny) return { config: null, reason: null }

    if (apiV3Key && Buffer.from(apiV3Key, 'utf8').length !== 32) {
      return { config: null, reason: 'INVALID_API_V3_KEY' }
    }
    if (privateKeyPemRaw && !privateKeyPem) {
      return { config: null, reason: 'INVALID_PRIVATE_KEY' }
    }
    return { config: null, reason: 'MISSING_ENV' }
  }
  if (Buffer.from(apiV3Key, 'utf8').length !== 32) return { config: null, reason: 'INVALID_API_V3_KEY' }

  return { config: { appId, mchId, serialNo, privateKeyPem, apiV3Key }, reason: null }
}

function resolvePrivateKeyPem(input: string) {
  if (!input) return ''
  let raw = input.trim()
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim()
  }

  const cleaned = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw
  const normalized = cleaned.replace(/\r\n/g, '\n').trim()

  const validatePem = (pem: string) => {
    try {
      crypto.createPrivateKey(pem)
      return true
    } catch {
      return false
    }
  }

  if (normalized.includes('BEGIN') && normalized.includes('PRIVATE KEY')) {
    return validatePem(normalized) ? normalized : ''
  }

  const compact = normalized.replace(/\s+/g, '')
  if (!compact || /[^0-9A-Za-z+/=]/.test(compact)) return ''

  let der: Buffer
  try {
    der = Buffer.from(compact, 'base64')
  } catch {
    return ''
  }
  if (!der || der.length < 64) return ''

  const tryDer = (type: 'pkcs8' | 'pkcs1') => {
    try {
      const key = crypto.createPrivateKey({ key: der, format: 'der', type })
      const pem = key.export({ format: 'pem', type: 'pkcs8' }).toString()
      return validatePem(pem) ? pem.trim() : ''
    } catch {
      return ''
    }
  }

  return tryDer('pkcs8') || tryDer('pkcs1') || ''
}

function randomNonce(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)
}

function signWechatPayMessage(privateKeyPem: string, message: string) {
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(message)
  signer.end()
  return signer.sign(privateKeyPem, 'base64')
}

function verifyWechatPayMessage(publicKeyOrCertPem: string, message: string, signatureBase64: string) {
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(message)
  verifier.end()
  return verifier.verify(publicKeyOrCertPem, signatureBase64, 'base64')
}

function buildAuthorizationHeader(config: WechatPayConfig, method: string, url: URL, bodyText: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomNonce(32)
  const canonicalUrl = `${url.pathname}${url.search}`
  const message = `${method}\n${canonicalUrl}\n${timestamp}\n${nonce}\n${bodyText}\n`
  const signature = signWechatPayMessage(config.privateKeyPem, message)
  const token =
    `mchid="${config.mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${config.serialNo}",signature="${signature}"`
  return `WECHATPAY2-SHA256-RSA2048 ${token}`
}

async function wechatPayFetch<T>(
  config: WechatPayConfig,
  method: 'GET' | 'POST',
  pathWithQuery: string,
  body?: unknown
): Promise<T> {
  const url = new URL(pathWithQuery, WECHAT_PAY_API_BASE)
  const bodyText = body === undefined ? '' : JSON.stringify(body)
  const authorization = buildAuthorizationHeader(config, method, url, bodyText)

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: method === 'POST' ? bodyText : undefined
  })

  const text = await res.text()
  let parsed: any = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  if (!res.ok) {
    const msg = typeof (parsed as any)?.message === 'string' ? (parsed as any).message : `WeChat Pay API error (${res.status})`
    const err = new Error(msg)
    ;(err as any).status = res.status
    ;(err as any).details = parsed
    throw err
  }

  return parsed as T
}

function toFen(amountCny: number) {
  const fen = Math.round(amountCny * 100)
  return Number.isFinite(fen) ? fen : NaN
}

export type CreateWechatPayOrderParams = {
  outTradeNo: string
  amountCny: number
  description: string
  notifyUrl: string
  payerClientIp?: string
  redirectUrl?: string
  payerOpenid?: string
  scene?: WechatPayScene
}

export async function createWechatPayOrder(params: CreateWechatPayOrderParams): Promise<WechatPayCreateResult> {
  const { config, reason } = getWechatPayConfigWithReason()
  if (!config) {
    if (reason === 'INVALID_PRIVATE_KEY') throw new Error('WeChat Pay private key is invalid')
    if (reason === 'INVALID_API_V3_KEY') throw new Error('WeChat Pay api v3 key is invalid')
    throw new Error('WeChat Pay is not configured')
  }

  const amountFen = toFen(params.amountCny)
  if (!Number.isFinite(amountFen) || amountFen <= 0) {
    throw new Error('Invalid amount')
  }

  const scene: WechatPayScene =
    params.scene ||
    (params.payerOpenid ? 'JSAPI' : params.redirectUrl ? 'H5' : 'NATIVE')

  if (scene === 'JSAPI') {
    if (!params.payerOpenid) throw new Error('Missing payer openid')

    const payload = {
      appid: config.appId,
      mchid: config.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      amount: { total: amountFen, currency: 'CNY' },
      payer: { openid: params.payerOpenid }
    }

    const resp = await wechatPayFetch<{ prepay_id: string }>(config, 'POST', '/v3/pay/transactions/jsapi', payload)
    const prepayId = String(resp?.prepay_id || '').trim()
    if (!prepayId) throw new Error('Missing prepay_id')

    return { type: 'JSAPI', prepay_id: prepayId, pay_params: createJsapiPayParams(config, prepayId) }
  }

  if (scene === 'H5') {
    const payerIp = (params.payerClientIp || '').trim()
    if (!payerIp) throw new Error('Missing payer client ip')

    const redirectUrl = (params.redirectUrl || '').trim()
    if (!redirectUrl) throw new Error('Missing redirect_url')

    const payload = {
      appid: config.appId,
      mchid: config.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      amount: { total: amountFen, currency: 'CNY' },
      scene_info: {
        payer_client_ip: payerIp,
        h5_info: { type: 'Wap' as const }
      },
      redirect_url: redirectUrl
    }

    const resp = await wechatPayFetch<{ h5_url: string }>(config, 'POST', '/v3/pay/transactions/h5', payload)
    const h5Url = String(resp?.h5_url || '').trim()
    if (!h5Url) throw new Error('Missing h5_url')
    return { type: 'H5', h5_url: h5Url }
  }

  const payload = {
    appid: config.appId,
    mchid: config.mchId,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    amount: { total: amountFen, currency: 'CNY' }
  }
  const resp = await wechatPayFetch<{ code_url: string }>(config, 'POST', '/v3/pay/transactions/native', payload)
  const codeUrl = String(resp?.code_url || '').trim()
  if (!codeUrl) throw new Error('Missing code_url')
  return { type: 'NATIVE', code_url: codeUrl }
}

function createJsapiPayParams(config: WechatPayConfig, prepayId: string): WechatJsapiPayParams {
  const timeStamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = randomNonce(32)
  const pkg = `prepay_id=${prepayId}`
  const message = `${config.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`
  const paySign = signWechatPayMessage(config.privateKeyPem, message)
  return { appId: config.appId, timeStamp, nonceStr, package: pkg, signType: 'RSA', paySign }
}

export type WechatPayTransaction = {
  out_trade_no?: string
  trade_state?: string
  trade_state_desc?: string
  transaction_id?: string
  success_time?: string
  amount?: { total?: number; payer_total?: number; currency?: string; payer_currency?: string }
}

export async function queryWechatPayTransaction(outTradeNo: string): Promise<WechatPayTransaction> {
  const { config, reason } = getWechatPayConfigWithReason()
  if (!config) {
    if (reason === 'INVALID_PRIVATE_KEY') throw new Error('WeChat Pay private key is invalid')
    if (reason === 'INVALID_API_V3_KEY') throw new Error('WeChat Pay api v3 key is invalid')
    throw new Error('WeChat Pay is not configured')
  }
  const escaped = encodeURIComponent(outTradeNo)
  return wechatPayFetch<WechatPayTransaction>(
    config,
    'GET',
    `/v3/pay/transactions/out-trade-no/${escaped}?mchid=${encodeURIComponent(config.mchId)}`
  )
}

export type WechatPayCertificateItem = {
  serial_no: string
  effective_time: string
  expire_time: string
  public_key_pem: string
}

type WechatCertificatesResponse = {
  data?: Array<{
    serial_no: string
    effective_time: string
    expire_time: string
    encrypt_certificate: {
      algorithm: string
      nonce: string
      associated_data: string
      ciphertext: string
    }
  }>
}

function decryptAes256Gcm(apiV3Key: string, nonce: string, associatedData: string, ciphertextBase64: string) {
  const key = Buffer.from(apiV3Key, 'utf8')
  const nonceBuf = Buffer.from(nonce, 'utf8')
  const aad = Buffer.from(associatedData, 'utf8')
  const ciphertext = Buffer.from(ciphertextBase64, 'base64')
  if (ciphertext.length <= 16) throw new Error('Invalid ciphertext')
  const data = ciphertext.subarray(0, ciphertext.length - 16)
  const tag = ciphertext.subarray(ciphertext.length - 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonceBuf)
  decipher.setAAD(aad)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

let platformCertCache:
  | { fetchedAt: number; bySerial: Map<string, WechatPayCertificateItem> }
  | null = null

export async function getWechatPayPlatformCertificate(serialNo: string): Promise<WechatPayCertificateItem | null> {
  const { config, reason } = getWechatPayConfigWithReason()
  if (!config) {
    if (reason === 'INVALID_PRIVATE_KEY') throw new Error('WeChat Pay private key is invalid')
    if (reason === 'INVALID_API_V3_KEY') throw new Error('WeChat Pay api v3 key is invalid')
    throw new Error('WeChat Pay is not configured')
  }

  const now = Date.now()
  if (platformCertCache && now - platformCertCache.fetchedAt < 10 * 60 * 1000) {
    const cached = platformCertCache.bySerial.get(serialNo)
    if (cached) return cached
  }

  const resp = await wechatPayFetch<WechatCertificatesResponse>(config, 'GET', '/v3/certificates')
  const list = Array.isArray(resp?.data) ? resp.data : []
  const bySerial = new Map<string, WechatPayCertificateItem>()

  for (const item of list) {
    const enc = item?.encrypt_certificate
    if (!enc?.ciphertext || !enc?.nonce) continue
    const pem = decryptAes256Gcm(config.apiV3Key, enc.nonce, enc.associated_data || '', enc.ciphertext)
    const pub = crypto.createPublicKey(pem).export({ type: 'spki', format: 'pem' }).toString()
    bySerial.set(String(item.serial_no), {
      serial_no: String(item.serial_no),
      effective_time: String(item.effective_time || ''),
      expire_time: String(item.expire_time || ''),
      public_key_pem: pub
    })
  }

  platformCertCache = { fetchedAt: now, bySerial }
  return bySerial.get(serialNo) || null
}

export function verifyWechatPayCallbackSignature(params: {
  bodyText: string
  timestamp: string
  nonce: string
  signature: string
  publicKeyPem: string
}) {
  const message = `${params.timestamp}\n${params.nonce}\n${params.bodyText}\n`
  return verifyWechatPayMessage(params.publicKeyPem, message, params.signature)
}

export function decryptWechatPayResource(apiV3Key: string, resource: { nonce: string; associated_data: string; ciphertext: string }) {
  return decryptAes256Gcm(apiV3Key, resource.nonce, resource.associated_data || '', resource.ciphertext)
}
