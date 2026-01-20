# 支付宝登录错误码说明

支付宝登录失败时，会重定向到：

`/login?error=<ERROR_CODE>`

登录页会将 `error` 映射为用户可读提示。

## 错误码列表

| 错误码 | 含义 | 建议处理 |
| --- | --- | --- |
| `alipay_not_configured` | 服务端未配置支付宝参数 | 检查 `ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY` |
| `insecure_base_url` | 生产环境回调地址不是 https | 配置 `NEXT_PUBLIC_APP_URL` 为 `https://...` |
| `too_many_attempts` | 短时间内异常次数过多 | 等待 10 分钟后重试 |
| `alipay_invalid_callback` | 回调缺少必要参数（`auth_code/state`） | 重新发起授权 |
| `alipay_csrf` | CSRF 校验失败（state/UA 不一致或过期） | 重新发起授权 |
| `alipay_token_exchange_failed` | 用授权码换 token 失败 | 检查授权码是否过期、应用配置是否正确 |
| `alipay_token_invalid` | token 响应缺少关键字段 | 检查支付宝返回值与 SDK 解析 |
| `supabase_not_configured` | 未配置 Supabase 客户端参数 | 检查 `NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `supabase_link_failed` | 生成登录链接失败 | 检查 `SUPABASE_SERVICE_ROLE_KEY` 权限与 Supabase 状态 |
| `supabase_session_failed` | 建立 Supabase session 失败 | 检查 Supabase Auth 配置与网络状态 |
| `alipay_login_failed` | 未分类的登录失败 | 查看服务端日志定位根因 |

