'use client'

import {
  BookOpen,
  Compass,
  Filter,
  Flame,
  Library,
  PenTool,
  ScrollText,
  Search,
  Sparkles,
  Tag,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import { Input } from '@/lib/components/ui/input'
import { ScrollArea, ScrollBar } from '@/lib/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/lib/components/ui/tabs'

// 样式补丁：宣纸纹理 & Tab 下划线
const styles = `
  .paper-texture {
    background-color: #fdfbf7;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
  }

  .tab-underline[data-state='active'] {
    color: #1c1917;
    font-weight: 600;
    box-shadow: none;
    border-bottom: 2px solid #C82E31;
    border-radius: 0;
    background: transparent;
  }
`

export default function LibraryPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/cases?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleCategoryClick = (category: string) => {
    router.push(`/library/wiki/${encodeURIComponent(category)}`)
  }

  const handleBookClick = (bookTitle: string) => {
    router.push(`/library/reader/${encodeURIComponent(bookTitle)}`)
  }

  const handleTagClick = (tag: string) => {
    router.push(`/cases?tag=${encodeURIComponent(tag)}`)
  }

  const handleHotTopicClick = (topic: string) => {
    const keyword = topic.replace(/^#\s*/, '')
    router.push(`/cases?q=${encodeURIComponent(keyword)}`)
  }

  return (
    <>
      <style jsx global>{styles}</style>

      <div className="flex flex-col min-h-screen paper-texture">
        {/* Header（不置顶，随内容滚动） */}
        <div className="flex-none px-6 lg:px-8 pt-10 pb-6 border-b border-stone-200/50 bg-[#fdfbf7]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight font-serif text-stone-800 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-[#C82E31] rounded-full inline-block" />
                    藏经阁 · 智慧沉淀
                  </h1>
                  <p className="text-stone-500 text-sm font-serif pl-3.5">
                    “博学之，审问之，慎思之，明辨之，笃行之。”
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <form onSubmit={handleSearch} className="relative w-full lg:w-[320px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                      placeholder="搜索古籍、技法、知识点..."
                      className="pl-9 h-10 bg-white/80 border-stone-200 focus-visible:ring-[#C82E31]/20 focus-visible:border-[#C82E31] shadow-sm rounded-lg text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                  <Button className="bg-[#C82E31] hover:bg-[#a61b1f] text-white h-10 px-5 shadow-sm font-serif tracking-wide">
                    <PenTool className="w-4 h-4 mr-2" />
                    贡献词条
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Tabs defaultValue="recommend" className="w-full">
                  <div className="flex items-center justify-between">
                    <TabsList className="bg-transparent h-auto p-0 gap-6">
                      <TabsTrigger
                        value="recommend"
                        className="tab-underline px-1 py-3 text-stone-500 text-base font-serif data-[state=active]:bg-transparent transition-all"
                      >
                        推荐
                      </TabsTrigger>
                      <TabsTrigger
                        value="theory"
                        className="tab-underline px-1 py-3 text-stone-500 text-base font-serif data-[state=active]:bg-transparent transition-all"
                      >
                        <BookOpen className="w-4 h-4 mr-1.5" />
                        理论体系
                      </TabsTrigger>
                      <TabsTrigger
                        value="books"
                        className="tab-underline px-1 py-3 text-stone-500 text-base font-serif data-[state=active]:bg-transparent transition-all"
                      >
                        <Library className="w-4 h-4 mr-1.5" />
                        珍藏古籍
                      </TabsTrigger>
                    </TabsList>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full border-stone-200 text-stone-500 hover:text-stone-800 hover:border-stone-300 bg-white/50"
                    >
                      <Filter className="w-3.5 h-3.5 mr-1.5" />
                      筛选
                    </Button>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <ScrollArea className="flex-1 w-full">
          <div className="max-w-7xl mx-auto w-full p-6 lg:p-8 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left column */}
              <div className="lg:col-span-9 space-y-8">
                {/* Daily Learn */}
                <Card className="group relative overflow-hidden border-none shadow-lg bg-[#1c1917] text-stone-100 hover:shadow-xl transition-all duration-500">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Compass className="w-64 h-64 text-white -rotate-12" />
                  </div>

                  <div className="absolute top-4 right-4 z-10">
                    <div className="border border-[#C82E31]/50 text-[#C82E31] bg-[#C82E31]/10 px-3 py-1 text-xs font-bold font-serif tracking-widest backdrop-blur-sm rounded-sm">
                      每日一学
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row h-full">
                    <div className="md:w-56 p-8 flex flex-col justify-center items-center text-center relative border-r border-white/10">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C82E31] to-[#7f1d1d] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(200,46,49,0.3)]">
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-serif text-xl font-bold tracking-widest">进神退神</h3>
                      <p className="text-[10px] text-stone-400 mt-2 uppercase tracking-widest">Advanced Tech</p>
                    </div>

                    <div className="p-8 flex-1 flex flex-col justify-center relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-[#C82E31] bg-white/10 px-2 py-0.5 rounded border border-white/10">
                          进阶技法
                        </span>
                        <span className="text-xs text-stone-400">阅读 2.1k</span>
                      </div>
                      <h2
                        className="text-2xl font-serif font-bold text-white mb-4 leading-tight group-hover:text-[#C82E31] transition-colors cursor-pointer"
                        onClick={() => handleCategoryClick('进阶技法')}
                      >
                        论“进神”与“退神”的实战吉凶判定
                      </h2>
                      <p className="text-stone-300 text-sm leading-relaxed line-clamp-2 font-serif mb-6 opacity-80">
                        “进神者，如春木之向荣；退神者，如秋叶之凋零。” 在占断吉凶时，进退之机往往决定了事情的长远走向。本文将结合《增删卜易》古例深入剖析。
                      </p>
                      <Button
                        size="sm"
                        className="bg白色 text-stone-900 hover:bg-stone-100 border-none h-9 px-6 font-medium"
                        onClick={() => handleCategoryClick('进阶技法')}
                      >
                        <BookOpen className="w-4 h-4 mr-2" /> 开始研读
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Knowledge graph */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold font-serif text-stone-800 flex items-center gap-2 mb-4 border-l-4 border-[#C82E31] pl-3">
                    知识图谱
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { title: '基础理论', desc: '五行 / 八卦 / 干支', char: '乾' },
                      { title: '六亲通辩', desc: '取象 / 类神 / 飞伏', char: '亲' },
                      { title: '五行生克', desc: '旺衰 / 刑冲 / 合害', char: '生' },
                      { title: '应期法则', desc: '远近 / 快慢 / 定数', char: '应' },
                      { title: '进阶技法', desc: '进退 / 反吟 / 暗动', char: '技' },
                      { title: '分类占验', desc: '求财 / 功名 / 感情', char: '占' },
                    ].map((item) => (
                      <Card
                        key={item.title}
                        className="group cursor-pointer border border-stone-200/60 bg-white/60 hover:bg-white hover:border-[#C82E31]/30 hover:shadow-md transition-all duration-300"
                        onClick={() => handleCategoryClick(item.title)}
                      >
                        <CardContent className="p-5 flex flex-row items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 group-hover:bg-[#C82E31] group-hover:text-white group-hover:border-[#C82E31] transition-colors duration-300 font-serif font-bold text-stone-600 text-xl shadow-sm">
                            {item.char}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-base font-bold text-stone-800 font-serif group-hover:text-[#C82E31] transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-xs text-stone-400 group-hover:text-stone-500 transition-colors">
                              {item.desc}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Books */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-4">
                    <h3 className="text-base font-bold font-serif text-stone-800 flex items-center gap-2 border-l-4 border-[#C82E31] pl-3">
                      经典古籍
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-stone-400 hover:text-[#C82E31]"
                    >
                      查看全部 →
                    </Button>
                  </div>

                  <div className="relative bg-[#f5f5f0] border border-stone-200 rounded-lg p-8 shadow-inner overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />

                    <ScrollArea className="w-full whitespace-nowrap pb-4">
                      <div className="flex w-max space-x-8 px-4">
                        {[
                          { title: '增删卜易', author: '野鹤老人' },
                          { title: '卜筮正宗', author: '王洪绪' },
                          { title: '易隐', author: '曹九锡' },
                          { title: '火珠林', author: '麻衣道者' },
                          { title: '断易天机', author: '鬼谷子' },
                        ].map((book) => (
                          <div
                            key={book.title}
                            className="group relative shrink-0 w-[130px] cursor-pointer"
                            onClick={() => handleBookClick(book.title)}
                          >
                            <div className="relative aspect-[2/3] bg-[#EBE9E4] shadow-[5px_5px_15px_rgba(0,0,0,0.15)] group-hover:-translate-y-2 group-hover:shadow-[8px_15px_25px_rgba(0,0,0,0.2)] transition-all duration-500 border-r border-stone-300 rounded-sm">
                              <div className="absolute left-0 top-0 bottom-0 w-4 bg-[#Dcdad5] border-r border-stone-300 z-10 flex flex-col justify-around py-4 items-center shadow-inner">
                                <div className="w-full h-[1px] bg-stone-400/50" />
                                <div className="w-full h-[1px] bg-stone-400/50" />
                                <div className="w-full h-[1px] bg-stone-400/50" />
                                <div className="w-full h-[1px] bg-stone-400/50" />
                              </div>

                              <div className="absolute top-4 left-8 right-6 bg-[#FDFBF7] border border-stone-300 shadow-sm py-4 flex justify-center items-center">
                                <span
                                  className="font-serif text-lg font-bold text-stone-800 tracking-[0.2em]"
                                  style={{ writingMode: 'vertical-rl' }}
                                >
                                  {book.title}
                                </span>
                              </div>

                              <div className="absolute bottom-3 right-3 opacity-60">
                                <div className="border border-[#C82E31] text-[#C82E31] text-[9px] px-1 py-0.5 rounded-[2px] font-serif">
                                  {book.author}
                                </div>
                              </div>
                            </div>
                            <div className="absolute -bottom-4 left-2 right-2 h-2 bg-black/10 blur-md rounded-[50%] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          </div>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" className="bg-stone-200/50" />
                    </ScrollArea>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="lg:col-span-3 space-y-8">
                <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold font-serif text-stone-800 mb-5 flex items-center">
                    <Flame className="w-4 h-4 mr-2 text-[#C82E31]" /> 热门研读
                  </h4>
                  <div className="space-y-4">
                    {[
                      { title: '# 如何判断用神旺衰', views: 234 },
                      { title: '# 暗动的吉凶法则', views: 189 },
                      { title: '# 三合局应期判断', views: 156 },
                      { title: '# 墓库论与入墓', views: 112 },
                    ].map((item, index) => (
                      <div
                        key={item.title}
                        className="flex items-start gap-3 group cursor-pointer"
                        onClick={() => handleHotTopicClick(item.title)}
                      >
                        <span
                          className={`text-[10px] font-bold mt-0.5 w-4 h-4 flex items-center justify-center rounded ${
                            index === 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : index === 1
                              ? 'bg-stone-200 text-stone-600'
                              : index === 2
                              ? 'bg-[#d6cfc7] text-[#5c554e]'
                              : 'text-stone-300'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-stone-700 font-medium group-hover:text-[#C82E31] transition-colors truncate">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {item.views} 人研习
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold font-serif text-stone-800 mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-stone-400" /> 技法反查
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['月破', '暗动', '伏吟', '反吟', '三合局', '六合', '旬空', '进神', '退神', '飞伏'].map(
                      (tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-white border border-stone-200 text-stone-600 hover:border-[#C82E31] hover:text-[#C82E31] hover:bg-red-50/50 px-3 py-1 font-serif cursor-pointer transition-all shadow-sm"
                          onClick={() => handleTagClick(tag)}
                        >
                          {tag}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>

                <Card className="bg-gradient-to-br from-[#fcfbf9] to-[#f5f5f4] border border-stone-200 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#C82E31]/30 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ScrollText className="w-16 h-16" />
                  </div>
                  <CardContent className="p-5 text-center space-y-3 relative z-10">
                    <h5 className="font-serif font-bold text-stone-800">共建藏经阁</h5>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      发现古籍缺漏？或是对技法有独到见解？诚邀您成为贡献者。
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 border-stone-300 hover:text-[#C82E31] hover:border-[#C82E31] bg-white"
                    >
                      申请加入
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
