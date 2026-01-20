# 支付宝登录集成指南（Web）

本指南描述如何在本项目中启用与验证支付宝登录能力。

## 1. 前置准备

1) 在支付宝开放平台创建应用并开通网页授权相关能力  
2) 配置授权回调域名（需与实际生成的回调 URL 域名一致）  
3) 准备应用私钥与支付宝公钥

## 2. 环境变量配置

在运行环境中配置：

```bash
ALIPAY_APP_ID=your-alipay-app-id
ALIPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

NEXT_PUBLIC_APP_URL=https://your-domain.com

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. 前端接入方式

登录页的“支付宝”按钮会跳转到发起授权接口：

```ts
const redirect = '/profile'
window.location.href = `/api/auth/alipay/start?redirect=${encodeURIComponent(redirect)}`
```

成功登录后会回跳到 `redirect` 指定的站内路径（默认 `/`）。

## 4. 服务端流程说明

- `/api/auth/alipay/start`：
  - 生成 `state` 并写入 `HttpOnly` Cookie（CSRF 防护）
  - 302/307 重定向到支付宝授权页
- `/api/auth/alipay/callback`：
  - 校验 `state` Cookie + UA 哈希
  - 兑换 token + 拉取用户信息
  - 建立 Supabase Cookie Session
  - 写入 `profiles`（昵称、头像、最后登录时间等）

详细接口定义见 [ALIPAY_LOGIN_API.md](file:///Users/huanhuanli/Code/trae_liuyao/yizhi/web/ALIPAY_LOGIN_API.md)。

## 5. 兼容性与健壮性测试建议

### 设备与浏览器

- iOS：Safari / 微信内置浏览器 / 支付宝内置浏览器
- Android：Chrome / 系统 WebView / 微信内置浏览器 / 支付宝内置浏览器
- 桌面端：Chrome / Safari / Edge

### 异常场景（可模拟）

- 回调缺少 `auth_code/state`：访问 `/api/auth/alipay/callback` 或构造缺参 URL
- CSRF 失败：修改 `state` 参数，或清空 Cookie 后访问回调
- Token 兑换失败：使用过期/重复的 `auth_code`
- Supabase 失败：临时移除 `SUPABASE_SERVICE_ROLE_KEY` 或配置错误
- 频控阻断：在 10 分钟内连续失败 5 次后应提示 `too_many_attempts`

### 性能验证（目标：< 500ms）

建议在生产环境观察以下耗时点：

- `alipay.system.oauth.token` 网络耗时
- `alipay.user.info.share` 网络耗时
- Supabase `verifyOtp` 建立会话耗时

回调接口会返回 `Server-Timing` 头（即使是重定向响应也可在网络面板看到），用于拆分上述耗时。

若需要进一步压缩时延，优先从减少外部请求与优化网络连通性入手（例如同地域部署）。
