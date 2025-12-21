'use client'

import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/lib/components/ui/popover"
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import { Separator } from '@/lib/components/ui/separator'
import { Slider } from '@/lib/components/ui/slider'
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Menu,
  Search,
  Settings,
  Share2
} from 'lucide-react'
import { useState } from 'react'

// -----------------------------------------------------------------------------
// 样式补丁：复用全局风格
// -----------------------------------------------------------------------------
const styles = `
  .paper-texture {
    background-color: #fdfbf7;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
  }
  
  /* 垂直排版标题 */
  .vertical-rl {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.2em;
  }

  /* 选中文本高亮颜色 */
  ::selection {
    background: rgba(200, 46, 49, 0.15);
    color: #1c1917;
  }
`

// -----------------------------------------------------------------------------
// 模拟数据：书籍内容与关联案例
// -----------------------------------------------------------------------------
const BOOK_META = {
  title: "增删卜易",
  author: "野鹤老人",
  currentChapter: "卷二 · 动变生克冲合",
  chapters: [
    "卷一 · 八卦章", "卷一 · 黄金策", "卷二 · 动变生克冲合", "卷二 · 旬空", "卷二 · 月破"
  ]
}

const RELATED_CASES = [
  {
    id: 1,
    title: "动爻化回头克，是否一定凶？",
    tags: ["动变", "回头克"],
    author: "云深不知处",
    result: "验·准"
  },
  {
    id: 2,
    title: "测生意，财爻发动化进神",
    tags: ["进神", "财运"],
    author: "青衣道人",
    result: "验·准"
  }
]

// -----------------------------------------------------------------------------
// 组件：侧边关联案例卡片
// -----------------------------------------------------------------------------
const CaseCard = ({ data }: { data: typeof RELATED_CASES[0] }) => (
  <div className="bg-white border border-stone-200 p-4 rounded-lg shadow-sm hover:shadow-md hover:border-[#C82E31]/30 transition-all cursor-pointer group">
    <div className="flex items-center justify-between mb-2">
      <Badge variant="outline" className="text-[10px] text-stone-500 border-stone-200 bg-stone-50 h-5">
        实证案例
      </Badge>
      <span className="text-[10px] text-[#C82E31] font-bold bg-red-50 px-1.5 rounded">{data.result}</span>
    </div>
    <h4 className="text-sm font-bold text-stone-800 font-serif leading-tight mb-2 group-hover:text-[#C82E31] transition-colors">
      {data.title}
    </h4>
    <div className="flex items-center justify-between text-[10px] text-stone-400">
      <span>{data.author}</span>
      <ArrowUpRight className="w-3 h-3" />
    </div>
  </div>
)

// -----------------------------------------------------------------------------
// 主页面
// -----------------------------------------------------------------------------
export default function BookReaderPage() {
  const [fontSize, setFontSize] = useState([18])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <>
      <style jsx global>{styles}</style>
      
      <div className="flex flex-col h-screen paper-texture overflow-hidden text-stone-800">
        
        {/* 1. 顶部导航栏 (沉浸式) */}
        <header className="flex-none h-14 border-b border-stone-200/60 bg-[#fdfbf7]/90 backdrop-blur-md px-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="hover:bg-stone-100 text-stone-600">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col">
              <h1 className="text-sm font-bold font-serif text-stone-800">{BOOK_META.title}</h1>
              <span className="text-[10px] text-stone-500">{BOOK_META.currentChapter}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 字体设置 Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-stone-500 hover:text-stone-800">
                  <Settings className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-white border-stone-200 shadow-lg" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-stone-500 font-bold">字号</label>
                    <div className="flex items-center gap-4">
                      <span className="text-xs">A</span>
                      <Slider 
                        defaultValue={[18]} 
                        max={32} 
                        min={14} 
                        step={2} 
                        onValueChange={setFontSize}
                        className="flex-1"
                      />
                      <span className="text-lg">A</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="text-stone-500 hover:text-stone-800">
              <Highlighter className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-stone-500 hover:text-stone-800">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button className="bg-[#C82E31] hover:bg-[#a61b1f] text-white h-8 px-4 text-xs shadow-sm">
              做笔记
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          
          {/* 2. 左侧目录 (拟物化侧边条) */}
          <aside className={`w-64 flex-none border-r border-stone-200/60 bg-[#f9f8f4] flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-64 absolute h-full z-30 shadow-xl'}`}>
            <div className="p-4 border-b border-stone-200/50 flex items-center justify-between">
              <span className="font-serif font-bold text-stone-700 flex items-center gap-2">
                <Menu className="w-4 h-4" /> 目录
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarOpen(false)}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-1">
                {BOOK_META.chapters.map((chapter, i) => (
                  <div 
                    key={i}
                    className={`
                      group px-3 py-2.5 rounded-md text-sm cursor-pointer font-serif flex items-center gap-2 transition-colors
                      ${chapter === BOOK_META.currentChapter 
                        ? 'bg-white text-[#C82E31] font-bold shadow-sm border border-stone-100' 
                        : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                      }
                    `}
                  >
                    {/* 选中时的红色指示标 */}
                    <div className={`w-1 h-1 rounded-full ${chapter === BOOK_META.currentChapter ? 'bg-[#C82E31]' : 'bg-transparent group-hover:bg-stone-300'}`} />
                    {chapter}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* 目录展开按钮 (当侧边栏关闭时显示) */}
          {!sidebarOpen && (
            <div className="absolute top-1/2 left-0 z-30">
              <Button 
                variant="outline" 
                className="h-12 w-6 rounded-r-lg border-l-0 p-0 bg-white border-stone-200 shadow-md text-stone-400 hover:text-[#C82E31]"
                onClick={() => setSidebarOpen(true)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* 3. 中间正文 (阅读器核心) */}
          <div className="flex-1 min-w-0 relative bg-transparent flex justify-center">
            <ScrollArea className="h-full w-full">
              <div className="max-w-3xl mx-auto px-8 lg:px-16 py-12">
                
                {/* 章节标题 */}
                <div className="text-center mb-12 pb-8 border-b border-dashed border-stone-300">
                  <span className="text-xs text-stone-400 font-serif tracking-widest uppercase mb-2 block">Chapter 02</span>
                  <h2 className="text-3xl font-bold font-serif text-stone-900 mb-4">{BOOK_META.currentChapter.split('·')[1]}</h2>
                  <div className="flex items-center justify-center gap-4 text-xs text-stone-500">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> 原文</span>
                    <span>•</span>
                    <span>野鹤老人 著</span>
                  </div>
                </div>

                {/* 正文内容 */}
                <article 
                  className="prose prose-stone max-w-none font-serif text-stone-800 leading-loose"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  <p>
                    <span className="text-[#C82E31] font-bold text-xl float-left mr-2 mt-[-4px]">动</span>
                    变者，卦之动爻变出之爻也。动爻为始，变爻为终。动爻为因，变爻为果。
                  </p>
                  
                  {/* 原文引用块 */}
                  <div className="my-8 pl-6 border-l-4 border-stone-300 italic text-stone-600 bg-stone-50/50 py-2 pr-4 rounded-r">
                    <p className="m-0 text-sm">
                      “如卦中子水动而变出午火，即是子水回头克，如化申金，即是回头生。”
                    </p>
                  </div>

                  <p>
                    动爻既能生克他爻，他爻亦能生克动爻。惟变爻只可生克本位之动爻，不能生克他爻，而他爻亦不能生克变爻。
                  </p>
                  <p>
                    <span className="bg-[#C82E31]/10 border-b border-[#C82E31]/30 px-1 cursor-pointer hover:bg-[#C82E31]/20 transition-colors" title="点击查看释义">
                      进神
                    </span>
                    者，卦中之动爻，化出之变爻，比动爻五行相同，而长生十二宫地支次序在前也。如亥水动变子水，丑土动变辰土，皆为化进神。
                  </p>
                  <p>
                    退神者，卦中之动爻，化出之变爻，比动爻五行相同，而长生十二宫地支次序在后也。如子水动变亥水，辰土动变丑土，皆为化退神。
                  </p>
                  
                  {/* 注疏/批注 */}
                  <div className="mt-8 p-6 bg-white border border-stone-200 rounded-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                    <h4 className="text-sm font-bold text-[#C82E31] mb-2 flex items-center gap-2">
                      <span className="w-1 h-3 bg-[#C82E31] rounded-full"></span>
                      野鹤老人注
                    </h4>
                    <p className="text-sm text-stone-600 m-0">
                      进神者，如春木之向荣；退神者，如秋叶之凋零。吉神化进神，吉之又吉；凶神化进神，凶之又凶。
                    </p>
                  </div>
                </article>

                {/* 底部翻页 */}
                <div className="flex justify-between items-center mt-16 pt-8 border-t border-stone-200">
                  <Button variant="ghost" className="text-stone-500 hover:text-stone-800">
                    上一章
                  </Button>
                  <Button variant="outline" className="border-stone-300 text-stone-700 hover:text-[#C82E31] hover:border-[#C82E31]">
                    下一章：旬空
                  </Button>
                </div>

              </div>
            </ScrollArea>
          </div>

          {/* 4. 右侧助手栏 (实证互联) */}
          <aside className="w-80 flex-none border-l border-stone-200/60 bg-white/60 hidden xl:flex flex-col">
            <div className="p-4 border-b border-stone-200/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="文中搜..." 
                  className="w-full bg-white border border-stone-200 rounded-full py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:border-[#C82E31] transition-colors"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                
                {/* 知识点卡片 */}
                <div>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer">
                      动爻
                    </Badge>
                    <Badge variant="secondary" className="bg-[#C82E31]/10 text-[#C82E31] hover:bg-[#C82E31]/20 cursor-pointer border-transparent">
                      进神
                    </Badge>
                    <Badge variant="secondary" className="bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer">
                      回头克
                    </Badge>
                  </div>
                </div>

                <Separator className="bg-stone-100" />

                {/* 关联案例 (Killer Feature) */}
                <div>
                  <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Bookmark className="w-3 h-3 text-[#C82E31]" />
                    实证案例推荐
                  </h3>
                  <p className="text-[10px] text-stone-400 mb-3">
                    根据当前章节内容，为您推荐以下实战卦例：
                  </p>
                  <div className="space-y-3">
                    {RELATED_CASES.map(caseItem => (
                      <CaseCard key={caseItem.id} data={caseItem} />
                    ))}
                  </div>
                  <Button variant="link" className="text-xs text-stone-400 w-full mt-2 h-auto p-0 hover:text-[#C82E31]">
                    查看更多相关案例 &rarr;
                  </Button>
                </div>

                <Separator className="bg-stone-100" />

                {/* 读书笔记预览 */}
                <div>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">My Notes</h3>
                  <div className="bg-[#fff9c4]/30 border border-[#fff9c4] p-3 rounded-lg">
                    <p className="text-xs text-stone-600 font-serif leading-relaxed">
                      “变爻只可生克本位之动爻” —— 这一点非常关键，很多时候容易看错，以为变爻可以去生克世应。
                    </p>
                    <div className="mt-2 text-[10px] text-stone-400 text-right">2023-10-24</div>
                  </div>
                </div>

              </div>
            </ScrollArea>
          </aside>

        </div>
      </div>
    </>
  )
}