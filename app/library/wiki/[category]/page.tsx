'use client'

import { Badge } from '@/lib/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/lib/components/ui/breadcrumb"
import { Button } from '@/lib/components/ui/button'
import { Card } from '@/lib/components/ui/card'
import { Input } from '@/lib/components/ui/input'
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import { Separator } from '@/lib/components/ui/separator'
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  CornerDownRight,
  Edit3,
  Menu,
  Search,
  Share2
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

// --- 模拟数据 ---

// 知识树结构
const TREE_DATA = [
  {
    id: 'base',
    title: '基础理论',
    isOpen: true,
    children: [
      { id: 'yin-yang', title: '阴阳学说', active: false },
      { id: 'wu-xing', title: '五行生克', active: true }, // 当前选中
      { id: 'ba-gua', title: '八卦万物类象', active: false },
      { id: 'gan-zhi', title: '天干地支', active: false },
    ]
  },
  {
    id: 'liuyao',
    title: '六爻进阶',
    isOpen: false,
    children: [
      { id: 'an-dong', title: '暗动与日破', active: false },
      { id: 'jin-tui', title: '进神与退神', active: false },
      { id: 'fan-yin', title: '反吟伏吟', active: false },
    ]
  },
  {
    id: 'case-study',
    title: '分类占验',
    isOpen: false,
    children: [
      { id: 'wealth', title: '求财篇', active: false },
      { id: 'career', title: '功名篇', active: false },
    ]
  }
]

// 目录结构
const TOC = [
  { id: 'origin', title: '五行的起源与定义', level: 1 },
  { id: 'relation', title: '五行生克关系', level: 1 },
  { id: 'sheng', title: '相生之理', level: 2 },
  { id: 'ke', title: '相克之义', level: 2 },
  { id: 'wang-xiang', title: '旺相休囚死', level: 1 },
  { id: 'application', title: '实战应用举例', level: 1 },
]

const categoryMap: Record<string, { title: string; description: string }> = {
  '基础理论': {
    title: '基础理论',
    description: '五行、八卦、干支等易学基础概念',
  },
  '六亲通辩': {
    title: '六亲通辩',
    description: '取象、类神、飞伏等六亲应用',
  },
  '五行生克': {
    title: '五行生克',
    description: '旺衰、刑冲、合害等五行关系',
  },
  '应期法则': {
    title: '应期法则',
    description: '远近、快慢、定数等应期判断',
  },
  '进阶技法': {
    title: '进阶技法',
    description: '进退、反吟、暗动等高级技法',
  },
  '分类占验': {
    title: '分类占验',
    description: '求财、功名、感情等分类占断',
  },
}

export default function WikiPage() {
  const params = useParams()
  const router = useRouter()
  const category = params.category as string
  const categoryInfo = categoryMap[category] || {
    title: category,
    description: '易学知识体系',
  }
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA]">
      
      {/* 1. Header: 面包屑与工具栏 */}
      <header className="flex-none h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
               <Menu className="w-5 h-5 text-slate-500" />
            </Button>
            
            <Breadcrumb>
              <BreadcrumbList className="text-sm">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/library" className="font-serif">藏经阁</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/library/wiki">基础理论</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-slate-900">{categoryInfo.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
         </div>

         <div className="flex items-center gap-2">
            <div className="relative hidden md:block w-64 mr-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input placeholder="搜索知识点..." className="h-8 pl-8 bg-slate-50 border-transparent focus:bg-white focus:border-slate-200" />
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-slate-500">
               <Share2 className="w-4 h-4 mr-2" /> 分享
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-slate-500">
               <Edit3 className="w-4 h-4 mr-2" /> 纠错
            </Button>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
         
         {/* 2. Left Sidebar: 知识树 (可折叠) */}
         <aside className={`w-64 bg-[#FAFAFA] border-r border-slate-200 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full absolute z-20 h-full'} lg:static lg:translate-x-0`}>
            <ScrollArea className="flex-1 py-6 px-4">
               <div className="space-y-1">
                  {TREE_DATA.map((group) => (
                    <div key={group.id} className="mb-4">
                       <button className="flex items-center w-full text-sm font-semibold text-slate-900 mb-2 px-2 py-1 hover:bg-slate-100 rounded-md transition-colors">
                          <ChevronDown className={`w-4 h-4 mr-1 text-slate-400 transition-transform ${group.isOpen ? '' : '-rotate-90'}`} />
                          {group.title}
                       </button>
                       {group.isOpen && (
                         <div className="space-y-0.5 ml-2 border-l border-slate-200 pl-2">
                            {group.children.map(item => (
                              <div 
                                key={item.id} 
                                className={`
                                  group flex items-center justify-between text-sm px-3 py-2 rounded-md cursor-pointer transition-all
                                  ${item.active 
                                    ? 'bg-white text-blue-700 font-medium shadow-sm border border-slate-100' 
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                                `}
                                onClick={() => {
                                  // 可以在这里添加导航逻辑
                                  router.push(`/library/wiki/${item.id}`)
                                }}
                              >
                                 <span>{item.title}</span>
                                 {item.active && <CornerDownRight className="w-3 h-3 text-blue-400" />}
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                  ))}
               </div>
            </ScrollArea>
         </aside>

         {/* 3. Main Content: 文章阅读区 */}
         <main className="flex-1 overflow-y-auto bg-white scroll-smooth">
            <div className="max-w-4xl mx-auto px-8 py-10 lg:px-12 lg:py-12 flex gap-12">
               
               {/* 文章主体 */}
               <article className="flex-1 min-w-0">
                  
                  {/* Title Block */}
                  <div className="mb-8 border-b border-slate-100 pb-6">
                     <div className="flex items-center gap-2 mb-4">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100">{categoryInfo.title}</Badge>
                        <span className="text-xs text-slate-400">最后更新：2024-03-20</span>
                     </div>
                     <h1 className="text-4xl font-bold font-serif text-slate-900 mb-4 leading-tight">
                        {categoryInfo.title}：万物运行的底层逻辑
                     </h1>
                     <p className="text-lg text-slate-600 leading-relaxed font-serif italic">
                        "{categoryInfo.description}"
                     </p>
                  </div>

                  {/* Content Body (模拟 Tailwind Typography Prose) */}
                  <div className="prose prose-slate prose-lg max-w-none text-slate-700">
                     
                     <h2 id="origin" className="text-2xl font-bold text-slate-800 font-serif mt-8 mb-4">一、五行的起源与定义</h2>
                     <p>
                        五行学说是中国古代哲学的重要组成部分。它认为宇宙万物，都由木、火、土、金、水五种基本物质的运行（运动）和变化所构成。它强调整体概念，描绘了事物的结构关系和运动形式。
                     </p>

                     {/* 自定义引用块样式：古籍引用 */}
                     <div className="my-8 relative pl-6 py-4 bg-slate-50 border-l-4 border-slate-400 rounded-r-lg">
                        <BookOpen className="absolute -left-3 -top-3 w-6 h-6 text-slate-600 bg-white rounded-full border border-slate-200 p-1" />
                        <p className="font-serif text-xl text-slate-800 leading-relaxed m-0 italic">
                           "五行者，金木水火土也。其数有五，并一而在，故曰五行。"
                        </p>
                        <p className="text-xs text-slate-500 mt-2 text-right">— 《尚书·洪范》</p>
                     </div>

                     <p>
                        在六爻预测中，五行不仅代表物质属性，更代表了能量的流向。
                     </p>

                     <h2 id="relation" className="text-2xl font-bold text-slate-800 font-serif mt-10 mb-4">二、五行生克关系</h2>
                     <p>
                        生克是五行之间最基本的关系。生，即资生、助长；克，即制约、阻碍。
                     </p>
                     
                     <h3 id="sheng" className="text-xl font-bold text-slate-800 mt-6 mb-2">1. 相生之理</h3>
                     <ul className="list-disc pl-5 space-y-2">
                        <li><strong>木生火：</strong> 木性温暖，火伏其中，钻灼而出，故木生火。</li>
                        <li><strong>火生土：</strong> 火热故能焚木，木焚而成灰，灰即土也，故火生土。</li>
                        <li><strong>土生金：</strong> 金居石依山，聚土成山，山必生石，故土生金。</li>
                     </ul>

                     <h3 id="ke" className="text-xl font-bold text-slate-800 mt-6 mb-2">2. 相克之义</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                        {/* 视觉化卡片 */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                           <span className="font-bold text-slate-900 block mb-1">金克木</span>
                           <span className="text-sm text-slate-500">刚胜柔，故金胜木。如斧斤伐木。</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                           <span className="font-bold text-slate-900 block mb-1">木克土</span>
                           <span className="text-sm text-slate-500">专胜散，故木胜土。如树根破土。</span>
                        </div>
                     </div>

                     <h2 id="wang-xiang" className="text-2xl font-bold text-slate-800 font-serif mt-10 mb-4">三、旺相休囚死</h2>
                     <p>
                        五行的旺衰并非一成不变，而是随着季节（月令）的变化而变化。这一点在断卦时至关重要。
                     </p>
                     
                  </div>

                  {/* 4. Bottom Actions: 关联推荐 */}
                  <div className="mt-16 pt-8 border-t border-slate-200">
                     <h3 className="text-lg font-bold font-serif text-slate-900 mb-4 flex items-center">
                        <ArrowUpRight className="w-5 h-5 mr-2 text-blue-600" />
                        实战案例关联
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-slate-200 bg-slate-50/50">
                           <div className="flex justify-between items-start mb-2">
                              <Badge variant="outline" className="text-blue-600 bg-white">#五行生克</Badge>
                              <span className="text-xs text-slate-400">234 赞</span>
                           </div>
                           <h4 className="font-bold text-slate-800 mb-1">测公司明年运势，遇金木交战</h4>
                           <p className="text-xs text-slate-500 line-clamp-2">
                              卦中月建为申金，冲克世爻寅木，典型的五行相克应期判断案例...
                           </p>
                        </Card>
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-slate-200 bg-slate-50/50">
                           <div className="flex justify-between items-start mb-2">
                              <Badge variant="outline" className="text-blue-600 bg-white">#土生金</Badge>
                              <span className="text-xs text-slate-400">112 赞</span>
                           </div>
                           <h4 className="font-bold text-slate-800 mb-1">占考试，得父母爻动而相生</h4>
                           <p className="text-xs text-slate-500 line-clamp-2">
                              土为文章，金为声音，土金相生，名声大振之象...
                           </p>
                        </Card>
                     </div>
                  </div>

               </article>

               {/* 5. Right Sidebar: 目录索引 (TOC) */}
               <aside className="hidden xl:block w-64 flex-none">
                  <div className="sticky top-24">
                     <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 pl-3 border-l-2 border-slate-900">
                        本页目录
                     </h4>
                     <nav className="space-y-1">
                        {TOC.map((item) => (
                           <a
                              key={item.id}
                              href={`#${item.id}`}
                              className={`
                                 block text-sm py-1.5 px-3 rounded-md transition-colors border-l-2 border-transparent
                                 ${item.level === 1 ? 'text-slate-600 font-medium hover:text-slate-900' : 'text-slate-400 pl-6 hover:text-slate-700'}
                                 hover:bg-slate-50
                              `}
                           >
                              {item.title}
                           </a>
                        ))}
                     </nav>

                     <Separator className="my-6" />

                     {/* 关联标签 */}
                     <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                           相关词条
                        </h4>
                        <div className="flex flex-wrap gap-2">
                           {['天干', '地支', '八卦', '月破'].map(tag => (
                              <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer font-normal">
                                 {tag}
                              </Badge>
                           ))}
                        </div>
                     </div>
                  </div>
               </aside>

            </div>
         </main>
      </div>
    </div>
  )
}