'use client'

import {
    Book,
    CheckCircle2,
    ChevronRight,
    History,
    Library,
    MoreHorizontal,
    Search,
    SortAsc
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/lib/components/ui/select'
import { Separator } from '@/lib/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

type LibraryBookRow = {
  id: string
  title: string
  author: string | null
  dynasty: string | null
  category: string | null
  status: string | null
  cover_url: string | null
}

type DisplayBook = {
  id: string
  title: string
  author: string
  dynasty: string
  categoryLabel: string
  statusLabel: string
  progress: number
  color: string
}

const DYNASTIES = ['先秦', '汉唐', '宋元', '明清', '民国', '现代']

export default function AllBooksPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('全部藏书')
  const [searchQuery, setSearchQuery] = useState('')
  const [books, setBooks] = useState<DisplayBook[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const normalizeCategory = (raw: string | null | undefined) => {
    const v = (raw || '').trim()
    if (!v) return '其他'
    if (v.includes('六爻')) return '六爻预测'
    if (v.includes('四柱') || v.includes('八字') || v.includes('命理')) return '四柱命理'
    if (v.includes('风水') || v.includes('堪舆')) return '风水堪舆'
    if (v.includes('奇门')) return '奇门遁甲'
    if (v.includes('梅花')) return '梅花易数'
    if (v.includes('紫微')) return '紫微斗数'
    if (v.includes('相术') || v.includes('面相') || v.includes('相')) return '相术/面相'
    if (v.includes('古籍')) return '其他'
    return v
  }

  const normalizeStatus = (raw: string | null | undefined) => {
    const v = (raw || '').trim()
    if (!v) return '未知'
    if (v.includes('精校')) return '精校版'
    if (v.includes('全')) return '全本'
    if (v.includes('残')) return '残卷'
    if (v.includes('拓')) return '拓本'
    if (v.includes('图')) return '图解'
    if (v.includes('采集')) return '采集导入'
    return v
  }

  const categoryColor = (categoryLabel: string) => {
    if (categoryLabel === '六爻预测') return 'bg-[#F0F0ED]'
    if (categoryLabel === '四柱命理') return 'bg-[#F2EFE9]'
    if (categoryLabel === '风水堪舆') return 'bg-[#EFEDEA]'
    if (categoryLabel === '奇门遁甲') return 'bg-[#EDEFEF]'
    if (categoryLabel === '梅花易数') return 'bg-[#F0F0ED]'
    if (categoryLabel === '紫微斗数') return 'bg-[#EBEBEB]'
    if (categoryLabel === '相术/面相') return 'bg-[#EFEFEF]'
    return 'bg-[#FFFFFF]'
  }

  const categories = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of books) {
      map.set(b.categoryLabel, (map.get(b.categoryLabel) || 0) + 1)
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    return [{ name: '全部藏书', count: books.length }, ...entries.map(([name, count]) => ({ name, count }))]
  }, [books])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      if (!supabase) {
        setLoadError('Supabase 未配置')
        return
      }
      setLoading(true)
      setLoadError(null)
      try {
        const { data, error } = await supabase
          .from('library_books')
          .select('id, title, author, dynasty, category, status, cover_url')
          .order('created_at', { ascending: false })
          .limit(500)

        if (error) throw error

        const rows = (data || []) as LibraryBookRow[]
        setBooks(
          rows.map((x) => {
            const categoryLabel = normalizeCategory(x.category)
            return {
              id: x.id,
              title: x.title,
              author: (x.author || '佚名').trim(),
              dynasty: (x.dynasty || '佚').trim(),
              categoryLabel,
              statusLabel: normalizeStatus(x.status),
              progress: 0,
              color: categoryColor(categoryLabel),
            }
          })
        )
      } catch (e: any) {
        setLoadError(e?.message || '加载失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleBookClick = (bookId: string) => {
    router.push(`/library/reader/${encodeURIComponent(bookId)}`)
  }

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return books.filter((b) => {
      if (activeCategory !== '全部藏书' && b.categoryLabel !== activeCategory) return false
      if (!q) return true
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.dynasty.toLowerCase().includes(q)
      )
    })
  }, [books, searchQuery, activeCategory])

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      {/* 1. Header: 简约的顶部栏 */}
      <div className="flex-none px-8 py-6 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 hover:text-slate-900 -ml-2"
              onClick={() => router.push('/library')}
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <h1 className="text-2xl font-bold font-serif text-slate-900 flex items-center gap-2">
              馆藏目录
              <span className="text-sm font-sans font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {books.length} 部
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索书名、作者、朝代..."
                className="pl-9 bg-slate-50 border-slate-200 focus-visible:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select defaultValue="popular">
              <SelectTrigger className="w-[130px] bg-white">
                <SortAsc className="w-4 h-4 mr-2 text-slate-500" />
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">最受欢迎</SelectItem>
                <SelectItem value="newest">最新收录</SelectItem>
                <SelectItem value="oldest">年代最久</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Main Content: 双栏布局 */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full h-full flex">
          {/* Left Sidebar: 分类索引 */}
          <div className="w-64 hidden lg:flex flex-col border-r border-slate-200 bg-white/50 h-full overflow-y-auto py-8 pr-6 pl-8">
            <div className="space-y-6">
              {/* 主要分类 */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                  学科分类
                </h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <Button
                      key={cat.name}
                      variant={activeCategory === cat.name ? 'secondary' : 'ghost'}
                      className={`w-full justify-between font-normal ${
                        activeCategory === cat.name
                          ? 'bg-[#C82E31]/10 text-[#C82E31] font-medium'
                          : 'text-slate-600'
                      }`}
                      onClick={() => setActiveCategory(cat.name)}
                    >
                      <span className="flex items-center">
                        {activeCategory === cat.name && (
                          <Library className="w-3.5 h-3.5 mr-2" />
                        )}
                        {cat.name}
                      </span>
                      <span className="text-xs text-slate-400">{cat.count}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 朝代筛选 */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                  按年代检索
                </h3>
                <div className="flex flex-wrap gap-2 px-2">
                  {DYNASTIES.map((dynasty) => (
                    <Badge
                      key={dynasty}
                      variant="outline"
                      className="cursor-pointer hover:border-slate-400 hover:bg-white text-slate-500 font-normal"
                    >
                      {dynasty}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 我的书架 */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full justify-start text-slate-600 border-dashed border-slate-300"
                >
                  <History className="w-4 h-4 mr-2" />
                  最近阅读
                </Button>
              </div>
            </div>
          </div>

          {/* Right Content: 书籍网格 */}
          <ScrollArea className="flex-1 h-full">
            <div className="p-8 pb-20">
              {/* 顶部标签栏 (Mobile Filter Placeholder) */}
              <div className="flex items-center gap-2 mb-6 lg:hidden overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat.name}
                    variant={activeCategory === cat.name ? 'default' : 'secondary'}
                    className="whitespace-nowrap"
                    onClick={() => setActiveCategory(cat.name)}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-8 gap-y-10">
                {filteredBooks.map((book) => (
                  <div key={book.id} className="group relative flex flex-col items-center">
                    {/* 书籍拟物化主体 */}
                    <div
                      className="relative w-full aspect-[2/3] cursor-pointer transition-all duration-300 group-hover:-translate-y-2"
                      onClick={() => handleBookClick(book.id)}
                    >
                      {/* 阴影层 - Hover时加深 */}
                      <div className="absolute top-2 left-2 w-full h-full bg-slate-200 rounded-sm -z-10 transition-all duration-300 group-hover:top-3 group-hover:left-3 group-hover:bg-slate-300" />

                      {/* 封面主体 */}
                      <div
                        className={`${book.color} w-full h-full rounded-sm border border-stone-200/60 shadow-sm overflow-hidden relative flex flex-col`}
                      >
                        {/* 左侧装订区 */}
                        <div className="absolute left-0 top-0 bottom-0 w-[14px] bg-black/5 border-r border-black/5 z-10 flex flex-col justify-around py-4 items-center">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-full h-[1px] bg-stone-400/40" />
                          ))}
                        </div>

                        {/* 状态徽章 */}
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 bg-white/60 backdrop-blur-sm border-stone-200 text-stone-500 px-1.5 shadow-none"
                          >
                            {book.statusLabel}
                          </Badge>
                        </div>

                        {/* 封面内容 */}
                        <div className="flex-1 flex items-center justify-center pl-4">
                          <div className="bg-white/50 border border-stone-800/20 px-3 py-6 min-h-[60%] flex items-center justify-center shadow-inner">
                            <h3
                              className="font-serif text-lg md:text-xl font-bold text-slate-900 tracking-[0.2em] leading-relaxed"
                              style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                            >
                              {book.title}
                            </h3>
                          </div>
                        </div>

                        {/* 底部朝代/作者 (封面内) */}
                        <div className="absolute bottom-3 right-3 text-[10px] text-stone-500 font-serif flex flex-col items-end gap-0.5 opacity-60">
                          <span>{book.dynasty}</span>
                          <span>{book.author}</span>
                        </div>
                      </div>

                      {/* Hover Overlay: 快速操作 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pl-4">
                        <Button
                          size="sm"
                          className="bg-[#C82E31] text-white hover:bg-[#a61b1f] shadow-lg scale-90 group-hover:scale-100 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleBookClick(book.id)
                          }}
                        >
                          立即阅读
                        </Button>
                      </div>
                    </div>

                    {/* 底部信息 (Metadata) */}
                    <div className="mt-4 w-full px-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm truncate">
                            {book.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {book.author} · {book.dynasty}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-300 hover:text-slate-600"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* 阅读进度条 (如果有) */}
                      {book.progress > 0 && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C82E31] rounded-full"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#C82E31] font-medium">
                            {book.progress}%
                          </span>
                        </div>
                      )}

                      {/* 已读完标记 */}
                      {book.progress === 100 && (
                        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 已读完
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 模拟上传新书的空位 (Optional) */}
                <div className="flex flex-col items-center justify-start pt-[30%] border-2 border-dashed border-slate-200 rounded-sm aspect-[2/3] hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all mb-3">
                    <Book className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-500">申请收录</span>
                  <span className="text-xs text-slate-400 mt-1">上传 PDF / 图片</span>
                </div>
              </div>
              {loading && (
                <div className="mt-10 text-center text-sm text-slate-400">加载中...</div>
              )}
              {!loading && loadError && (
                <div className="mt-10 text-center text-sm text-red-600">{loadError}</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
