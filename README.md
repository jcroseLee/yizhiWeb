# 易知 - 六爻推演 Web 端

基于 Next.js + Tailwind CSS 构建的六爻推演 Web 独立站 PC 端。

## 功能特性

- ✅ 六爻推演功能
  - 手动摇卦
  - 自动摇卦
  - 手工起卦
- ✅ 卦象结果展示
  - 本卦、变卦显示
  - 四柱干支信息
  - 动爻标识
- ✅ 农历日期转换
- ✅ 节气计算

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **UI 组件**: shadcn/ui (新中式学术风主题)
- **状态管理**: Zustand
- **富文本编辑器**: Tiptap
- **图表**: Recharts
- **日期处理**: Day.js
- **易学算法**: lunar-javascript
- **后端**: Supabase (PostgreSQL + Auth)

## 项目结构

```
web/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 首页（推演功能）
│   ├── result/            # 结果页面
│   └── layout.tsx         # 根布局
├── lib/                    # 核心库文件
│   ├── components/        # 组件
│   │   ├── ui/           # shadcn/ui 基础组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   └── ExampleUsage.tsx # 组件使用示例
│   ├── constants/         # 常量定义
│   │   ├── hexagrams.ts   # 六十四卦数据
│   │   └── divination.ts  # 推演相关常量
│   ├── stores/           # 状态管理
│   │   └── divinationStore.ts # 排盘数据管理
│   ├── utils/             # 工具函数
│   │   ├── cn.ts          # 类名合并工具
│   │   ├── date.ts        # 日期格式化
│   │   ├── images.ts      # 图片路径管理
│   │   ├── lunar.ts       # 农历、干支计算
│   │   ├── solarTerms.ts  # 节气计算
│   │   ├── divinationLines.ts # 爻线处理
│   │   └── hexagramNames.ts   # 卦名处理
│   └── services/          # 服务层
│       └── supabaseClient.ts # Supabase 客户端
└── public/                 # 静态资源
    └── images/            # 图片资源
        ├── backgrounds/   # 背景图片
        ├── icons/        # 图标图片
        ├── illustrations/ # 插画/装饰图片
        ├── hexagram/     # 卦象相关图片
        ├── logos/        # Logo 图片
        └── ui/           # UI 组件图片
```

## 环境配置

1. 复制环境变量文件：
```bash
cp .env.example .env.local
```

2. 配置环境变量：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 安装依赖

```bash
npm install
# 或
pnpm install
```

## 开发

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 构建

```bash
npm run build
npm start
```

## 待实现功能

- [ ] 咨询师页面
- [ ] 社区功能
- [ ] 消息功能
- [ ] 个人中心
- [ ] 推演记录管理
- [ ] AI 解读功能
- [ ] 笔记功能
- [ ] 用户认证

## UI 主题

项目采用**新中式学术风**设计主题：

- **色彩系统**: 宣纸白、浅米色、墨蓝、朱砂红
- **字体**: 思源宋体（标题）、思源黑体（正文）
- **组件库**: shadcn/ui（基于 Radix UI + Tailwind CSS）

详细配置说明请查看：
- [SHADCN_SETUP.md](./SHADCN_SETUP.md) - 配置说明
- [COMPONENTS_GUIDE.md](./COMPONENTS_GUIDE.md) - 组件使用指南
- [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) - 配置完成总结

## 注意事项

- 本项目基于原 Taro 小程序项目迁移而来
- 保留了核心的六爻推演逻辑和工具函数
- UI 已适配 PC 端，使用 Tailwind CSS + shadcn/ui 进行样式设计
- 数据存储使用 localStorage（后续可迁移到 Supabase）
- 所有 UI 组件都可以直接修改源码进行定制
