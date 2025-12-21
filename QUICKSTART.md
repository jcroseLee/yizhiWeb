# 快速开始指南

## 安装依赖

```bash
cd web
npm install
# 或使用 pnpm
pnpm install
```

## 环境配置

1. 创建 `.env.local` 文件：
```bash
cp .env.example .env.local
```

2. 填写 Supabase 配置：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 已实现功能

### ✅ 核心功能
- **六爻占卜**
  - 手动摇卦：用户点击按钮逐爻摇卦
  - 自动摇卦：系统自动完成六爻摇卦
  - 手工起卦：用户手动选择每爻状态
- **卦象展示**
  - 本卦、变卦显示
  - 动爻标识
  - 卦名和卦辞
- **四柱信息**
  - 年、月、日、时干支
  - 空亡计算
- **农历转换**
  - 公历转农历
  - 时辰显示

### ✅ 页面结构
- `/` - 首页（占卜功能）
- `/result` - 结果页面
- `/masters` - 咨询师页面（占位）
- `/community` - 社区页面（占位）
- `/messages` - 消息页面（占位）
- `/profile` - 个人中心（占位）

## 项目特点

1. **完全迁移核心逻辑**
   - 保留了原项目的所有六爻计算逻辑
   - 农历、干支、节气计算完全一致
   - 卦象数据完整保留

2. **PC 端适配**
   - 使用 Tailwind CSS 进行响应式设计
   - 适合桌面端浏览体验
   - 清晰的导航结构

3. **现代化技术栈**
   - Next.js 16 App Router
   - TypeScript 类型安全
   - Tailwind CSS 4 样式系统

## 下一步开发

- [ ] 完善咨询师页面功能
- [ ] 实现社区功能（发帖、评论、点赞）
- [ ] 实现消息功能（聊天、通知）
- [ ] 实现个人中心（资料、记录管理）
- [ ] 集成 Supabase 认证
- [ ] 实现占卜记录云端存储
- [ ] 添加 AI 解读功能
- [ ] 添加笔记功能

## 注意事项

- 当前数据存储在 localStorage，后续可迁移到 Supabase
- 部分页面为占位页面，功能待实现
- 需要配置 Supabase 环境变量才能使用后端功能

