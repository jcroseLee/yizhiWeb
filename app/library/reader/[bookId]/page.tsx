'use client'

import { trackEvent } from '@/lib/analytics'
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
  PanelRight,
  Search,
  Settings,
  Share2,
  X
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ... (Styles and Constants remain unchanged, omitted for brevity to focus on layout) ...
const styles = `
  /* ... (原有样式代码保持不变) ... */
  .paper-texture {
    background-color: #fdfbf7;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
  }
  .vertical-rl { writing-mode: vertical-rl; text-orientation: upright; letter-spacing: 0.2em; }
  ::selection { background: rgba(200, 46, 49, 0.15); color: #1c1917; }
  .annotation-block { background: linear-gradient(to right, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.03)); border-left: 0.1875rem solid #f59e0b; padding-left: 1.5rem; padding-right: 1rem; padding-top: 0.75rem; padding-bottom: 0.75rem; margin: 1.5rem 0; border-radius: 0 0.375rem 0.375rem 0; position: relative; }
  .annotation-block::before { content: "註"; position: absolute; left: 0.5rem; top: 0.75rem; font-size: 0.875rem; font-weight: bold; color: #d97706; background: rgba(251, 191, 36, 0.2); width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; }
  .annotation-label { font-size: 0.75rem; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: block; }
  .annotation-text { color: #78350f; line-height: 1.8; font-size: 0.95em; }
  .markdown-content-wrapper { font-family: 'Noto Serif SC', 'Songti SC', serif; color: #2c3e50; line-height: 1.85; letter-spacing: 0.01em; }
  .markdown-content { word-wrap: break-word; word-break: break-word; max-width: 100%; }
  .markdown-content p, .markdown-content .md-p { margin-bottom: 1.5rem; line-height: 1.9; text-align: justify; text-justify: inter-ideograph; color: #2c3e50; font-size: 1em; position: relative; font-feature-settings: "kern" 1, "liga" 1; text-rendering: optimizeLegibility; }
  .markdown-content p:last-child, .markdown-content .md-p:last-child { margin-bottom: 0; }
  .markdown-content h1 { font-size: 1.75em; font-weight: 700; color: #1a252f; margin-top: 2.5rem; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 0.125rem solid rgba(200, 46, 49, 0.15); line-height: 1.4; letter-spacing: 0.02em; }
  .markdown-content h2 { font-size: 1.5em; font-weight: 650; color: #1a252f; margin-top: 2rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 0.0625rem solid rgba(200, 46, 49, 0.1); line-height: 1.4; letter-spacing: 0.02em; }
  .markdown-content h3 { font-size: 1.3em; font-weight: 600; color: #2c3e50; margin-top: 2rem; margin-bottom: 1rem; padding-left: 0.75rem; border-left: 0.1875rem solid rgba(200, 46, 49, 0.3); line-height: 1.5; letter-spacing: 0.015em; background: linear-gradient(to right, rgba(200, 46, 49, 0.03), transparent); padding-top: 0.5rem; padding-bottom: 0.5rem; padding-right: 0.5rem; }
  .markdown-content h4 { font-size: 1.15em; font-weight: 600; color: #2c3e50; margin-top: 1.75rem; margin-bottom: 0.875rem; line-height: 1.5; }
  .markdown-content h5, .markdown-content h6 { font-size: 1.05em; font-weight: 600; color: #3d4a5c; margin-top: 1.5rem; margin-bottom: 0.75rem; line-height: 1.5; }
  .markdown-content h1:first-child, .markdown-content h2:first-child, .markdown-content h3:first-child, .markdown-content h4:first-child, .markdown-content h5:first-child, .markdown-content h6:first-child { margin-top: 0; }
  .markdown-content ul, .markdown-content ol { margin-top: 0.75rem; margin-bottom: 1.25rem; padding-left: 1.75rem; line-height: 1.85; }
  .markdown-content li { margin-bottom: 0.5rem; color: #2c3e50; }
  .markdown-content li::marker { color: rgb(148, 163, 184); }
  .markdown-content blockquote { margin-top: 1.25rem; margin-bottom: 1.25rem; padding-left: 1rem; padding-right: 1rem; padding-top: 0.25rem; padding-bottom: 0.25rem; border-left: 0.25rem solid rgba(245, 158, 11, 0.5); background-color: rgb(255, 251, 235); border-radius: 0 0.375rem 0.375rem 0; font-style: normal; color: rgb(71, 85, 105); line-height: 1.8; }
  .markdown-content code { font-family: 'Noto Serif SC', 'Songti SC', serif; background: rgb(241, 245, 249); padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.9em; color: rgb(30, 41, 59); }
  .markdown-content code::before, .markdown-content code::after { content: none; }
  .markdown-content pre { margin-top: 1.25rem; margin-bottom: 1.25rem; padding: 1rem; background: rgba(44, 62, 80, 0.05); border-radius: 0.375rem; overflow-x: auto; border: 0.0625rem solid rgba(200, 46, 49, 0.1); }
  .markdown-content pre code { background: transparent; padding: 0; color: #2c3e50; }
  .markdown-content strong { font-weight: 900; color: rgb(180, 83, 9); letter-spacing: 0.01em; }
  .markdown-content em { font-style: italic; color: #3d4a5c; }
  .markdown-content q { font-style: normal; color: #c0392b; background: rgba(200, 46, 49, 0.06); padding: 0.125rem 0.25rem; border-radius: 0.2rem; font-weight: 500; quotes: '"' '"' "'" "'"; }
  @media (max-width: 48rem) {
    .markdown-content-wrapper { font-size: 0.95em; line-height: 1.8; }
    .markdown-content p, .markdown-content .md-p { margin-bottom: 1.25rem; line-height: 1.85; text-align: left; }
    .markdown-content h1 { font-size: 1.5em; margin-top: 2rem; margin-bottom: 1rem; }
    .markdown-content h2 { font-size: 1.35em; margin-top: 1.75rem; margin-bottom: 0.875rem; }
    .markdown-content h3 { font-size: 1.2em; margin-top: 1.75rem; margin-bottom: 0.875rem; padding-left: 0.5rem; }
    .markdown-content h4 { font-size: 1.1em; margin-top: 1.5rem; margin-bottom: 0.75rem; }
    .markdown-content ul, .markdown-content ol { padding-left: 1.5rem; margin-top: 0.625rem; margin-bottom: 1rem; }
    .markdown-content blockquote { padding-left: 1rem; margin-top: 1rem; margin-bottom: 1rem; }
    .annotation-block { margin: 1rem 0; padding-left: 1rem; padding-right: 0.75rem; }
  }
  @media (max-width: 23.4375rem) {
    .markdown-content-wrapper { font-size: 0.9em; }
    .markdown-content h1 { font-size: 1.35em; }
    .markdown-content h2 { font-size: 1.25em; }
    .markdown-content h3 { font-size: 1.15em; }
  }
  .markdown-content a { color: #c0392b; text-decoration: underline; text-decoration-color: rgba(200, 46, 49, 0.3); transition: all 0.2s ease; }
  .markdown-content a:hover { color: #a93226; text-decoration-color: rgba(200, 46, 49, 0.6); }
  .markdown-content hr { margin: 2rem 0; border: none; border-top: 0.0625rem solid rgba(200, 46, 49, 0.15); background: none; }
  .markdown-content table { width: 100%; margin: 1.25rem 0; border-collapse: collapse; border: 0.0625rem solid rgba(200, 46, 49, 0.15); }
  .markdown-content th, .markdown-content td { padding: 0.75rem; border: 0.0625rem solid rgba(200, 46, 49, 0.1); text-align: left; }
  .markdown-content th { background: rgba(200, 46, 49, 0.08); font-weight: 600; color: #1a252f; }
  .markdown-content img { max-width: 100%; height: auto; margin: 1.5rem 0; border-radius: 0.375rem; box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.1); }
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
      <Badge variant="outline" className="text-[0.625rem] text-stone-500 border-stone-200 bg-stone-50 h-5">
        实证案例
      </Badge>
      <span className="text-[0.625rem] text-[#C82E31] font-bold bg-red-50 px-1.5 rounded">{data.result}</span>
    </div>
    <h4 className="text-sm font-bold text-stone-800 font-serif leading-tight mb-2 group-hover:text-[#C82E31] transition-colors">
      {data.title}
    </h4>
    <div className="flex items-center justify-between text-[0.625rem] text-stone-400">
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
  content_text?: string | null
  pdf_url?: string | null
  source_type?: string | null
  source_url?: string | null
  source_payload?: unknown | null
  slice_enabled?: boolean | null
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

const getOriginalPageCount = (payload: unknown): number | null => {
  if (!payload || !isRecord(payload)) return null
  const slices = payload.slices
  if (!slices || !isRecord(slices)) return null
  const pageCount = slices.page_count
  return typeof pageCount === 'number' && Number.isFinite(pageCount) && pageCount > 0 
    ? Math.floor(pageCount) 
    : null
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
  const [mobileRightSidebarOpen, setMobileRightSidebarOpen] = useState(false) 
  const [book, setBook] = useState<LibraryBookRow | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slicesLoading, setSlicesLoading] = useState(false)
  const [slicesError, setSlicesError] = useState<string | null>(null)
  const [slicesManifest, setSlicesManifest] = useState<SliceManifest | null>(null)
  const [viewMode, setViewMode] = useState<'slices' | 'text'>('text')
  const [imageLoadError, setImageLoadError] = useState<Record<number, boolean>>({})
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({})
  const [chapters, setChapters] = useState<BookContentRow[]>([])
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [currentTocItemIndex, setCurrentTocItemIndex] = useState<number | null>(null)
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<{ viewMode: 'slices' | 'text'; pageIndex: number } | null>(null)
  const restoreAppliedRef = useRef(false)
  const readStartAtRef = useRef<number | null>(null)
  const activeTitleRef = useRef<string>('')
  
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
    
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setMobileRightSidebarOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const bookDescription = book?.description ?? null
  const bookPdfUrl = book?.pdf_url ? String(book.pdf_url) : null
  const bookSourceUrl = book?.source_url ? String(book.source_url) : null
  const bookSourcePayload = book?.source_payload ?? null
  const slicesManifestUrl = useMemo(() => getSlicesManifestUrl(bookSourcePayload), [bookSourcePayload])
  const originalPageCount = useMemo(() => getOriginalPageCount(bookSourcePayload), [bookSourcePayload])
  const hasText = typeof book?.content_text === 'string' && book.content_text.trim().length > 0
  const isTextPreparing = !hasText && !!book?.id && !!slicesManifestUrl
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

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)).catch(() => setUserId(null))
  }, [])

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
          .select('id, title, author, dynasty, category, status, cover_url, description, content_text, pdf_url, source_type, source_url, source_payload, slice_enabled')
          .in('status', ['reviewed', 'published']) 

        let bookRow: unknown = null
        let bookError: unknown = null
        const res1 = uuidLike ? await bookQuery.eq('id', bookIdOrTitle).maybeSingle() : await bookQuery.eq('title', bookIdOrTitle).maybeSingle()
        bookRow = res1.data
        bookError = res1.error
        if (bookError) {
          const code = isRecord(bookError) && typeof bookError.code === 'string' ? bookError.code : ''
          const msg = isRecord(bookError) && typeof bookError.message === 'string' ? bookError.message : ''
          if (code === 'PGRST204' || /column.+(content_text|pdf_url|source_type|source_url|source_payload)/i.test(msg)) {
            const fallbackQuery = supabase
              .from('library_books')
              .select('id, title, author, dynasty, category, status, cover_url, description, content_text')
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
        setActiveIndex(0)
        setCurrentTocItemIndex(null) 
        setCurrentPageIndex(0) 
      } catch (e: unknown) {
        setError(getErrorMessage(e, '加载失败'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [rawBookId])

  useEffect(() => {
    setSlicesError(null)
    setSlicesLoading(false)
    setSlicesManifest(null)
    setImageLoadError({})
    setImageLoading({})
  }, [book?.id])

  useEffect(() => {
    const loadChapters = async () => {
      if (!book?.id) {
        setChapters([])
        return
      }

      const supabase = createClient()
      if (!supabase) return

      setChaptersLoading(true)
      try {
        const { data, error: chaptersError } = await supabase
          .from('library_book_contents')
          .select('id, volume_no, volume_title, chapter_no, chapter_title, content, sort_order')
          .eq('book_id', book.id)
          .order('sort_order', { ascending: true })

        if (chaptersError) throw chaptersError
        setChapters((data || []) as BookContentRow[])
      } catch (e: unknown) {
        console.error('加载章节失败:', e)
        setChapters([])
      } finally {
        setChaptersLoading(false)
      }
    }

    loadChapters()
  }, [book?.id])

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
            const no = typeof p.no === 'number' ? p.no : (typeof p.page === 'number' ? p.page : null)
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
    if (!isTextPreparing) return
    const supabase = createClient()
    if (!supabase) return
    let stopped = false
    const startedAt = Date.now()

    const tick = async () => {
      if (stopped) return
      if (Date.now() - startedAt > 120_000) return
      if (!book?.id) return

      const { data } = await supabase.from('library_books').select('content_text').eq('id', book.id).maybeSingle()
      const next = isRecord(data) && typeof (data as any).content_text === 'string' ? String((data as any).content_text) : ''
      if (next.trim()) {
        setBook((prev) => (prev && prev.id === book.id ? { ...prev, content_text: next } : prev))
      }
    }
    tick()
    const timer = setInterval(tick, 2000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [book?.id, isTextPreparing])

  useEffect(() => {
    if (viewMode === 'text') {
      setActiveIndex(0)
      setCurrentTocItemIndex(null) 
      setCurrentPageIndex(0) 
    } else {
      setCurrentTocItemIndex(null)
      setCurrentPageIndex(0) 
    }
  }, [viewMode])

  const MarkdownComponents = useMemo(() => ({
    // ... (Markdown components omitted for brevity, keeping same styling)
    h1: ({node, ...props}: any) => (
      <h1 className="font-serif font-bold text-slate-900 mb-6 mt-8 tracking-widest" style={{ fontSize: `${fontSize[0] * 1.4}px`, lineHeight: '1.4' }} {...props} />
    ),
    h2: ({node, ...props}: any) => (
      <h2 className="font-serif font-bold text-slate-900 mb-5 mt-7 border-b border-slate-200 pb-2 tracking-widest" style={{ fontSize: `${fontSize[0] * 1.25}px`, lineHeight: '1.4' }} {...props} />
    ),
    h3: ({node, ...props}: any) => (
      <h3 className="font-serif font-semibold text-slate-900 mb-4 mt-8 pl-3 border-b border-slate-200 pb-2 tracking-wide" style={{ fontSize: `${fontSize[0] * 1.15}px`, lineHeight: '1.5', letterSpacing: '0.015em' }} {...props} />
    ),
    h4: ({node, ...props}: any) => (
      <h4 className="font-serif font-bold text-[#34495e] mb-3 mt-5" style={{ fontSize: `${fontSize[0] * 1.05}px`, lineHeight: '1.5' }} {...props} />
    ),
    h5: ({node, ...props}: any) => (
      <h5 className="font-serif font-bold text-[#34495e] mb-2 mt-4" style={{ fontSize: `${fontSize[0]}px`, lineHeight: '1.5' }} {...props} />
    ),
    h6: ({node, ...props}: any) => (
      <h6 className="font-serif font-bold text-[#34495e] mb-2 mt-4" style={{ fontSize: `${fontSize[0] * 0.95}px`, lineHeight: '1.5' }} {...props} />
    ),
    p: ({node, children, ...props}: any) => {
      return (
        <div className="md-p leading-loose text-slate-700 mb-6 text-justify font-serif" style={{ fontSize: `${fontSize[0]}px`, lineHeight: '1.9', letterSpacing: '0.01em' }} {...props}>
          {children}
        </div>
      )
    },
    strong: ({node, ...props}: any) => (
      <strong className="font-black text-amber-700" style={{ fontSize: 'inherit', fontWeight: 900 }} {...props} />
    ),
    em: ({node, ...props}: any) => (
      <em className="italic text-stone-600" style={{ fontSize: 'inherit', fontStyle: 'italic' }} {...props} />
    ),
    blockquote: ({node, ...props}: any) => (
      <blockquote className="border-l-4 border-amber-500/50 bg-amber-50 px-4 py-1 my-6 rounded-r not-italic text-slate-600 font-serif" style={{ fontSize: `${fontSize[0] * 0.95}px`, lineHeight: '1.8' }} {...props} />
    ),
    code: ({node, inline, className, children, ...props}: any) => {
      if (inline) {
        return (
          <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-serif before:content-none after:content-none" style={{ fontSize: `${fontSize[0] * 0.9}px` }} {...props}>
            {children}
          </code>
        )
      } else {
        return (
          <div className="my-6">
            <pre className="bg-[#2c3e50] text-stone-100 p-4 rounded-lg overflow-x-auto font-mono shadow-inner" style={{ fontSize: `${fontSize[0] * 0.85}px`, lineHeight: '1.6' }} {...props}>
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          </div>
        )
      }
    },
    ul: ({node, ...props}: any) => (
      <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-[#2c3e50] font-serif marker:text-slate-400" style={{ fontSize: `${fontSize[0]}px` }} {...props} />
    ),
    ol: ({node, ...props}: any) => (
      <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-[#2c3e50] font-serif marker:text-slate-400" style={{ fontSize: `${fontSize[0]}px` }} {...props} />
    ),
    li: ({node, ...props}: any) => (
      <li className="leading-relaxed" style={{ fontSize: 'inherit', lineHeight: '1.8' }} {...props} />
    ),
    a: ({node, ...props}: any) => (
      <a className="text-[#c0392b] hover:text-[#a93226] underline underline-offset-4 decoration-stone-300 transition-colors" style={{ fontSize: 'inherit' }} {...props} />
    ),
    hr: ({node, ...props}: any) => (
      <hr className="my-8 border-stone-200" {...props} />
    ),
    table: ({node, ...props}: any) => (
      <div className="overflow-x-auto my-6 rounded-lg border border-stone-200">
        <table className="w-full text-sm text-left text-stone-600 font-serif" style={{ fontSize: `${fontSize[0] * 0.9}px` }} {...props} />
      </div>
    ),
    thead: ({node, ...props}: any) => (
      <thead className="text-xs text-stone-700 uppercase bg-[#f5f1e8]" {...props} />
    ),
    th: ({node, ...props}: any) => (
      <th className="px-6 py-3 font-serif font-bold" {...props} />
    ),
    tbody: ({node, ...props}: any) => (
      <tbody {...props} />
    ),
    tr: ({node, ...props}: any) => (
      <tr className="bg-white border-b border-stone-100 hover:bg-stone-50" {...props} />
    ),
    td: ({node, ...props}: any) => (
      <td className="px-6 py-4" {...props} />
    ),
  }), [fontSize])

  const parseOcrContent = (content: string | null) => {
    if (!content) return { toc: [], mainText: '' }

    const lines = content.split('\n')
    let inToc = false
    let inMainText = false
    let foundTocMarker = false
    let foundMainTextMarker = false
    const toc: string[] = []
    const mainTextLines: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed === '# 目录' || trimmed === '## 目录' || trimmed.match(/^#+\s*目录\s*$/)) {
        inToc = true
        inMainText = false
        foundTocMarker = true
        continue
      }
      
      if (trimmed === '# 正文' || trimmed === '## 正文' || trimmed.match(/^#+\s*正文\s*$/)) {
        inToc = false
        inMainText = true
        foundMainTextMarker = true
        continue
      }

      if (inToc && trimmed.startsWith('- ')) {
        const tocItem = trimmed.replace(/^-\s*\[?([^\]]+)\]?$/, '$1').trim()
        if (tocItem && tocItem !== '目录') toc.push(tocItem)
      } else if (inMainText) {
        if (trimmed && !trimmed.match(/^#+\s*(目录|正文)\s*$/)) {
          mainTextLines.push(line)
        }
      } else if (!foundTocMarker && !foundMainTextMarker) {
        if (trimmed && !trimmed.match(/^#+\s*(目录|正文)\s*$/)) {
          mainTextLines.push(line)
        }
      }
    }

    const mainText = mainTextLines.join('\n').trim()

    return {
      toc,
      mainText
    }
  }

  const chapterList = useMemo(() => {
    if (chapters.length > 0) {
      return chapters
    }
    
    const contentText = typeof book?.content_text === 'string' && book.content_text.trim() ? book.content_text : null
    const fallbackContent = contentText || bookDescription
    if (fallbackContent) {
      return [
        {
          id: 'content_text',
          volume_no: 1,
          volume_title: null,
          chapter_no: 1,
          chapter_title: '正文',
          content: fallbackContent,
          sort_order: 1,
        } as BookContentRow,
      ]
    }
    
    return []
  }, [chapters, book?.content_text, bookDescription])

  const allTocItems = useMemo(() => {
    const items: Array<{ title: string; chapterIndex: number; tocIndex: number }> = []
    chapters.forEach((chapter, index) => {
      const parsed = parseOcrContent(chapter.content)
      parsed.toc.forEach((title, tocIdx) => {
        items.push({ title, chapterIndex: index, tocIndex: items.length })
      })
    })
    return items
  }, [chapters])

  const tocItems = useMemo(() => {
    const sorted = [...allTocItems].sort((a, b) => a.chapterIndex - b.chapterIndex || a.tocIndex - b.tocIndex)
    const anchors: Array<{ title: string; chapterIndex: number; tocIndex: number }> = []
    for (const item of sorted) {
      const last = anchors.length ? anchors[anchors.length - 1] : null
      if (!last || last.title !== item.title) {
        anchors.push({ title: item.title, chapterIndex: item.chapterIndex, tocIndex: anchors.length })
      }
    }
    return anchors
  }, [allTocItems])

  const safeActiveIndex = Math.max(0, Math.min(activeIndex, chapterList.length - 1))
  const activeChapter = chapterList[safeActiveIndex] || null
  const activeChapterTitle = activeChapter ? chapterLabel(activeChapter) : ''
  const slicePages = slicesManifest?.pages || []
  const safeActivePageIndex = Math.max(0, Math.min(activeIndex, slicePages.length - 1))
  const activeSlicePage = slicePages[safeActivePageIndex] || null
  const activeSliceTitle = activeSlicePage ? `第${activeSlicePage.no}页` : ''
  
  const currentTocItem = currentTocItemIndex !== null && currentTocItemIndex >= 0 && currentTocItemIndex < tocItems.length
    ? tocItems[currentTocItemIndex]
    : null
  const currentTocTitle = currentTocItem?.title || ''
  
  useEffect(() => {
    if (tocItems.length === 0) {
      setCurrentTocItemIndex(null)
      return
    }
    
    if (currentTocItemIndex === null) {
      const firstTocItemInChapter = tocItems.findIndex(item => item.chapterIndex === safeActiveIndex)
      if (firstTocItemInChapter >= 0) {
        setCurrentTocItemIndex(firstTocItemInChapter)
      }
    } else {
      const currentTocItem = currentTocItemIndex >= 0 && currentTocItemIndex < tocItems.length 
        ? tocItems[currentTocItemIndex] 
        : null
      if (!currentTocItem || currentTocItem.chapterIndex !== safeActiveIndex) {
        const firstTocItemInChapter = tocItems.findIndex(item => item.chapterIndex === safeActiveIndex)
        if (firstTocItemInChapter >= 0) {
          setCurrentTocItemIndex(firstTocItemInChapter)
        } else {
          setCurrentTocItemIndex(null)
        }
      }
    }
  }, [safeActiveIndex, chapters])
  
  const activeTocItem = currentTocItemIndex !== null && currentTocItemIndex >= 0 && currentTocItemIndex < tocItems.length
    ? tocItems[currentTocItemIndex]
    : tocItems.find(item => item.chapterIndex === safeActiveIndex)
  const activeTocTitle = activeTocItem?.title || ''
  
  const activeTocIndex = currentTocItemIndex !== null && currentTocItemIndex >= 0 && currentTocItemIndex < tocItems.length
    ? currentTocItemIndex
    : (activeTocTitle 
        ? tocItems.findIndex(item => item.title === activeTocTitle && item.chapterIndex === safeActiveIndex)
        : (tocItems.findIndex(item => item.chapterIndex === safeActiveIndex)))
  
  const activeTitle = viewMode === 'slices'
    ? activeSliceTitle
    : (tocItems.length > 0 && currentTocTitle ? currentTocTitle : activeChapterTitle || '正文')

  useEffect(() => {
    activeTitleRef.current = activeTitle
  }, [activeTitle])

  useEffect(() => {
    if (!book?.id) return
    if (readStartAtRef.current === null) readStartAtRef.current = Date.now()
    return () => {
      const startedAt = readStartAtRef.current
      if (startedAt === null) return
      trackEvent('library_book_read', {
        book_name: book.title,
        chapter: activeTitleRef.current,
        read_duration: Date.now() - startedAt,
      })
      readStartAtRef.current = null
    }
  }, [book?.id])

  useEffect(() => {
    if (!book?.id) return
    const handler = () => {
      const selection = window.getSelection()?.toString() || ''
      const trimmed = selection.trim()
      if (!trimmed) return
      trackEvent('library_text_copy', {
        book_name: book.title,
        chapter: activeTitleRef.current,
        content_length: trimmed.length,
      })
    }
    document.addEventListener('copy', handler)
    return () => {
      document.removeEventListener('copy', handler)
    }
  }, [book?.id])
  
  useEffect(() => {
    if (viewMode === 'text' && tocItems.length > 0) {
      if (currentTocItemIndex === null) {
        const firstTocItemInChapter = tocItems.findIndex(item => item.chapterIndex === safeActiveIndex)
        if (firstTocItemInChapter >= 0) {
          setCurrentTocItemIndex(firstTocItemInChapter)
        }
      }
    } else if (viewMode === 'slices') {
      setCurrentTocItemIndex(null)
    }
  }, [viewMode, tocItems.length, safeActiveIndex])

  useEffect(() => {
    if (viewMode === 'slices' && activeSlicePage?.no) {
      setImageLoading((prev) => ({ ...prev, [activeSlicePage.no]: true }))
    }
  }, [viewMode, activeSlicePage?.no])
  const { toc: currentToc, mainText: currentMainText } = useMemo(() => {
    return parseOcrContent(activeChapter?.content || null)
  }, [activeChapter?.content])

  const filteredMainText = useMemo(() => {
    if (!currentMainText || !activeTocTitle || allTocItems.length === 0) return currentMainText
    
    const chapterTocItems = allTocItems.filter(item => item.chapterIndex === safeActiveIndex)
    const currentTocIndex = chapterTocItems.findIndex(item => item.title === activeTocTitle)
    
    if (currentTocIndex < 0 || chapterTocItems.length <= 1) return currentMainText
    
    const lines = currentMainText.split('\n')
    let startIndex = -1
    let endIndex = lines.length
    
    const normalizeTitle = (title: string) => title.trim().replace(/^#+\s+/, '')
    const currentTitleNormalized = normalizeTitle(activeTocTitle)
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const normalizedLine = normalizeTitle(line)
      
      if (normalizedLine === currentTitleNormalized || 
          (normalizedLine.includes(currentTitleNormalized) && 
           Math.abs(normalizedLine.length - currentTitleNormalized.length) <= 5)) {
        startIndex = i
        break
      }
    }
    
    if (startIndex >= 0 && currentTocIndex < chapterTocItems.length - 1) {
      const nextTocTitle = chapterTocItems[currentTocIndex + 1].title
      const nextTitleNormalized = normalizeTitle(nextTocTitle)
      
      for (let i = startIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim()
        const normalizedLine = normalizeTitle(line)
        
        if (normalizedLine === nextTitleNormalized || 
            (normalizedLine.includes(nextTitleNormalized) && 
             Math.abs(normalizedLine.length - nextTitleNormalized.length) <= 5)) {
          endIndex = i
          break
        }
      }
    }
    
    if (startIndex >= 0) {
      const filteredLines = lines.slice(startIndex, endIndex)
      const cleanedLines = filteredLines.length > 0
        ? [filteredLines[0].replace(/^#+\s+/, '').trim(), ...filteredLines.slice(1)]
        : filteredLines
      return cleanedLines.join('\n').trim()
    }
    
    return currentMainText
  }, [currentMainText, activeTocTitle, allTocItems, safeActiveIndex])

  const parseParagraphs = useMemo(() => {
    return (text: string | null) => {
      if (!text) return []
      const raw = text.replace(/\r\n/g, '\n').trim()
      if (!raw) return []
      
      const paragraphs = raw
        .split(/\n{2,}/g)
        .map((x) => x.trim())
        .filter(Boolean)
      
      return paragraphs.map((para) => {
        const annotationPattern = /^(註|注|注释|註釋|【注】|【註】|\[注\]|\[註\])\s*[:：]?\s*/
        const isAnnotation = annotationPattern.test(para)
        
        const isTitle = /^#+\s+/.test(para)
        const cleanedPara = isTitle ? para.replace(/^#+\s+/, '') : para
        
        return {
          text: cleanedPara,
          isAnnotation
        }
      })
    }
  }, [])

  const paragraphsPerPage = 10

  const textSegments = useMemo(() => {
    if (viewMode === 'slices') return []

    const segments: Array<{
      chapterIndex: number
      tocGlobalIndex: number | null
      pages: number
      startChapterIndex: number
      endChapterIndex: number
    }> = []

    if (tocItems.length > 0) {
      for (let tocGlobalIndex = 0; tocGlobalIndex < tocItems.length; tocGlobalIndex++) {
        const item = tocItems[tocGlobalIndex]
        const next = tocItems.slice(tocGlobalIndex + 1).find((x) => x.chapterIndex > item.chapterIndex) || null
        const startChapterIndex = Math.max(0, Math.min(item.chapterIndex, chapterList.length))
        const endChapterIndex = Math.max(startChapterIndex, Math.min(next ? next.chapterIndex : chapterList.length, chapterList.length))
        segments.push({
          chapterIndex: startChapterIndex,
          tocGlobalIndex,
          pages: 1,
          startChapterIndex,
          endChapterIndex,
        })
      }
      return segments
    }

    for (let chapterIndex = 0; chapterIndex < chapterList.length; chapterIndex++) {
      segments.push({
        chapterIndex,
        tocGlobalIndex: null,
        pages: 1,
        startChapterIndex: chapterIndex,
        endChapterIndex: chapterIndex + 1,
      })
    }

    return segments
  }, [chapterList.length, tocItems, viewMode])

  const activeTextSegment = useMemo(() => {
    if (viewMode === 'slices') return null
    if (textSegments.length === 0) return null
    if (currentTocItemIndex !== null) {
      const found = textSegments.find((x) => x.tocGlobalIndex === currentTocItemIndex)
      if (found) return found
    }
    if (tocItems.length === 0) {
      const found = textSegments.find((x) => x.tocGlobalIndex === null && x.chapterIndex === safeActiveIndex)
      if (found) return found
    }
    return textSegments[0] || null
  }, [currentTocItemIndex, safeActiveIndex, textSegments, tocItems.length, viewMode])

  const displayMainText = useMemo(() => {
    if (viewMode === 'slices') return ''
    if (!activeTextSegment) return currentMainText || ''
    const parts: string[] = []
    for (let i = activeTextSegment.startChapterIndex; i < activeTextSegment.endChapterIndex; i++) {
      const chapter = chapterList[i]
      if (!chapter) continue
      const parsed = parseOcrContent(chapter.content)
      const main = (parsed.mainText || '').trim()
      if (main) parts.push(main)
    }
    return parts.join('\n\n').trim()
  }, [activeTextSegment, chapterList, currentMainText, viewMode])

  const allContentParagraphs = useMemo(() => {
    return parseParagraphs(displayMainText)
  }, [displayMainText, parseParagraphs])

  const totalPages = useMemo(() => {
    if (viewMode === 'slices') {
      return (slicesManifest?.page_count ?? slicePages.length) || 1
    }
    const sum = textSegments.reduce((acc, seg) => acc + seg.pages, 0)
    return Math.max(1, sum || 1)
  }, [slicePages.length, slicesManifest?.page_count, textSegments, viewMode])
  
  const currentBookPageIndex = useMemo(() => {
    if (viewMode === 'slices') {
      return safeActivePageIndex
    }
    if (textSegments.length === 0) return 0
    if (currentTocItemIndex !== null) {
      return Math.max(0, Math.min(currentTocItemIndex, totalPages - 1))
    }
    const idx = textSegments.findIndex((seg) => seg.tocGlobalIndex === null && seg.chapterIndex === safeActiveIndex)
    return idx >= 0 ? idx : 0
  }, [currentTocItemIndex, safeActiveIndex, safeActivePageIndex, textSegments, totalPages, viewMode])
  
  const contentParagraphs = useMemo(() => {
    return allContentParagraphs
  }, [allContentParagraphs])

  const hasPrev = viewMode === 'slices' 
    ? safeActivePageIndex > 0 
    : currentBookPageIndex > 0
  const hasNext = viewMode === 'slices'
    ? (() => {
        const totalSlicePages = slicesManifest?.page_count ?? slicePages.length
        return totalSlicePages > 0 && safeActivePageIndex < totalSlicePages - 1
      })()
    : currentBookPageIndex < totalPages - 1

  const navigateToBookPage = useCallback((targetPageIndex: number) => {
    const safeTarget = Math.max(0, Math.min(targetPageIndex, totalPages - 1))
    if (viewMode !== 'text') return
    if (textSegments.length === 0) return

    let pageBase = 0
    for (const seg of textSegments) {
      if (safeTarget < pageBase + seg.pages) {
        setActiveIndex(seg.chapterIndex)
        setCurrentTocItemIndex(seg.tocGlobalIndex)
        setCurrentPageIndex(0)
        return
      }
      pageBase += seg.pages
    }

    const last = textSegments[textSegments.length - 1]
    if (!last) return
    setActiveIndex(last.chapterIndex)
    setCurrentTocItemIndex(last.tocGlobalIndex)
    setCurrentPageIndex(0)
  }, [textSegments, totalPages, viewMode])

  useEffect(() => {
    if (!book?.id) return
    if (!userId) return
    if (restoreAppliedRef.current) return
    if (restoreTarget) return

    const supabase = createClient()
    if (!supabase) return
    let cancelled = false

    const run = async () => {
      const { data } = await supabase
        .from('library_reading_progress')
        .select('view_mode, page_index')
        .eq('book_id', book.id)
        .maybeSingle()

      if (cancelled) return
      if (!data) return

      const rawViewMode = typeof (data as any).view_mode === 'string' ? String((data as any).view_mode) : 'text'
      const viewMode = rawViewMode === 'slices' ? 'slices' : 'text'
      const pageIndexRaw = (data as any).page_index
      const pageIndex =
        typeof pageIndexRaw === 'number' && Number.isFinite(pageIndexRaw) ? Math.max(0, Math.floor(pageIndexRaw)) : 0

      setRestoreTarget({ viewMode, pageIndex })
    }

    run()
    return () => {
      cancelled = true
    }
  }, [book?.id, restoreTarget, userId])

  useEffect(() => {
    if (!restoreTarget) return
    if (restoreAppliedRef.current) return

    if (restoreTarget.viewMode === 'slices') {
      if (viewMode !== 'slices') {
        setViewMode('slices')
        return
      }
      const totalSlicePages = slicesManifest?.page_count ?? slicePages.length
      if (!totalSlicePages) return
      setActiveIndex(Math.max(0, Math.min(totalSlicePages - 1, restoreTarget.pageIndex)))
      restoreAppliedRef.current = true
      setRestoreTarget(null)
      return
    }

    if (viewMode !== 'text') {
      setViewMode('text')
      return
    }
    if (textSegments.length === 0 || totalPages <= 0) return
    navigateToBookPage(restoreTarget.pageIndex)
    restoreAppliedRef.current = true
    setRestoreTarget(null)
  }, [
    navigateToBookPage,
    restoreTarget,
    slicePages.length,
    slicesManifest?.page_count,
    textSegments.length,
    totalPages,
    viewMode,
  ])

  useEffect(() => {
    if (!book?.id) return
    if (!userId) return

    const supabase = createClient()
    if (!supabase) return

    const totalSlicePages = slicesManifest?.page_count ?? slicePages.length
    const pageIndex = viewMode === 'slices' ? safeActivePageIndex : currentBookPageIndex
    const progress =
      viewMode === 'slices'
        ? (totalSlicePages > 0
            ? Math.min(100, Math.max(0, Math.round(((safeActivePageIndex + 1) / totalSlicePages) * 100)))
            : 0)
        : (totalPages > 0
            ? Math.min(100, Math.max(0, Math.round(((currentBookPageIndex + 1) / totalPages) * 100)))
            : 0)

    const timer = setTimeout(() => {
      const write = async () => {
        try {
          await supabase.from('library_reading_progress').upsert(
            {
              user_id: userId,
              book_id: book.id,
              view_mode: viewMode,
              page_index: pageIndex,
              progress,
            },
            { onConflict: 'user_id,book_id' }
          )
        } catch (e) {}
      }
      void write()
    }, 800)

    return () => clearTimeout(timer)
  }, [
    book?.id,
    currentBookPageIndex,
    currentTocItemIndex,
    safeActivePageIndex,
    slicePages.length,
    slicesManifest?.page_count,
    totalPages,
    userId,
    viewMode,
  ])

  const sliceEnabled = book?.slice_enabled !== false 
  const canSlice = sliceEnabled && !!book?.id && !!ocrSourcePdfUrl && !slicesManifestUrl

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

  // 渲染右侧内容（提取为变量以便复用）
  const renderRightSidebarContent = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-stone-200/50 flex items-center justify-between">
        <div className="relative flex-1 mr-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input 
            type="text" 
            placeholder="文中搜..." 
            className="w-full bg-white border border-stone-200 rounded-full py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:border-[#C82E31] transition-colors"
          />
        </div>
        {/* 仅在移动端显示关闭按钮 */}
        <Button variant="ghost" size="icon" className="h-8 w-8 xl:hidden" onClick={() => setMobileRightSidebarOpen(false)}>
          <X className="w-4 h-4 text-stone-500" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0 p-4">
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

          {/* 关联案例 */}
          <div>
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Bookmark className="w-3 h-3 text-[#C82E31]" />
              实证案例推荐
            </h3>
            <p className="text-[0.625rem] text-stone-400 mb-3">
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
              <div className="mt-2 text-[0.625rem] text-stone-400 text-right">2023-10-24</div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )

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
      
      <div className="flex flex-col h-full paper-texture overflow-hidden text-stone-800 relative">
        
        {/* 1. 顶部导航栏 */}
        <header className="flex-none h-14 border-b border-stone-200/60 bg-[#fdfbf7]/90 backdrop-blur-md px-3 md:px-4 flex items-center justify-between z-20 relative">
          <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
            <Button variant="ghost" size="icon" className="hover:bg-stone-100 text-stone-600 flex-shrink-0" onClick={() => router.push('/library/books')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold font-serif text-stone-800 truncate max-w-[9.375rem] md:max-w-xs">{book.title}</h1>
                <div className="hidden sm:flex gap-1">
                  <Badge variant="secondary" className="text-[0.625rem] h-5 bg-white/60 backdrop-blur-sm border-stone-200 text-stone-500 px-1.5 shadow-none">
                    {normalizeCategory(book.category)}
                  </Badge>
                  <Badge variant="secondary" className="text-[0.625rem] h-5 bg-white/60 backdrop-blur-sm border-stone-200 text-stone-500 px-1.5 shadow-none">
                    {normalizeStatus(book.status)}
                  </Badge>
                </div>
              </div>
              <span className="text-[0.625rem] text-stone-500 truncate max-w-[12.5rem] md:max-w-md">{activeTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {sliceEnabled && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-stone-500 hover:text-stone-800 px-2"
                disabled={viewMode === 'text' ? !slicesManifestUrl : false}
                onClick={() => setViewMode((m) => (m === 'slices' ? 'text' : 'slices'))}
              >
                {viewMode === 'slices' ? (isTextPreparing ? '转文中' : '转文字') : '看切片'}
              </Button>
            )}
            {canSlice && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex h-8 px-3 text-xs border-stone-300 text-stone-700 hover:text-[#C82E31] hover:border-[#C82E31]"
                disabled={slicesLoading}
                onClick={handleSlice}
              >
                {slicesLoading ? '切片中' : '生成切片'}
              </Button>
            )}
            
            {/* 字体设置 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-stone-500 hover:text-stone-800 h-9 w-9">
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

            {/* 移动端显示的右侧栏开关 */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-stone-500 hover:text-stone-800 h-9 w-9 xl:hidden"
              onClick={() => setMobileRightSidebarOpen(true)}
            >
              <PanelRight className="w-4 h-4" />
            </Button>

            {/* 大屏显示的额外按钮 */}
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-stone-500 hover:text-stone-800 h-9 w-9">
                <Highlighter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-stone-500 hover:text-stone-800 h-9 w-9">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button className="ml-2 bg-[#C82E31] hover:bg-[#a61b1f] text-white h-8 px-4 text-xs shadow-sm">
                笔记
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex overflow-hidden relative">
          
          {/* 
            移动端左侧栏遮罩层 - 使用 absolute inset-0 
            使其位于 flex-1 容器内部，从而自然地位于 header 下方
          */}
          {sidebarOpen && (
            <div 
              className="absolute inset-0 bg-black/20 z-30 md:hidden backdrop-blur-[0.0625rem]" 
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* 
            2. 左侧目录 
            移动端：absolute inset-y-0 且 left-0，位于 flex-1 容器内
            PC端：relative
          */}
          <aside 
            className={`
              flex-none border-r border-stone-200/60 bg-[#f9f8f4] flex flex-col transition-all duration-300 ease-in-out
              absolute inset-y-0 left-0 z-40 w-64 shadow-xl transform
              md:relative md:h-auto md:shadow-none md:z-auto
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-64 md:absolute md:h-full md:z-30'}
            `}
          >
            <div className="p-4 border-b border-stone-200/50 flex items-center justify-between">
              <span className="font-serif font-bold text-stone-700 flex items-center gap-2">
                <Menu className="w-4 h-4" /> 目录
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarOpen(false)}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1 min-h-0 p-3">
              <div className="space-y-1">
                {viewMode === 'slices' ? (
                  slicePages.map((p, i) => (
                    <div
                      key={p.path || p.no || i}
                      className={`
                        group px-3 py-2.5 rounded-md text-sm cursor-pointer font-serif flex items-center gap-2 transition-colors
                        ${i === safeActivePageIndex
                          ? 'bg-white text-[#C82E31] font-bold shadow-sm border border-stone-100'
                          : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                        }
                      `}
                      onClick={() => {
                        setActiveIndex(i)
                        // 移动端点击后自动收起
                        if (window.innerWidth < 768) setSidebarOpen(false)
                      }}
                    >
                      <div
                        className={`w-1 h-1 rounded-full ${i === safeActivePageIndex ? 'bg-[#C82E31]' : 'bg-transparent group-hover:bg-stone-300'}`}
                      />
                      第{p.no}页
                    </div>
                  ))
                ) : (
                  <>
                    {/* 目录部分 */}
                    {tocItems.length > 0 ? (
                      <>
                        <div className="px-3 py-3 mb-2 border-b border-stone-200/50">
                          <div className="text-sm font-bold text-stone-700 uppercase tracking-wider">目录</div>
                        </div>
                        {tocItems.map((item, idx) => {
                          const isActive = idx === activeTocIndex
                          return (
                            <div
                              key={`toc-${idx}`}
                              className={`
                                group px-3 py-2 rounded-md text-sm cursor-pointer font-serif transition-colors
                                ${isActive
                                  ? 'bg-white text-[#C82E31] font-bold shadow-sm border border-stone-100'
                                  : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                                }
                              `}
                              onClick={() => {
                                setActiveIndex(item.chapterIndex)
                                setCurrentTocItemIndex(idx)
                                setCurrentPageIndex(0)
                                // 移动端点击后自动收起
                                if (window.innerWidth < 768) setSidebarOpen(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-[#C82E31]' : 'bg-transparent group-hover:bg-stone-300'}`} />
                                {item.title}
                              </div>
                            </div>
                          )
                        })}
                      </>
                    ) : (
                      chaptersLoading ? (
                        <div className="px-3 py-2 text-xs text-stone-400 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          加载中...
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-xs text-stone-400">暂无目录</div>
                      )
                    )}
                  </>
                )}
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
          <div className="flex-1 min-h-0 min-w-0 relative bg-transparent flex flex-col">
            <ScrollArea className="flex-1 min-h-0 w-full">
              {/* 响应式Padding调整：移动端px-4，平板px-8，PC px-16 */}
              <div className="max-w-3xl mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-12">
                
                {/* 章节标题 */}
                <div className="text-center mb-8 md:mb-12 pb-6 md:pb-8 border-b border-dashed border-stone-300">
                  <span className="text-xs text-stone-400 font-serif tracking-widest uppercase mb-2 block">Chapter</span>
                  <h2 className="text-2xl md:text-3xl font-bold font-serif text-stone-900 mb-4">{activeTitle || '正文'}</h2>
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
                      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm relative">
                        {imageLoading[activeSlicePage.no] && (
                          <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80">
                            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                          </div>
                        )}
                        {imageLoadError[activeSlicePage.no] ? (
                          <div className="p-8 text-center text-stone-500">
                            <div className="text-sm mb-2">图片加载失败</div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setImageLoadError((prev) => {
                                  const next = { ...prev }
                                  delete next[activeSlicePage.no]
                                  return next
                                })
                                setImageLoading((prev) => ({ ...prev, [activeSlicePage.no]: true }))
                              }}
                            >
                              重试
                            </Button>
                          </div>
                        ) : (
                          <img
                            src={activeSlicePage.url}
                            alt={activeSliceTitle || 'page'}
                            className="w-full h-auto block"
                            onLoad={() => {
                              setImageLoading((prev) => {
                                const next = { ...prev }
                                delete next[activeSlicePage.no]
                                return next
                              })
                              setImageLoadError((prev) => {
                                const next = { ...prev }
                                delete next[activeSlicePage.no]
                                return next
                              })
                            }}
                            onError={() => {
                              setImageLoading((prev) => {
                                const next = { ...prev }
                                delete next[activeSlicePage.no]
                                return next
                              })
                              setImageLoadError((prev) => ({ ...prev, [activeSlicePage.no]: true }))
                            }}
                            onLoadStart={() => {
                              setImageLoading((prev) => ({ ...prev, [activeSlicePage.no]: true }))
                            }}
                          />
                        )}
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
                    style={{ fontSize: `${fontSize[0]}px` }}
                  >
                    {/* 显示正文内容 */}
                    {contentParagraphs.length > 0 ? (
                      <div className="space-y-4 markdown-content-wrapper">
                        {contentParagraphs.map((para, idx) => {
                          if (para.isAnnotation) {
                            const annotationText = para.text.replace(/^(註|注|注释|註釋|【注】|【註】|\[注\]|\[註\])\s*[:：]?\s*/, '')
                            return (
                              <div
                                key={idx}
                                className="annotation-block border-l-4 border-[#8c7b75] bg-[#f5f1e8]/50 px-4 md:px-6 py-4 my-6 rounded-r"
                                style={{ fontSize: `${fontSize[0] * 0.9}px` }}
                              >
                                <span className="annotation-label text-[#8c7b75] font-bold text-sm uppercase tracking-wider block mb-2">注释</span>
                                <div className="annotation-text italic text-stone-600 font-serif">
                                  <ReactMarkdown components={MarkdownComponents} remarkPlugins={[remarkGfm]}>
                                    {annotationText}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )
                          }
                          
                          return (
                            <div key={idx} className="markdown-content">
                              <ReactMarkdown components={MarkdownComponents} remarkPlugins={[remarkGfm]}>
                                {para.text}
                              </ReactMarkdown>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-stone-500 space-y-3">
                        {isTextPreparing || chaptersLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">正在生成文字...</span>
                          </div>
                        ) : (
                          <p>暂无正文内容</p>
                        )}
                      </div>
                    )}
                  </article>
                )}

                {/* 底部翻页 */}
                <div className="flex justify-between items-center mt-12 md:mt-16 pt-8 border-t border-stone-200">
                  <Button
                    variant="ghost"
                    className="text-stone-500 hover:text-stone-800 text-xs md:text-sm"
                    disabled={!hasPrev}
                    onClick={() => {
                      if (viewMode === 'slices') {
                        setActiveIndex((x) => Math.max(0, x - 1))
                      } else {
                        navigateToBookPage(currentBookPageIndex - 1)
                      }
                    }}
                  >
                    上一页
                  </Button>
                  
                  <div className="text-xs md:text-sm text-stone-500 font-serif">
                    {viewMode === 'slices' 
                      ? `(${safeActivePageIndex + 1}/${(slicesManifest?.page_count ?? slicePages.length) || 1}页)`
                      : (() => {
                          const currentPageInBook = Math.max(0, Math.min(currentBookPageIndex, totalPages - 1)) + 1
                          return `(${currentPageInBook}/${totalPages}页)`
                        })()
                    }
                  </div>
                  
                  <Button
                    variant="outline"
                    className="border-stone-300 text-stone-700 hover:text-[#C82E31] hover:border-[#C82E31] text-xs md:text-sm"
                    disabled={!hasNext}
                    onClick={() => {
                      if (viewMode === 'slices') {
                        const totalSlicePages = slicesManifest?.page_count ?? slicePages.length
                        setActiveIndex((x) => Math.min(Math.max(0, totalSlicePages - 1), x + 1))
                      } else {
                        navigateToBookPage(currentBookPageIndex + 1)
                      }
                    }}
                  >
                    下一页
                  </Button>
                </div>

              </div>
            </ScrollArea>
          </div>

          {/* 4. 右侧助手栏 (响应式：PC端显示，移动端默认隐藏，通过按钮滑出) */}
          
          {/* PC 端固定显示 */}
          <aside className="w-80 flex-none border-l border-stone-200/60 bg-white/60 hidden xl:flex flex-col min-h-0">
             {renderRightSidebarContent()}
          </aside>

          {/* 
             移动端/平板端 抽屉显示 
             使用 absolute inset-0，位于 flex-1 容器内，因此不会覆盖 Header
          */}
          {mobileRightSidebarOpen && (
            <div className="absolute inset-0 z-50 xl:hidden">
              <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-[0.0625rem]" 
                onClick={() => setMobileRightSidebarOpen(false)}
              />
              <aside className="absolute top-0 right-0 h-full w-80 bg-[#fdfbf7] shadow-xl animate-in slide-in-from-right duration-300">
                {renderRightSidebarContent()}
              </aside>
            </div>
          )}

        </div>
      </div>
    </>
  )
}