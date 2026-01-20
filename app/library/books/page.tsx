'use client'

import {
  CheckCircle2,
  ChevronRight,
  History,
  LayoutGrid,
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
import { Skeleton } from '@/lib/components/ui/skeleton'
import { trackEvent } from '@/lib/analytics'
import { getCurrentUser } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/client'
import { BookCover } from '../components/BookCover'
import { BookUploadCard } from '../components/BookUploadCard'

// --- 样式补丁 ---
const styles = `
  /* 全局宣纸纹理 */
  .paper-texture {
    background-color: #F9F7F2;
    background-image: 
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E"),
      linear-gradient(to bottom, rgba(255,255,255,0.8) 0%, rgba(249,247,242,0) 100%);
  }
  
  /* 隐藏滚动条 */
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* 书架底部投影 */
  .shelf-shadow {
    background: radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 70%);
  }
  
  /* 书籍悬停上浮动画 */
  .book-lift {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .book-lift:hover {
    transform: translateY(-0.375rem) scale(1.02);
    z-index: 10;
  }
`

type LibraryBookRow = {
  id: string
  title: string
  author: string | null
  dynasty: string | null
  category: string | null
  status: string | null
  cover_url: string | null
  volume_type: 'none' | 'upper' | 'lower' | null
  is_manually_reviewed: boolean | null
  source_payload?: any
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
  volumeType: 'none' | 'upper' | 'lower' | null
  isManuallyReviewed: boolean
}

type BookWithContentProgress = DisplayBook & {
  contentProgress: number
}

const DYNASTIES = ['先秦', '汉唐', '宋元', '明清', '民国', '现代']

export default function AllBooksPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('全部藏书')
  const [activeDynasty, setActiveDynasty] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [books, setBooks] = useState<DisplayBook[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // --- 数据处理逻辑 (保持不变) ---
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
          .select('id, title, author, dynasty, category, status, cover_url, volume_type, is_manually_reviewed, source_payload')
          .in('status', ['reviewed', 'published'])
          .order('created_at', { ascending: false })
          .limit(500)

        if (error) throw error

        const rows = (data || []) as (LibraryBookRow & { source_payload?: any })[]
        
        const booksWithContentProgress: BookWithContentProgress[] = await Promise.all(
          rows.map(async (x) => {
            const slicesInfo = x.source_payload?.slices
            const expectedPageCount = slicesInfo?.page_count
              ? (typeof slicesInfo.page_count === 'number' && Number.isFinite(slicesInfo.page_count) && slicesInfo.page_count > 0
                  ? Math.floor(slicesInfo.page_count)
                  : null)
              : null

            let contentProgress = 0
            if (expectedPageCount && slicesInfo?.prefix && slicesInfo?.bucket) {
              let uploadedCount = 0
              if (slicesInfo.manifest_url) {
                try {
                  const manifestRes = await fetch(slicesInfo.manifest_url)
                  if (manifestRes.ok) {
                    const manifest = await manifestRes.json()
                    if (manifest && Array.isArray(manifest.pages)) uploadedCount = manifest.pages.length
                  }
                } catch (e) {}
              }
              if (uploadedCount === 0) {
                try {
                  const { count } = await supabase
                    .from('library_book_contents')
                    .select('*', { count: 'exact', head: true })
                    .eq('book_id', x.id)
                  if (count !== null) uploadedCount = count
                } catch (e) {}
              }
              contentProgress = uploadedCount > 0 ? Math.min(100, Math.round((uploadedCount / expectedPageCount) * 100)) : 0
            }

            const categoryLabel = normalizeCategory(x.category)
            return {
              id: x.id,
              title: x.title,
              author: (x.author || '佚名').trim(),
              dynasty: (x.dynasty || '佚').trim(),
              categoryLabel,
              statusLabel: normalizeStatus(x.status),
              progress: 0,
              contentProgress,
              color: categoryColor(categoryLabel),
              volumeType: x.volume_type || 'none',
              isManuallyReviewed: x.is_manually_reviewed === true,
            }
          })
        )

        const completedBooks = booksWithContentProgress.filter((b) => b.contentProgress === 100)
        
        // Load user progress
        const { data: authData } = await supabase.auth.getUser()
        if (authData.user?.id && completedBooks.length > 0) {
           const bookIds = completedBooks.map((b) => b.id)
           const { data: progressRows } = await supabase
            .from('library_reading_progress')
            .select('book_id, progress')
            .in('book_id', bookIds)
            
            const progressMap = new Map<string, number>()
            progressRows?.forEach((row: any) => {
                if (row.book_id && typeof row.progress === 'number') {
                    progressMap.set(row.book_id, Math.max(0, Math.min(100, Math.round(row.progress))))
                }
            })
            
            setBooks(completedBooks.map(({ contentProgress, ...rest }) => ({
                ...rest,
                progress: progressMap.get(rest.id) ?? 0,
            })))
        } else {
             setBooks(completedBooks.map(({ contentProgress, ...rest }) => rest))
        }

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

  const handleFileSelect = async (file: File) => {
    const isPdf = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      throw new Error('格式不支持')
    }
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('文件过大 (>100MB)')
    }

    const user = await getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }
    const supabase = createClient()
    if (!supabase) throw new Error('Client Error')

    const resourceId = crypto.randomUUID()
    const fileExt = file.name.split('.').pop() || (isPdf ? 'pdf' : 'jpg')
    const fileName = `${resourceId}.${fileExt}`
    const storagePath = `${user.id}/${resourceId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('user_resources')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('user_resources').getPublicUrl(storagePath)

    const { error: dbError } = await supabase.from('user_resources').insert({
      user_id: user.id,
      file_name: file.name,
      file_type: isPdf ? 'pdf' : 'image',
      file_size: file.size,
      file_url: urlData.publicUrl,
      storage_path: storagePath,
      status: 'pending'
    })
    
    if (dbError) throw dbError
  }

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return books.filter((b) => {
      if (activeCategory !== '全部藏书' && b.categoryLabel !== activeCategory) return false
      if (activeDynasty && b.dynasty !== activeDynasty) return false
      if (!q) return true
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.dynasty.toLowerCase().includes(q)
      )
    })
  }, [books, searchQuery, activeCategory, activeDynasty])

  useEffect(() => {
    const keyword = searchQuery.trim()
    if (!keyword) return
    const t = window.setTimeout(() => {
      trackEvent('library_search', { keyword, has_result: filteredBooks.length > 0 })
    }, 500)
    return () => window.clearTimeout(t)
  }, [searchQuery, filteredBooks.length])

  const handleUploadClick = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?redirect=/library/books')
      return
    }
  }

  return (
    <>
      <style jsx global>{styles}</style>
      
      {/* 
        主容器：h-screen 确保占满屏幕高度，不可滚动。
        flex-col 布局将 Header 固定在顶部。
      */}
      <div className="flex flex-col h-[calc(100vh-5.5rem)] overflow-x-hidden overflow-y-hidden paper-texture text-stone-800">
        
        {/* --- Header: 固定高度，不随页面滚动 --- */}
        <div className="flex-none px-6 lg:px-8 py-4 border-b border-stone-200/50 bg-[#F9F7F2]/90 backdrop-blur-md z-50">
          <div className="max-w-[120rem] mx-auto w-full flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Left: Title */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-stone-400 hover:text-stone-800 hover:bg-stone-200/50 rounded-full -ml-3"
                onClick={() => router.push('/library')}
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Button>
              <h1 className="text-xl font-bold font-serif text-stone-900 tracking-tight flex items-center gap-2">
                <span className="w-1 h-4 bg-[#C82E31] rounded-full inline-block"></span>
                馆藏目录
              </h1>
              <Badge variant="secondary" className="bg-stone-100 text-stone-500 font-normal px-2 text-xs">
                  {books.length} 部
              </Badge>
            </div>

            {/* Right: Search & Sort */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-[17.5rem] group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 group-focus-within:text-[#C82E31] transition-colors" />
                <Input
                  placeholder="检索书名、作者..."
                  className="pl-9 h-9 bg-white/60 border-stone-200 focus-visible:ring-[#C82E31]/20 focus-visible:border-[#C82E31] rounded-full shadow-sm text-xs transition-all hover:bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select defaultValue="popular">
                <SelectTrigger className="w-[7.5rem] h-9 bg-white/60 border-stone-200 rounded-full shadow-sm text-xs">
                  <SortAsc className="w-3.5 h-3.5 mr-2 text-stone-500" />
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

        {/* --- Content Body: 占据剩余空间 --- */}
        <div className="flex-1 flex overflow-hidden max-w-[120rem] mx-auto w-full">
            
            {/* 
              Left Sidebar: 
              固定宽度，高度跟随父容器 (h-full)，
              内部 overflow-y-auto 实现独立滚动。
            */}
            <div className="w-56 hidden lg:flex flex-col border-r border-stone-200/40 bg-[#F9F7F2]/50 h-full overflow-y-auto hide-scrollbar py-6 pr-4 pl-6">
              <div className="space-y-6">
                
                {/* 学科分类 */}
                <div>
                  <h3 className="text-[0.625rem] font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 px-2">
                    <LayoutGrid className="w-3 h-3" /> 学科分类
                  </h3>
                  <div className="space-y-0.5">
                    {categories.map((cat) => {
                      const isActive = activeCategory === cat.name
                      return (
                        <button
                          key={cat.name}
                          className={`w-full text-left py-1.5 px-3 rounded-md text-sm transition-all duration-200 flex justify-between items-center group relative ${
                            isActive
                              ? 'bg-white shadow-sm text-stone-900 font-bold'
                              : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/30'
                          }`}
                          onClick={() => setActiveCategory(cat.name)}
                        >
                          {isActive && <div className="absolute left-0 h-4 w-0.5 bg-[#C82E31] rounded-r-full" />}
                          <span className="font-serif tracking-wide">{cat.name}</span>
                          <span className={`text-[0.625rem] ${isActive ? 'text-stone-600' : 'text-stone-500 group-hover:text-stone-400'}`}>
                            {cat.count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Separator className="bg-stone-200/50" />

                {/* 年代检索 */}
                <div>
                  <h3 className="text-[0.625rem] font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 px-2">
                    <History className="w-3 h-3" /> 年代检索
                  </h3>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {DYNASTIES.map((dynasty) => {
                      const isActive = activeDynasty === dynasty
                      return (
                        <Badge
                          key={dynasty}
                          variant="outline"
                          onClick={() => setActiveDynasty(isActive ? null : dynasty)}
                          className={`cursor-pointer transition-all font-serif text-[0.6875rem] px-2 py-0.5 font-normal ${
                            isActive
                              ? 'bg-[#C82E31] border-[#C82E31] text-white hover:bg-[#A02528]'
                              : 'bg-white/40 border-stone-200/60 text-stone-500 hover:border-[#C82E31] hover:text-[#C82E31] hover:bg-white'
                          }`}
                        >
                          {dynasty}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 
              Right Content: 
              flex-1 占据剩余宽度，h-full 占据剩余高度。
              内部 ScrollArea 处理滚动。
            */}
            <div className="flex-1 h-full bg-transparent relative">
              <ScrollArea className="h-full w-full">
                <div className="p-6 lg:p-8 pb-32">
                  
                  {/* Mobile Filter */}
                  <div className="flex items-center gap-2 mb-6 lg:hidden overflow-x-auto pb-1 hide-scrollbar">
                    {categories.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          activeCategory === cat.name
                            ? 'bg-[#C82E31] text-white'
                            : 'bg-white border border-stone-200 text-stone-600'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* 
                    Books Grid:
                    Increased grid columns (md:4, lg:5, xl:6) to make items smaller.
                    Reduced gap (gap-x-6, gap-y-10).
                  */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-8 gap-y-10">
                    
                    {/* Upload Card - Placed before books list */}
                    {!loading && (
                      <BookUploadCard
                        onFileSelect={handleFileSelect}
                        onUploadClick={handleUploadClick}
                      />
                    )}

                    {loading ? (
                      Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="w-full aspect-2/3 relative mb-3">
                            <Skeleton className="w-full h-full rounded-sm bg-stone-200/50" />
                          </div>
                          <div className="w-full px-1 space-y-2">
                            <Skeleton className="h-3 w-3/4 bg-stone-200/50" />
                            <Skeleton className="h-2 w-1/2 bg-stone-200/50" />
                          </div>
                        </div>
                      ))
                    ) : filteredBooks.map((book) => (
                      <div key={book.id} className="group relative flex flex-col items-center perspective-midrange">
                        
                        {/* Book Cover Container */}
                        <div 
                          className="relative w-full book-lift cursor-pointer"
                          onClick={() => handleBookClick(book.id)}
                        >
                           {/* 
                             Constraint: Do not modify BookCover functionality. 
                             Assuming BookCover fits width:100% of parent. 
                           */}
                           <BookCover
                            id={book.id}
                            title={book.title}
                            author={book.author}
                            dynasty={book.dynasty}
                            color={book.color}
                            volumeType={book.volumeType}
                            isManuallyReviewed={book.isManuallyReviewed}
                            onClick={() => handleBookClick(book.id)}
                          />
                          {/* 底部柔和阴影 */}
                          <div className="absolute -bottom-3 left-3 right-3 h-2 rounded-[100%] shelf-shadow opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[0.125rem] pointer-events-none" />
                        </div>

                        {/* Metadata Info - Scaled down font sizes */}
                        <div className="mt-3 w-full px-1 relative z-0">
                          <div className="flex justify-between items-start gap-1">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold font-serif text-stone-800 text-sm truncate group-hover:text-[#C82E31] transition-colors">
                                {book.title}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[0.625rem] text-stone-500 font-medium bg-stone-100 px-1 py-px rounded-[0.125rem] truncate max-w-[3.75rem]">
                                  {book.dynasty}
                                </span>
                                <span className="text-[0.625rem] text-stone-400 truncate">
                                  {book.author}
                                </span>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-stone-300 hover:text-stone-800 hover:bg-stone-100 rounded-full opacity-0 group-hover:opacity-100 transition-all -mr-1"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Progress Bar (Miniature) */}
                          {book.progress > 0 && book.progress < 100 && (
                            <div className="mt-2 group/progress">
                               <div className="h-0.5 w-full bg-stone-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#C82E31] rounded-full"
                                    style={{ width: `${book.progress}%` }}
                                  />
                               </div>
                            </div>
                          )}
                          
                          {/* Read Badge */}
                          {book.progress === 100 && (
                            <div className="mt-2 flex items-center gap-1 text-[0.625rem] text-green-600 opacity-60">
                                <CheckCircle2 className="w-2.5 h-2.5" /> 已读
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {!loading && loadError && (
                    <div className="mt-20 text-center">
                        <p className="text-stone-400 text-sm">{loadError}</p>
                    </div>
                  )}
                  
                </div>
              </ScrollArea>
            </div>
        </div>
      </div>
    </>
  )
}
