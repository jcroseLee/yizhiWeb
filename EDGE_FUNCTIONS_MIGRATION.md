# Edge Functions 迁移指南

本文档说明如何将 Supabase Edge Functions 迁移到 Next.js API Routes。

## 迁移完成

所有 Edge Functions 已成功迁移到 Next.js API Routes。以下是迁移后的 API 端点：

### 已迁移的函数

1. **wechat-login** → `/api/wechat-login`
2. **consultation-submit-review** → `/api/consultation-submit-review`
3. **consultation-complete** → `/api/consultation-complete`
4. **consultation-master-respond** → `/api/consultation-master-respond`
5. **consultation-settlement-worker** → `/api/consultation-settlement-worker`
6. **create-consultation-order** → `/api/create-consultation-order`
7. **update-note** → `/api/update-note`
8. **save-record** → `/api/save-record`
9. **send-system-message** → `/api/send-system-message`
10. **get-users** → `/api/get-users`
11. **wechat-bind-phone** → `/api/wechat-bind-phone`
12. **content-moderation-check** → `/api/content-moderation-check`
13. **risk-control-check** → `/api/risk-control-check`
14. **diagnose-openid** → `/api/diagnose-openid`

## 环境变量配置

### 必需的环境变量

在 `.env.local` 文件中添加以下环境变量：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 微信配置
WECHAT_APPID=your_wechat_appid
WECHAT_APPSECRET=your_wechat_appsecret
```

### 部署平台环境变量

如果部署到 Vercel 或其他平台，需要在平台的环境变量设置中添加上述变量。

**重要**：`SUPABASE_SERVICE_ROLE_KEY` 是敏感信息，不要暴露给客户端。确保它只在服务端使用。

## API 调用方式

### 之前（Supabase Edge Functions）

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/wechat-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ code, userInfo })
})
```

### 现在（Next.js API Routes）

```typescript
const response = await fetch('/api/wechat-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ code, userInfo })
})
```

## 主要变化

### 1. 代码结构

- **之前**：`Deno.serve(async (req) => { ... })`
- **现在**：`export async function POST(request: NextRequest) { ... }`

### 2. 环境变量

- **之前**：`Deno.env.get('SUPABASE_URL')`
- **现在**：`process.env.NEXT_PUBLIC_SUPABASE_URL` 或 `process.env.SUPABASE_URL`

### 3. 响应格式

- **之前**：`new Response(JSON.stringify(data), { headers, status })`
- **现在**：`NextResponse.json(data, { headers, status })`

### 4. 导入方式

- **之前**：`import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
- **现在**：`import { createClient } from '@supabase/supabase-js'`

### 5. CORS 处理

- **之前**：手动处理 OPTIONS 请求
- **现在**：使用 `export async function OPTIONS()` 处理

## 共享工具

### Supabase 管理员客户端

创建了共享工具文件 `lib/api/supabase-admin.ts`：

- `createSupabaseAdmin()` - 创建管理员客户端（使用 Service Role Key）
- `createSupabaseWithToken(token)` - 创建带用户 token 的客户端（用于 RLS）

### CORS 配置

CORS 配置在 `lib/api/cors.ts` 中，所有 API Routes 都使用相同的 CORS 设置。

## 注意事项

### 1. Webhook 回调地址更新

如果之前配置了 Webhook（如微信支付回调），需要更新回调地址：

- **之前**：`https://your-project.supabase.co/functions/v1/wechat-confirm`
- **现在**：`https://your-domain.com/api/wechat-confirm`

### 2. 数据库 Webhooks

如果使用了 Supabase Database Webhooks，需要在 MemFire 控制台中重新配置：

1. 进入 MemFire 控制台 → 数据库 → Webhooks
2. 更新 Webhook 的目标 URL 为新的 Next.js API 地址

### 3. 定时任务

如果某些函数是定时任务（如 `consultation-settlement-worker`），需要：

1. 使用 Vercel Cron Jobs 或其他定时任务服务
2. 或者使用 MemFire 的定时任务功能（如果支持）

### 4. 测试

迁移后，请测试所有 API 端点：

```bash
# 本地测试
npm run dev

# 测试 API
curl -X POST http://localhost:3000/api/wechat-login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"code": "test_code"}'
```

## 文件结构

```
web/
├── app/
│   └── api/
│       ├── wechat-login/
│       │   └── route.ts
│       ├── consultation-submit-review/
│       │   └── route.ts
│       └── ... (其他 API Routes)
├── lib/
│   └── api/
│       ├── cors.ts          # CORS 配置
│       └── supabase-admin.ts # Supabase 管理员客户端工具
└── .env.local               # 环境变量配置
```

## 下一步

1. ✅ 所有函数已迁移
2. ⏳ 更新前端代码中的 API 调用地址
3. ⏳ 配置环境变量
4. ⏳ 更新 Webhook 回调地址
5. ⏳ 测试所有 API 端点
6. ⏳ 部署到生产环境

## 支持

如有问题，请检查：
1. 环境变量是否正确配置
2. Supabase 连接是否正常
3. API 路由是否正确
4. 控制台日志中的错误信息

