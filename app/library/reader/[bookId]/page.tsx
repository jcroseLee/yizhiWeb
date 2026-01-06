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
import { createClient } from '@/lib/supabase/client'
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Loader2,
  Menu,
  Search,
  Settings,
  Share2
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

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

type LibraryBookRow = {
  id: string
  title: string
  author: string | null
  dynasty: string | null
  category: string | null
  status: string | null
  cover_url: string | null
  description: string | null
  pdf_url?: string | null
  source_type?: string | null
  source_url?: string | null
  source_payload?: unknown | null
}

type BookContentRow = {
  id: string
  volume_no: number | null
  volume_title: string | null
  chapter_no: number | null
  chapter_title: string | null
  content: string | null
  sort_order: number | null
}

type SlicePage = {
  no: number
  url: string
  path?: string | null
  width?: number | null
  height?: number | null
}

type SliceManifest = {
  bucket?: string | null
  prefix?: string | null
  page_count?: number | null
  pages?: SlicePage[] | null
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const getErrorMessage = (e: unknown, fallback: string) => {
  if (e instanceof Error) return e.message || fallback
  if (isRecord(e) && typeof e.message === 'string' && e.message.trim()) return e.message
  return fallback
}

const getSlicesManifestUrl = (payload: unknown) => {
  if (!payload || !isRecord(payload)) return null
  const slices = payload.slices
  if (!slices || !isRecord(slices)) return null
  const url = slices.manifest_url
  return typeof url === 'string' && url.trim() ? url.trim() : null
}

// -----------------------------------------------------------------------------
// 主页面
// -----------------------------------------------------------------------------
export default function BookReaderPage() {
  const router = useRouter()
  const params = useParams()
  const rawBookId = params.bookId as string | undefined

  const [fontSize, setFontSize] = useState([18])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [book, setBook] = useState<LibraryBookRow | null>(null)
  const [chapters, setChapters] = useState<BookContentRow[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [slicesLoading, setSlicesLoading] = useState(false)
  const [slicesError, setSlicesError] = useState<string | null>(null)
  const [slicesManifest, setSlicesManifest] = useState<SliceManifest | null>(null)
  const [viewMode, setViewMode] = useState<'slices' | 'text'>('text')
  const bookDescription = book?.description ?? null
  const bookPdfUrl = book?.pdf_url ? String(book.pdf_url) : null
  const bookSourceUrl = book?.source_url ? String(book.source_url) : null
  const bookSourcePayload = book?.source_payload ?? null
  const ocrSourcePdfUrl = useMemo(() => {
    const pdf = bookPdfUrl && String(bookPdfUrl).trim() ? String(bookPdfUrl).trim() : null
    if (pdf) return pdf
    const downloadUrl = (() => {
      if (!bookSourcePayload || !isRecord(bookSourcePayload)) return null
      const v = bookSourcePayload.download_url
      return typeof v === 'string' ? v.trim() : null
    })()
    if (downloadUrl && /\.pdf(\?|#|$)/i.test(downloadUrl)) return downloadUrl
    const src = bookSourceUrl && String(bookSourceUrl).trim() ? String(bookSourceUrl).trim() : null
    if (src && /\.pdf(\?|#|$)/i.test(src)) return src
    return null
  }, [bookPdfUrl, bookSourcePayload, bookSourceUrl])

  const slicesManifestUrl = useMemo(() => getSlicesManifestUrl(bookSourcePayload), [bookSourcePayload])

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

  const chapterLabel = (c: BookContentRow) => {
    const vt = (c.volume_title || '').trim()
    const ct = (c.chapter_title || '').trim()
    const vol =
      vt ||
      (typeof c.volume_no === 'number' && Number.isFinite(c.volume_no) ? `卷${c.volume_no}` : '')
    if (vol && ct) return `${vol} · ${ct}`
    return ct || vol || '正文'
  }

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      if (!supabase) {
        setError('Supabase 未配置')
        setLoading(false)
        return
      }

      const bookIdOrTitle = decodeURIComponent(rawBookId || '').trim()
      if (!bookIdOrTitle) {
        setError('缺少书籍参数')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          bookIdOrTitle
        )

        const bookQuery = supabase
          .from('library_books')
          .select('id, title, author, dynasty, category, status, cover_url, description, pdf_url, source_type, source_url, source_payload')

        let bookRow: unknown = null
        let bookError: unknown = null
        const res1 = uuidLike ? await bookQuery.eq('id', bookIdOrTitle).maybeSingle() : await bookQuery.eq('title', bookIdOrTitle).maybeSingle()
        bookRow = res1.data
        bookError = res1.error
        if (bookError) {
          const code = isRecord(bookError) && typeof bookError.code === 'string' ? bookError.code : ''
          const msg = isRecord(bookError) && typeof bookError.message === 'string' ? bookError.message : ''
          if (code === 'PGRST204' || /column.+(pdf_url|source_type|source_url|source_payload)/i.test(msg)) {
            const fallbackQuery = supabase
              .from('library_books')
              .select('id, title, author, dynasty, category, status, cover_url, description')
            const res2 = uuidLike ? await fallbackQuery.eq('id', bookIdOrTitle).maybeSingle() : await fallbackQuery.eq('title', bookIdOrTitle).maybeSingle()
            bookRow = res2.data
            bookError = res2.error
          }
        }

        if (bookError) throw bookError
        if (!bookRow) {
          setError('未找到该书')
          setLoading(false)
          return
        }

        if (!isRecord(bookRow) || typeof bookRow.id !== 'string' || typeof bookRow.title !== 'string') {
          setError('未找到该书')
          setLoading(false)
          return
        }

        const bookTyped = bookRow as unknown as LibraryBookRow
        setBook(bookTyped)

        const { data: contents, error: contentsError } = await supabase
          .from('library_book_contents')
          .select('id, volume_no, volume_title, chapter_no, chapter_title, content, sort_order')
          .eq('book_id', bookTyped.id)
          .order('sort_order', { ascending: true })

        const isMissingContentsTable = (err: unknown) => {
          const status = isRecord(err) && typeof err.status === 'number' ? err.status : null
          const code = isRecord(err) && typeof err.code === 'string' ? err.code : ''
          const msg = isRecord(err) && typeof err.message === 'string' ? err.message : ''
          if (status === 404) return true
          if (code === '42P01') return true
          if (/PGRST(10\d|20\d)/i.test(code)) return true
          return /library_book_contents/i.test(msg) && /does not exist|not found/i.test(msg)
        }

        if (contentsError) {
          if (isMissingContentsTable(contentsError)) {
            setChapters([])
            setActiveIndex(0)
            return
          }
          throw contentsError
        }

        const list = (contents || []) as BookContentRow[]
        setChapters(list)
        setActiveIndex(0)
      } catch (e: unknown) {
        setError(getErrorMessage(e, '加载失败'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [rawBookId])

  useEffect(() => {
    setOcrError(null)
    setOcrLoading(false)
  }, [book?.id])

  useEffect(() => {
    setSlicesError(null)
    setSlicesLoading(false)
    setSlicesManifest(null)
  }, [book?.id])

  useEffect(() => {
    if (slicesManifestUrl) setViewMode('slices')
  }, [slicesManifestUrl])

  useEffect(() => {
    const loadManifest = async () => {
      if (!slicesManifestUrl) return
      setSlicesLoading(true)
      setSlicesError(null)
      try {
        const res = await fetch(slicesManifestUrl, { method: 'GET' })
        const json = (await res.json().catch(() => null)) as unknown
        if (!res.ok) throw new Error(`切片清单加载失败 (${res.status})`)
        if (!isRecord(json)) throw new Error('切片清单格式错误')
        const rawPages = Array.isArray((json as any).pages) ? ((json as any).pages as unknown[]) : []
        const pages: SlicePage[] = rawPages
          .map((p) => {
            if (!isRecord(p)) return null
            const no = typeof p.no === 'number' ? p.no : null
            const url = typeof p.url === 'string' ? p.url.trim() : ''
            if (!no || !url) return null
            return {
              no,
              url,
              path: typeof p.path === 'string' ? p.path : null,
              width: typeof p.width === 'number' ? p.width : null,
              height: typeof p.height === 'number' ? p.height : null,
            } as SlicePage
          })
          .filter((x): x is SlicePage => !!x)
        if (!pages.length) throw new Error('切片清单为空')
        setSlicesManifest({
          bucket: typeof (json as any).bucket === 'string' ? (json as any).bucket : null,
          prefix: typeof (json as any).prefix === 'string' ? (json as any).prefix : null,
          page_count: typeof (json as any).page_count === 'number' ? (json as any).page_count : pages.length,
          pages,
        })
      } catch (e: unknown) {
        setSlicesError(getErrorMessage(e, '切片清单加载失败'))
        setSlicesManifest(null)
      } finally {
        setSlicesLoading(false)
      }
    }
    loadManifest()
  }, [slicesManifestUrl])

  useEffect(() => {
    const runOcr = async () => {
      if (!book?.id) return
      if (chapters.length > 0) return
      if (!ocrSourcePdfUrl && !slicesManifestUrl) return
      if (ocrError) return

      setOcrLoading(true)
      setOcrError(null)
      try {
        const res = await fetch(`/api/library/books/${encodeURIComponent(book.id)}/ocr`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
        const json = (await res.json().catch(() => null)) as unknown
        if (!res.ok) {
          const msg = isRecord(json) && typeof json.error === 'string' ? json.error : `OCR 失败 (${res.status})`
          throw new Error(msg)
        }
        const nextChapters =
          isRecord(json) && Array.isArray(json.chapters) ? (json.chapters as BookContentRow[]) : []
        if (!nextChapters.length) throw new Error('OCR 结果为空')
        setChapters(nextChapters)
        setActiveIndex(0)
      } catch (e: unknown) {
        setOcrError(getErrorMessage(e, 'OCR 失败'))
      } finally {
        setOcrLoading(false)
      }
    }
    runOcr()
  }, [book?.id, bookDescription, chapters.length, ocrSourcePdfUrl, ocrError, slicesManifestUrl])

  const chapterList = useMemo(() => {
    if (chapters.length) return chapters
    const fallbackContent = ocrSourcePdfUrl && !ocrError ? null : bookDescription
    return [
      {
        id: 'fallback',
        volume_no: 1,
        volume_title: null,
        chapter_no: 1,
        chapter_title: '正文',
        content: fallbackContent,
        sort_order: 1,
      } as BookContentRow,
    ]
  }, [chapters, bookDescription, ocrError, ocrSourcePdfUrl])

  const safeActiveIndex = Math.max(0, Math.min(activeIndex, chapterList.length - 1))
  const activeChapter = chapterList[safeActiveIndex] || null
  const activeChapterTitle = activeChapter ? chapterLabel(activeChapter) : ''
  const slicePages = slicesManifest?.pages || []
  const safeActivePageIndex = Math.max(0, Math.min(activeIndex, slicePages.length - 1))
  const activeSlicePage = slicePages[safeActivePageIndex] || null
  const activeSliceTitle = activeSlicePage ? `第${activeSlicePage.no}页` : ''
  const activeTitle = viewMode === 'slices' ? activeSliceTitle : activeChapterTitle
  const contentParagraphs = useMemo(() => {
    const raw = (activeChapter?.content || '').replace(/\r\n/g, '\n').trim()
    if (!raw) return []
    return raw
      .split(/\n{2,}/g)
      .map((x) => x.trim())
      .filter(Boolean)
  }, [activeChapter?.content])

  const hasPrev = viewMode === 'slices' ? safeActivePageIndex > 0 : safeActiveIndex > 0
  const hasNext =
    viewMode === 'slices' ? safeActivePageIndex < slicePages.length - 1 : safeActiveIndex < chapterList.length - 1

  const canSlice = !!book?.id && !!ocrSourcePdfUrl && !slicesManifestUrl

  const handleSlice = async () => {
    if (!book?.id) return
    if (!canSlice) return
    setSlicesLoading(true)
    setSlicesError(null)
    try {
      const res = await fetch(`/api/library/books/${encodeURIComponent(book.id)}/slices`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = (await res.json().catch(() => null)) as unknown
      if (!res.ok) {
        const msg = isRecord(json) && typeof json.error === 'string' ? json.error : `切片失败 (${res.status})`
        throw new Error(msg)
      }
      const manifestUrl =
        isRecord(json) && isRecord((json as any).slices) && typeof (json as any).slices.manifest_url === 'string'
          ? String((json as any).slices.manifest_url).trim()
          : ''
      if (!manifestUrl) throw new Error('切片服务未返回 manifest_url')
      setBook((prev) => {
        if (!prev) return prev
        const prevPayload = isRecord(prev.source_payload) ? (prev.source_payload as Record<string, unknown>) : {}
        return {
          ...prev,
          source_payload: {
            ...prevPayload,
            slices: {
              ...(isRecord(prevPayload.slices) ? (prevPayload.slices as Record<string, unknown>) : {}),
              ...(isRecord((json as any).slices) ? ((json as any).slices as Record<string, unknown>) : {}),
              manifest_url: manifestUrl,
            },
          },
        }
      })
      setViewMode('slices')
    } catch (e: unknown) {
      setSlicesError(getErrorMessage(e, '切片失败'))
    } finally {
      setSlicesLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <style jsx global>{styles}</style>
        <div className="min-h-screen paper-texture flex items-center justify-center text-stone-600">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          载入中...
        </div>
      </>
    )
  }

  if (error || !book) {
    return (
      <>
        <style jsx global>{styles}</style>
        <div className="min-h-screen paper-texture flex items-center justify-center text-stone-600">
          <div className="text-center">
            <div className="text-sm text-red-700">{error || '加载失败'}</div>
            <Button className="mt-4" variant="outline" onClick={() => router.push('/library/books')}>
              返回馆藏目录
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style jsx global>{styles}</style>
      
      <div className="flex flex-col h-screen paper-texture overflow-hidden text-stone-800">
        
        {/* 1. 顶部导航栏 (沉浸式) */}
        <header className="flex-none h-14 border-b border-stone-200/60 bg-[#fdfbf7]/90 backdrop-blur-md px-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="hover:bg-stone-100 text-stone-600" onClick={() => router.push('/library/books')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold font-serif text-stone-800">{book.title}</h1>
                <Badge variant="secondary" className="text-[10px] h-5 bg-white/60 backdrop-blur-sm border-stone-200 text-stone-500 px-1.5 shadow-none">
                  {normalizeCategory(book.category)}
                </Badge>
                <Badge variant="secondary" className="text-[10px] h-5 bg-white/60 backdrop-blur-sm border-stone-200 text-stone-500 px-1.5 shadow-none">
                  {normalizeStatus(book.status)}
                </Badge>
              </div>
              <span className="text-[10px] text-stone-500">{activeTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-stone-500 hover:text-stone-800"
              disabled={viewMode === 'slices' ? !slicePages.length : !chapterList.length}
              onClick={() => setViewMode((m) => (m === 'slices' ? 'text' : 'slices'))}
            >
              {viewMode === 'slices' ? '文字' : '切片'}
            </Button>
            {canSlice && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-stone-300 text-stone-700 hover:text-[#C82E31] hover:border-[#C82E31]"
                disabled={slicesLoading}
                onClick={handleSlice}
              >
                {slicesLoading ? '切片中...' : '生成切片'}
              </Button>
            )}
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
                {viewMode === 'slices'
                  ? slicePages.map((p, i) => (
                      <div
                        key={p.path || p.no || i}
                        className={`
                      group px-3 py-2.5 rounded-md text-sm cursor-pointer font-serif flex items-center gap-2 transition-colors
                      ${i === safeActivePageIndex
                          ? 'bg-white text-[#C82E31] font-bold shadow-sm border border-stone-100'
                          : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                        }
                    `}
                        onClick={() => setActiveIndex(i)}
                      >
                        <div
                          className={`w-1 h-1 rounded-full ${i === safeActivePageIndex ? 'bg-[#C82E31]' : 'bg-transparent group-hover:bg-stone-300'}`}
                        />
                        第{p.no}页
                      </div>
                    ))
                  : chapterList.map((chapter, i) => (
                      <div
                        key={chapter.id || i}
                        className={`
                      group px-3 py-2.5 rounded-md text-sm cursor-pointer font-serif flex items-center gap-2 transition-colors
                      ${i === safeActiveIndex
                          ? 'bg-white text-[#C82E31] font-bold shadow-sm border border-stone-100'
                          : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                        }
                    `}
                        onClick={() => setActiveIndex(i)}
                      >
                        <div className={`w-1 h-1 rounded-full ${i === safeActiveIndex ? 'bg-[#C82E31]' : 'bg-transparent group-hover:bg-stone-300'}`} />
                        {chapterLabel(chapter)}
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
                  <span className="text-xs text-stone-400 font-serif tracking-widest uppercase mb-2 block">Chapter</span>
                  <h2 className="text-3xl font-bold font-serif text-stone-900 mb-4">{activeTitle || '正文'}</h2>
                  <div className="flex items-center justify-center gap-4 text-xs text-stone-500">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> 原文</span>
                    <span>•</span>
                    <span>{(book.author || '佚名').trim()} 著</span>
                  </div>
                </div>

                {viewMode === 'slices' ? (
                  <div className="space-y-4">
                    {slicesError && <div className="text-sm text-red-700">{slicesError}</div>}
                    {slicesLoading && (
                      <div className="flex items-center gap-2 text-stone-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">正在加载切片...</span>
                      </div>
                    )}
                    {!slicesLoading && activeSlicePage?.url ? (
                      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
                        <img src={activeSlicePage.url} alt={activeSliceTitle || 'page'} className="w-full h-auto block" />
                      </div>
                    ) : !slicesLoading ? (
                      <div className="text-stone-500">
                        <div className="text-sm">暂无切片</div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <article
                    className="prose prose-stone max-w-none font-serif text-stone-800 leading-loose"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {contentParagraphs.length > 0 ? (
                      contentParagraphs.map((p, idx) => <p key={idx}>{p.replace(/\n/g, ' ')}</p>)
                    ) : (
                      <div className="text-stone-500 space-y-3">
                        {ocrLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">正在将 PDF OCR 转换为文字...</span>
                          </div>
                        ) : ocrError ? (
                          <div className="text-sm text-red-700">{ocrError}</div>
                        ) : ocrSourcePdfUrl ? (
                          <div className="text-sm">正在准备 OCR 文本...</div>
                        ) : (
                          <p>暂无正文内容</p>
                        )}
                      </div>
                    )}
                  </article>
                )}

                {/* 底部翻页 */}
                <div className="flex justify-between items-center mt-16 pt-8 border-t border-stone-200">
                  <Button
                    variant="ghost"
                    className="text-stone-500 hover:text-stone-800"
                    disabled={!hasPrev}
                    onClick={() => setActiveIndex((x) => Math.max(0, x - 1))}
                  >
                    {viewMode === 'slices' ? '上一页' : '上一章'}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-stone-300 text-stone-700 hover:text-[#C82E31] hover:border-[#C82E31]"
                    disabled={!hasNext}
                    onClick={() =>
                      setActiveIndex((x) =>
                        Math.min((viewMode === 'slices' ? slicePages.length : chapterList.length) - 1, x + 1)
                      )
                    }
                  >
                    {viewMode === 'slices' ? '下一页' : '下一章'}
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
