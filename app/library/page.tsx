'use client'

import {
  ArrowRight,
  BookOpen,
  Compass,
  Flame,
  PenTool,
  ScrollText,
  Search,
  Sparkles,
  Tag
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import { Input } from '@/lib/components/ui/input'
import { ScrollArea, ScrollBar } from '@/lib/components/ui/scroll-area'

// --- 极致视觉样式补丁 ---
const styles = `
  /* 1. 基础纹理：宣纸叠加噪点 */
  .paper-texture {
    background-color: #F9F7F2;
    background-image: 
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E"),
      linear-gradient(to bottom, rgba(255,255,255,0.8) 0%, rgba(249,247,242,0) 100%);
  }

  /* 2. 暗黑卡片背景纹理 */
  .card-background {
    background-color: #1a1a1a;
    background-image: 
      radial-gradient(circle at 80% 20%, rgba(200, 46, 49, 0.18) 0%, transparent 40%),
      url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 C 20 20, 40 20, 50 10 C 60 0, 80 0, 90 10 S 90 40, 50 50 S 10 40, 10 10 Z M50 50 C 60 60, 80 60, 90 50 C 100 40, 100 80, 90 90 S 60 100, 50 90 S 0 80, 10 90 S 40 100, 50 50 Z' stroke='%23FFFFFF' stroke-width='0.5' fill='none' opacity='0.03'/%3E%3C/svg%3E");
    background-size: cover, 3.75rem 3.75rem;
  }

  /* 3. 书脊拟物效果：增加光泽感和圆弧感 */
  .book-spine {
    background: linear-gradient(90deg, 
      #dcdad5 0%, 
      #f0efeb 20%, 
      #e6e4df 50%, 
      #dcdad5 100%);
    box-shadow: inset 0.125rem 0 0.3125rem rgba(0,0,0,0.05), inset -0.125rem 0 0.3125rem rgba(0,0,0,0.05);
  }

  /* 4. 文字发光效果 (用于Dark Mode) */
  .text-glow {
    text-shadow: 0 0 1.25rem rgba(255,255,255,0.3);
  }
  
  /* 5. 隐藏滚动条但保留功能 */
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  /* 6. 链接下划线动画 */
  .hover-underline {
    display: inline-flex;
    position: relative;
  }
  .hover-underline::after {
    content: '';
    position: absolute;
    width: 100%;
    transform: scaleX(0);
    height: 0.0625rem;
    bottom: 0;
    left: 0;
    background-color: currentColor;
    transform-origin: bottom right;
    transition: transform 0.25s ease-out;
  }
  .hover-underline:hover::after {
    transform: scaleX(1);
    transform-origin: bottom left;
  }
`

type LibraryBook = {
  id: string
  title: string
  author: string | null
  volume_type: 'none' | 'upper' | 'lower' | null
}

type WikiArticle = {
  id: string
  title: string
  slug: string
  summary: string | null
  view_count: number | null
  category_name: string | null
}

export default function LibraryPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [books, setBooks] = useState<LibraryBook[]>([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [latestArticle, setLatestArticle] = useState<WikiArticle | null>(null)
  const [articleLoading, setArticleLoading] = useState(true)

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/cases?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // 路由跳转辅助函数
  const handleCategoryClick = (category: string) => router.push(`/library/wiki/${encodeURIComponent(category)}`)
  const handleBookClick = (bookTitle: string) => router.push(`/library/reader/${encodeURIComponent(bookTitle)}`)
  const handleTagClick = (tag: string) => router.push(`/cases?tag=${encodeURIComponent(tag)}`)
  const handleHotTopicClick = (topic: string) => {
    const keyword = topic.replace(/^#\s*/, '')
    router.push(`/cases?q=${encodeURIComponent(keyword)}`)
  }

  // 计算书籍列表总宽度（书籍宽度 + 间距 + 留白）
  const booksContainerWidth = useMemo(() => {
    const bookWidth = 120 // 每本书宽度 7.5rem
    const bookGap = 40 // 书籍间距 space-x-10 = 2.5rem
    const padding = 32 // 左右 padding pl-4 pr-4 = 1rem * 2 = 2rem
    const bookCount = booksLoading ? 5 : books.length // loading 时显示 5 个骨架屏
    if (bookCount === 0) return 0
    return bookCount * bookWidth + (bookCount - 1) * bookGap + padding
  }, [books.length, booksLoading])

  // 数据加载逻辑 (保持原样)
  useEffect(() => {
    const loadBooks = async () => {
      const supabase = createClient()
      if (!supabase) {
        setBooksLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('library_books')
          .select('id, title, author, volume_type')
          .in('status', ['reviewed', 'published'])
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setBooks(data as LibraryBook[])
      } catch (error) {
        console.error('Failed to load books:', error)
      } finally {
        setBooksLoading(false)
      }
    }

    const loadLatestArticle = async () => {
      const supabase = createClient()
      if (!supabase) {
        setArticleLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('wiki_articles')
          .select('id, title, slug, summary, view_count, wiki_categories(name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') throw error

        if (data) {
          setLatestArticle({
            id: data.id,
            title: data.title,
            slug: data.slug,
            summary: data.summary,
            view_count: data.view_count,
            category_name: (data.wiki_categories as any)?.name || null,
          })
        } else {
          setLatestArticle(null)
        }
      } catch (error) {
        console.error('Failed to load latest article:', error)
        setLatestArticle(null)
      } finally {
        setArticleLoading(false)
      }
    }

    loadBooks()
    loadLatestArticle()
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="flex flex-col min-h-screen paper-texture selection:bg-[#C82E31] selection:text-white">
        
        {/* --- Header: 增加玻璃拟态和吸顶效果 --- */}
        <div className="sticky top-0 z-50 px-6 lg:px-8 py-4 border-b border-stone-200/60 bg-[#F9F7F2]/80 backdrop-blur-md transition-all duration-300">
          <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight font-serif text-stone-800 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C82E31] text-white shadow-md shadow-red-900/10">
                    <span className="font-serif font-bold text-lg">藏</span>
                </span>
                <span>藏经阁 · 智慧沉淀</span>
              </h1>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <form onSubmit={handleSearch} className="relative w-full md:w-[20rem] group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-[#C82E31] transition-colors" />
                <Input
                  placeholder="搜索古籍、技法..."
                  className="pl-10 h-10 bg-white/60 border-stone-200/80 focus-visible:ring-[#C82E31]/20 focus-visible:border-[#C82E31] shadow-sm rounded-full text-sm transition-all hover:bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
              <Button className="bg-[#1c1917] hover:bg-[#333] text-[#f5f5f0] h-10 px-6 rounded-full shadow-lg shadow-stone-900/10 font-serif tracking-wide transition-all hover:scale-105 active:scale-95">
                <PenTool className="w-3.5 h-3.5 mr-2" />
                贡献
              </Button>
            </div>
          </div>
        </div>

        {/* --- Main Content --- */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Left Main Column */}
            <div className="lg:col-span-9 space-y-10">
              
              {/* 1. Daily Learn Hero Card (优化版) */}
              <Card className="group relative overflow-hidden border-none shadow-2xl shadow-stone-900/20 bg-[#1c1917] text-stone-100 card-background rounded-2xl ring-1 ring-white/10">
                {/* 装饰：背景罗盘 */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700 pointer-events-none">
                  <Compass className="w-80 h-80 text-white -rotate-12 transform origin-center" />
                </div>
                
                {/* 装饰：顶部标签 */}
                <div className="absolute top-6 right-6 z-20">
                  <div className="flex items-center gap-2 border border-[#C82E31]/40 text-[#ff6b6b] bg-[#C82E31]/10 px-3 py-1 text-[0.625rem] font-bold font-serif tracking-[0.2em] backdrop-blur-md rounded-full shadow-[0_0_10px_rgba(200,46,49,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b6b] animate-pulse"/>
                    每日一学
                  </div>
                </div>

                <div className="flex flex-col md:flex-row h-full relative z-10">
                  {/* 左侧：图标区 */}
                  <div className="md:w-64 p-8 flex flex-col justify-center items-center text-center relative border-b md:border-b-0 md:border-r border-white/5 bg-linear-to-b from-white/2 to-transparent">
                    <div className="relative group-hover:scale-105 transition-transform duration-500 ease-out">
                        {/* 红色光晕背景 */}
                        <div className="absolute inset-0 bg-[#C82E31] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full" />
                        <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-[#C82E31] to-[#7f1d1d] flex items-center justify-center mb-6 shadow-inner border border-white/10 relative z-10">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white drop-shadow-md">
                                <path d="M2 6C2 5.44772 2.44772 5 3 5H10.5C11.3284 5 12 5.67157 12 6.5V19.5C12 18.6716 11.3284 18 10.5 18H3C2.44772 18 2 17.5523 2 17V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                <path d="M22 6C22 5.44772 21.5523 5 21 5H13.5C12.6716 5 12 5.67157 12 6.5V19.5C12 18.6716 12.6716 18 13.5 18H21C21.5523 18 22 17.5523 22 17V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                <path d="M12 5V19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M12 0L13.5 3L16.5 4.5L13.5 6L12 9L10.5 6L7.5 4.5L10.5 3L12 0Z" fill="currentColor"/>
                            </svg>
                        </div>
                    </div>
                    
                    {latestArticle ? (
                       <div className="space-y-1">
                          <h3 className="font-serif text-lg font-bold tracking-widest text-white/90">
                            智慧·推演
                          </h3>
                          <p className="text-[0.625rem] text-stone-500 uppercase tracking-[0.2em] font-medium">
                            Logic & Wisdom
                          </p>
                       </div>
                    ) : (
                        <div className="h-4 w-20 bg-white/10 animate-pulse rounded mx-auto"/>
                    )}
                  </div>

                  {/* 右侧：内容区 */}
                  <div className="p-8 md:p-10 flex-1 flex flex-col justify-center">
                    {articleLoading ? (
                      <div className="space-y-4 max-w-lg">
                        <div className="flex gap-2"><div className="h-4 w-16 bg-white/10 rounded"/><div className="h-4 w-12 bg-white/10 rounded"/></div>
                        <div className="h-8 w-3/4 bg-white/10 rounded"/>
                        <div className="h-20 w-full bg-white/10 rounded"/>
                      </div>
                    ) : latestArticle ? (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          {latestArticle.category_name && (
                            <span className="text-[0.6875rem] font-bold text-[#ff6b6b] bg-[#C82E31]/10 px-2 py-0.5 rounded border border-[#C82E31]/20">
                              {latestArticle.category_name}
                            </span>
                          )}
                          <span className="text-[0.6875rem] text-stone-500 flex items-center gap-1">
                             <div className="w-1 h-1 rounded-full bg-stone-500"/>
                             {latestArticle.view_count || 0} 人正在研习
                          </span>
                        </div>
                        
                        <h2
                          className="text-3xl font-serif font-bold text-white mb-4 leading-snug group-hover:text-[#ff8a8a] transition-colors cursor-pointer text-glow"
                          onClick={() => router.push(`/library/wiki/${latestArticle.slug}`)}
                        >
                          {latestArticle.title}
                        </h2>
                        
                        {latestArticle.summary && (
                          <p className="text-stone-400 text-sm leading-7 font-serif mb-8 max-w-2xl line-clamp-2">
                            {latestArticle.summary}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4">
                            <Button
                                className="bg-white text-stone-950 hover:bg-stone-200 border-none h-10 px-6 font-medium font-serif tracking-wide transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5"
                                onClick={() => router.push(`/library/wiki/${latestArticle.slug}`)}
                            >
                                <BookOpen className="w-4 h-4 mr-2" /> 开始研读
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="text-stone-400 hover:text-white hover:bg-white/5 font-serif text-sm"
                                asChild
                            >
                                <Link href="/library/wiki">
                                    浏览往期 <ArrowRight className="w-3 h-3 ml-1"/>
                                </Link>
                            </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-stone-400 font-serif">暂无今日内容</div>
                    )}
                  </div>
                </div>
              </Card>

              {/* 2. Knowledge Graph (优化版：卡片质感) */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-serif text-stone-800 flex items-center gap-3">
                    <span className="w-1 h-5 bg-[#C82E31] rounded-full" />
                    知识图谱
                  </h3>
                  <Link href="/library/wiki" className="text-xs text-stone-400 hover:text-[#C82E31] inline-flex items-center gap-1 transition-colors hover-underline whitespace-nowrap">
                    查看全部<ArrowRight className="w-3 h-3"/>
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
                  {[
                    { title: '基础理论', desc: '五行 / 八卦 / 干支', char: '基', color: 'bg-stone-100 text-stone-600' },
                    { title: '象数推演', desc: '六爻 / 梅花 / 奇门', char: '象', color: 'bg-stone-100 text-stone-600' },
                    { title: '命理推演', desc: '八字 / 紫薇 ', char: '命', color: 'bg-stone-100 text-stone-600' },
                    { title: '应期法则', desc: '远近 / 快慢 / 定数', char: '应', color: 'bg-stone-100 text-stone-600' },
                    { title: '进阶技法', desc: '进退 / 反吟 / 暗动', char: '技', color: 'bg-stone-100 text-stone-600' },
                    { title: '分类占验', desc: '求财 / 功名 / 感情', char: '占', color: 'bg-stone-100 text-stone-600' },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="group cursor-pointer relative bg-white border border-stone-200/60 rounded-xl p-5 hover:border-[#C82E31]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                      onClick={() => handleCategoryClick(item.title)}
                    >
                      {/* 背景装饰字 */}
                      <div className="absolute -right-4 -bottom-4 text-[5rem] font-serif font-black text-stone-50 opacity-[0.03] group-hover:opacity-[0.05] pointer-events-none select-none transition-opacity">
                          {item.char}
                      </div>

                      <div className="flex flex-row items-center gap-4 relative z-10">
                        <div className={`w-12 h-12 rounded-xl ${item.color} border border-stone-200/50 flex items-center justify-center shrink-0 group-hover:bg-[#C82E31] group-hover:text-white group-hover:border-[#C82E31] transition-all duration-300 font-serif font-bold text-xl shadow-sm group-hover:shadow-md`}>
                          {item.char}
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <h4 className="text-base font-bold text-stone-800 font-serif group-hover:text-[#C82E31] transition-colors truncate">
                            {item.title}
                          </h4>
                          <p className="text-xs text-stone-400 group-hover:text-stone-500 transition-colors truncate font-medium">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Classic Books (优化版：拟真书架) */}
              <div className="space-y-5 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-serif text-stone-800 flex items-center gap-3">
                    <span className="w-1 h-5 bg-[#C82E31] rounded-full" />
                    经典古籍
                  </h3>
                  <Link href="/library/books" className="text-xs text-stone-400 hover:text-[#C82E31] flex items-center gap-1 transition-colors hover-underline">
                    全部藏书 <ArrowRight className="w-3 h-3"/>
                  </Link>
                </div>

                <div className="relative bg-[#f0efeb] border border-[#e6e4df] rounded-xl p-8 pb-10 shadow-inner overflow-hidden">
                  {/* 书架木纹背景 */}
                  <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-multiply" />
                  {/* 书架阴影层 */}
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/5 to-transparent z-0"/>

                  <ScrollArea className="w-full whitespace-nowrap z-10">
                    <div className="flex w-max space-x-10 pl-4 pr-4 pb-4 pt-2">
                      {booksLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <div key={`skeleton-${i}`} className="shrink-0 w-[7.5rem] h-[11.25rem] bg-stone-300/50 animate-pulse rounded-sm shadow-sm" />
                        ))
                      ) : books.length > 0 ? (
                        books.map((book) => (
                          <div
                            key={book.id}
                            className="group relative shrink-0 w-[7.5rem] cursor-pointer perspective-500"
                            onClick={() => handleBookClick(book.id)}
                          >
                            <div className="relative aspect-2/3 bg-[#FDFBF7] shadow-[4px_0_10px_rgba(0,0,0,0.1),inset_0_0_20px_rgba(0,0,0,0.02)] group-hover:-translate-y-3 group-hover:shadow-[10px_20px_30px_rgba(0,0,0,0.15)] transition-all duration-500 ease-out border-r border-stone-300 rounded-[0.125rem] overflow-hidden transform-style-3d">
                              
                              {/* 书脊细节 */}
                              <div className="absolute left-0 top-0 bottom-0 w-5 book-spine z-10 flex flex-col justify-between py-6 items-center border-r border-black/5">
                                <div className="space-y-1 w-full flex flex-col items-center">
                                    <div className="w-3/4 h-px bg-stone-400/40" />
                                    <div className="w-3/4 h-px bg-stone-400/40" />
                                </div>
                                <div className="space-y-1 w-full flex flex-col items-center">
                                    <div className="w-3/4 h-px bg-stone-400/40" />
                                    <div className="w-3/4 h-px bg-stone-400/40" />
                                </div>
                              </div>

                              {/* 封面内容 */}
                              <div className="absolute top-5 left-8 right-3 bottom-5 border border-stone-800/10 flex justify-center items-center p-2 bg-white/50">
                                <div 
                                    className="font-serif text-stone-800 font-bold tracking-[0.3em] text-center leading-loose"
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                                >
                                    {book.title.length > 6 ? (
                                        <>
                                            <span className="text-sm opacity-80">{book.title.slice(0,5)}</span>
                                            <span className="text-sm opacity-80">{book.title.slice(5)}</span>
                                        </>
                                    ) : (
                                        <span className="text-base">{book.title}</span>
                                    )}
                                </div>
                              </div>
                              
                              {/* 册数标记 */}
                              {(book.volume_type === 'upper' || book.volume_type === 'lower') && (
                                <div className="absolute right-1.5 bottom-2">
                                    <span className="text-[0.625rem] font-serif text-stone-500 border border-stone-300 px-0.5 py-1 rounded-sm writing-mode-vertical">
                                        {book.volume_type === 'upper' ? '上' : '下'}
                                    </span>
                                </div>
                              )}

                              {/* 作者印章 */}
                              <div className="absolute bottom-3 left-7 opacity-70">
                                <div className="border border-[#C82E31] text-[#C82E31] text-[0.5rem] px-1 py-1 rounded-[0.125rem] font-serif leading-none bg-white/80">
                                  {book.author?.slice(0,2)}
                                </div>
                              </div>
                            </div>
                            
                            {/* 悬浮时的底部阴影 */}
                            <div className="absolute -bottom-4 left-4 right-4 h-2 bg-black/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          </div>
                        ))
                      ) : (
                        <div className="text-stone-400 text-sm py-8 w-full text-center">暂无书籍</div>
                      )}
                    </div>
                    <ScrollBar 
                      orientation="horizontal" 
                      className="bg-stone-300/50 h-2" 
                      style={{ width: `${booksContainerWidth}px` }}
                    />
                  </ScrollArea>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Hot Topics (优化版：更干净的列表) */}
              <div className="bg-white border border-stone-200/60 rounded-xl p-6 shadow-sm">
                <h4 className="text-sm font-bold font-serif text-stone-800 mb-6 flex items-center gap-2">
                  <div className="p-1 bg-red-50 rounded text-[#C82E31]">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  热门研读
                </h4>
                <div className="space-y-5">
                  {[
                    { title: '如何判断用神旺衰', views: 234 },
                    { title: '暗动的吉凶法则', views: 189 },
                    { title: '三合局应期判断', views: 156 },
                    { title: '墓库论与入墓', views: 112 },
                    { title: '六兽发动歌诀', views: 98 },
                  ].map((item, index) => (
                    <div
                      key={item.title}
                      className="flex items-baseline gap-3 group cursor-pointer"
                      onClick={() => handleHotTopicClick(item.title)}
                    >
                      <span className={`text-[0.625rem] font-bold w-4 text-center shrink-0 font-serif ${
                        index < 3 ? 'text-[#C82E31]' : 'text-stone-300'
                      }`}>
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                      <div className="flex-1 min-w-0 pb-3 border-b border-stone-100 group-last:border-0 group-hover:border-stone-200 transition-colors">
                        <div className="text-sm text-stone-700 font-medium font-serif group-hover:text-[#C82E31] transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="text-[0.625rem] text-stone-400 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1 group-hover:translate-y-0">
                          <BookOpen className="w-3 h-3" /> {item.views} 研习
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags (优化版：印章风格) */}
              <div>
                <h4 className="text-sm font-bold font-serif text-stone-800 mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-stone-400" /> 技法反查
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['月破', '暗动', '伏吟', '反吟', '三合局', '六合', '旬空', '进神', '退神', '飞伏'].map(
                    (tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="bg-stone-50/50 border-stone-200 text-stone-600 hover:border-[#C82E31] hover:text-[#C82E31] hover:bg-white px-2.5 py-1 font-serif cursor-pointer transition-all hover:shadow-sm"
                        onClick={() => handleTagClick(tag)}
                      >
                        {tag}
                      </Badge>
                    ),
                  )}
                </div>
              </div>

              {/* 4. Co-build Card (优化版：黑金风格，视觉平衡) */}
              <Card className="group relative overflow-hidden border-none shadow-xl bg-[#1c1917] text-stone-100 mt-4 rounded-xl card-background">
                {/* 装饰边框 */}
                <div className="absolute inset-0 border border-[#C5A065]/20 rounded-xl m-1 pointer-events-none" />
                
                {/* 背景大水印 */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500 transform rotate-[-10deg] scale-125">
                     <ScrollText className="w-32 h-32 text-[#C5A065]" />
                </div>

                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 border border-[#C5A065]/30 text-[#C5A065] bg-[#C5A065]/5 px-2 py-0.5 text-[0.625rem] font-bold font-serif tracking-widest rounded-sm">
                                <Sparkles className="w-3 h-3" /> 共修藏经阁
                            </div>
                            <h5 className="font-serif font-bold text-xl text-white group-hover:text-[#C5A065] transition-colors">
                                添砖加瓦
                            </h5>
                        </div>
                        
                        {/* 动态图标 */}
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C5A065]/20 to-transparent border border-[#C5A065]/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                             <PenTool className="w-5 h-5 text-[#C5A065]" />
                        </div>
                    </div>

                    <p className="text-xs text-stone-400 leading-relaxed font-serif opacity-90 border-l-2 border-[#C5A065]/30 pl-3">
                      古籍浩如烟海，难免遗珠之憾。<br/>诚邀您补全缺漏，让智慧完整传承。
                    </p>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-[#C5A065]/40 text-[#C5A065] hover:bg-[#C5A065] hover:text-[#1c1917] hover:border-[#C5A065] bg-transparent h-9 font-serif font-bold tracking-wide transition-all duration-300"
                    >
                      我要修缮
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}