'use client'

import RichTextEditor from '@/lib/components/RichTextEditor'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import { Input } from '@/lib/components/ui/input'
import {
    Sheet,
    SheetContent,
    SheetTitle
} from "@/lib/components/ui/sheet"
import { getHexagramResult } from '@/lib/constants/hexagrams'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import { createPost, getPost, publishDraft, saveDraft, updateDraft, updatePost } from '@/lib/services/community'
import { getDivinationRecordById, getUserDivinationRecords, type DivinationRecord } from '@/lib/services/profile'
import {
    ArrowLeft,
    Check,
    ChevronRight,
    Loader2,
    Plus,
    Save,
    ScrollText,
    Send,
    X
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

// -----------------------------------------------------------------------------
// 样式定义
// -----------------------------------------------------------------------------
const styles = `
  .input-clean {
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
  }
  .input-clean:focus {
    box-shadow: none;
    outline: none;
  }
  
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e7e5e4; border-radius: 20px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d6d3d1; }

  /* 核心修复：强制编辑器高度自适应（写文章模式） */
  .rich-text-content {
    min-height: 300px !important;
    height: auto !important;
    overflow: visible !important;
    border: none !important;
  }

  /* 移动端工具栏调整 */
  .rich-text-content > div:first-child {
    position: sticky !important;
    top: 56px !important; /* 移动端 Navbar 高度通常稍小 */
    z-index: 30 !important;
    background-color: rgba(255, 255, 255, 0.98) !important;
    border-bottom: 1px solid #e7e5e4 !important;
    margin: 0 !important;
    padding: 8px 4px !important;
    overflow-x: auto !important; /* 允许工具栏横向滚动 */
  }
  
  @media (min-width: 1024px) {
    .rich-text-content > div:first-child {
      top: 64px !important;
    }
  }

  .rich-text-content > div:last-child {
    min-height: 300px !important;
    max-height: none !important;
    height: auto !important;
    overflow: visible !important;
  }

  .rich-text-content .ProseMirror {
    min-height: 300px !important;
    height: auto !important; 
    overflow: visible !important;
    outline: none !important;
    padding-bottom: 50px !important;
  }
  
  .rich-text-content .ProseMirror p.is-editor-empty:first-child::before {
    color: #a8a29e;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`

// -----------------------------------------------------------------------------
// 类型与工具
// -----------------------------------------------------------------------------
const getMethodName = (method: number): string => {
  const methodMap: Record<number, string> = {
    1: '金钱课', 2: '时间起卦', 3: '报数起卦', 4: '意念起卦',
  }
  return methodMap[method] || '未知方法'
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  } catch {
    return dateString
  }
}

interface RecordDisplay {
  id: string
  title?: string
  gua: string
  date: string
  method: string
  record: DivinationRecord
}

const convertRecordToDisplay = (record: DivinationRecord): RecordDisplay => {
  const originalKey = String(record.original_key).replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
  const hexagram = getHexagramResult(originalKey)
  const guaName = hexagram.name || '未知卦'
  
  return {
    id: record.id,
    title: record.question || undefined,
    gua: guaName,
    date: formatDate(record.divination_time),
    method: getMethodName(record.method),
    record,
  }
}

// -----------------------------------------------------------------------------
// 子组件：排盘卡片
// -----------------------------------------------------------------------------
const RecordCard = ({ data, onClick, isSelected = false, compact = false }: { data: RecordDisplay, onClick?: () => void, isSelected?: boolean, compact?: boolean }) => {
  return (
    <div 
      onClick={onClick}
      className={`relative group border transition-all duration-200 rounded-xl cursor-pointer overflow-hidden ${isSelected ? 'bg-red-50/50 border-[#C82E31] ring-1 ring-[#C82E31]/20' : 'bg-white border-stone-200 hover:border-[#C82E31]/50 hover:shadow-sm hover:-translate-y-0.5'} ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="absolute -right-2 -bottom-4 text-[4rem] font-serif text-stone-50 opacity-50 select-none pointer-events-none group-hover:text-red-50/50 transition-colors">卦</div>
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isSelected ? 'bg-[#C82E31] text-white border-[#C82E31]' : 'bg-stone-100 text-stone-500 border-stone-200 group-hover:border-red-200 group-hover:text-red-600 group-hover:bg-red-50'}`}>{data.gua}</span>
            <span className="text-[10px] text-stone-400 font-mono">{data.date}</span>
          </div>
          <h4 className={`font-serif font-bold truncate ${compact ? 'text-sm' : 'text-base'} text-stone-800 group-hover:text-[#C82E31] transition-colors`}>{data.title || '无标题求测'}</h4>
          <div className="mt-2 flex items-center text-xs text-stone-400 gap-2">
            <span className="flex items-center gap-1"><ScrollText className="w-3 h-3" /> {data.gua}</span>
          </div>
        </div>
        {isSelected ? (
          <div className="w-6 h-6 rounded-full bg-[#C82E31] text-white flex items-center justify-center shrink-0 shadow-sm animate-in zoom-in duration-200"><Check className="w-3.5 h-3.5" /></div>
        ) : (
          <div className="w-6 h-6 rounded-full border border-stone-200 text-transparent group-hover:border-red-200 group-hover:bg-red-50 flex items-center justify-center shrink-0"><ChevronRight className="w-3.5 h-3.5 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 子组件：排盘选择列表
// -----------------------------------------------------------------------------
const RecordSelectionList = ({ 
  records, 
  loading, 
  selectedId, 
  onSelect 
}: { 
  records: RecordDisplay[], 
  loading: boolean, 
  selectedId?: string, 
  onSelect: (record: RecordDisplay) => void 
}) => {
  return (
    <Card className="border-none shadow-sm bg-white flex-1 flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-stone-100 bg-white sticky top-0 z-10">
          <h3 className="font-medium text-stone-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-[#C82E31] rounded-full"></div>
            选择排盘
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open('/6yao', '_blank')}>
            <Plus className="w-3 h-3" /> 新建排盘
          </Button>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-stone-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> 加载中...
          </div>
        ) : records.length > 0 ? (
          records.map(record => (
            <RecordCard
              key={record.id}
              data={record}
              isSelected={selectedId === record.id}
              onClick={() => onSelect(record)}
              compact
            />
          ))
        ) : (
          <div className="text-center py-10 text-stone-400 text-sm">
            暂无排盘记录
          </div>
        )}
      </div>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// 主页面组件
// -----------------------------------------------------------------------------
export default function PublishCasePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const recordIdParam = searchParams.get('recordId')
  const postIdParam = searchParams.get('id')
  
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  
  const [title, setTitle] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<RecordDisplay | null>(null)
  const [backgroundDesc, setBackgroundDesc] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<RecordDisplay[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  
  // Data Loading
  const loadHistoryRecords = useCallback(async () => {
    setLoadingRecords(true)
    try {
      const records = await getUserDivinationRecords(50)
      const displayRecords = records.map(convertRecordToDisplay)
      setHistoryRecords(displayRecords)
    } catch (error) {
      console.error(error)
      toast({ title: '加载失败', variant: 'destructive' })
    } finally {
      setLoadingRecords(false)
    }
  }, [toast])
  
  useEffect(() => {
    const loadData = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }
      await loadHistoryRecords()
      
      if (recordIdParam) {
        try {
          const record = await getDivinationRecordById(recordIdParam, true)
          if (record) {
            const displayRecord = convertRecordToDisplay(record)
            setSelectedRecord(displayRecord)
            if (record.question) setTitle(record.question)
            const newSearchParams = new URLSearchParams(searchParams.toString())
            newSearchParams.delete('recordId')
            window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams.toString()}`)
          }
        } catch (error) { console.error(error) }
      }
      
      if (postIdParam) {
        setIsEditMode(true)
        setEditingPostId(postIdParam)
        try {
          const post = await getPost(postIdParam)
          if (post) {
            const currentUser = await getCurrentUser()
            if (post.user_id !== currentUser?.id) {
              toast({ title: '无权限', description: '您只能编辑自己的案例', variant: 'destructive' })
              router.push('/cases')
              return
            }
            setTitle(post.title)
            setIsDraft(post.status === 'draft')
            
            if (post.divination_record) {
              // @ts-expect-error - 忽略类型差异
              const displayRecord = convertRecordToDisplay(post.divination_record)
              setSelectedRecord(displayRecord)
              
              const content = post.content_html || post.content || ''
              
              // 1. 清理关联排盘信息（兼容旧数据）
              const cleanedContent = content
                .replace(/\*\*关联排盘[^*]*\*\*/g, '')
                .replace(/\*\*问题[^*]*\*\*/g, '')
                .replace(/关联排盘[:：][^\n]*/g, '')
                .replace(/问题[:：][^\n]*/g, '')
                .trim()
                
              // 2. 分离背景和推演
              const parts = cleanedContent.split('<h2>卦理推演</h2>')
              if (parts.length > 1) {
                 setBackgroundDesc(parts[0].trim())
                 setReasoning(parts[1].trim())
              } else {
                 setBackgroundDesc(cleanedContent)
                 setReasoning('')
              }
            }
            const newSearchParams = new URLSearchParams(searchParams.toString())
            newSearchParams.delete('id')
            window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams.toString()}`)
          } else {
            toast({ title: '加载失败', description: '案例不存在', variant: 'destructive' })
            router.push('/cases')
          }
        } catch (error) {
          console.error(error)
          toast({ title: '加载失败', description: '无法加载案例数据', variant: 'destructive' })
          router.push('/cases')
        }
      }
    }
    loadData()
  }, [router, toast, loadHistoryRecords, recordIdParam, postIdParam, searchParams])
  
  const handlePublish = async () => {
    if (!title.trim()) return toast({ title: '请输入标题', variant: 'destructive' })
    if (!selectedRecord) return toast({ title: '请选择排盘记录', variant: 'destructive' })
    if (!backgroundDesc.trim()) return toast({ title: '请输入案例描述', variant: 'destructive' })
    
    try {
      setIsSubmitting(true)
      let content = backgroundDesc
      
      if (reasoning.trim()) {
        content += `\n\n<h2>卦理推演</h2>\n\n${reasoning}`
      }
      
      if (selectedRecord) {
        const guaInfo = selectedRecord.record.question 
          ? `**关联排盘：${selectedRecord.gua}**\n**问题：${selectedRecord.record.question}**\n\n`
          : `**关联排盘：${selectedRecord.gua}**\n\n`
        content = guaInfo + content
      }
      
      const postData = {
        title: title.trim(),
        content: content.trim(),
        type: 'help' as const, // 使用 'help' 类型，因为它支持关联排盘
        divination_record_id: selectedRecord.record.id,
      }
      
      if (isEditMode && editingPostId) {
        if (isDraft) {
          await publishDraft(editingPostId)
          await updatePost(editingPostId, postData)
          toast({ title: '发布成功' })
        } else {
          await updatePost(editingPostId, postData)
          toast({ title: '更新成功' })
        }
      } else {
        await createPost(postData)
        toast({ title: '发布成功' })
      }
      // TODO: 跳转到案例详情页，目前先跳转到案例列表
      router.push(`/cases`)
    } catch (error) {
      toast({ title: isEditMode ? '更新失败' : '发布失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleSaveDraft = async () => {
    if (!title.trim() && !backgroundDesc.trim()) {
      return toast({ title: '请至少填写标题或内容', variant: 'destructive' })
    }
    
    try {
      setIsSavingDraft(true)
      let content = backgroundDesc
      
      if (reasoning.trim()) {
        content += `\n\n<h2>卦理推演</h2>\n\n${reasoning}`
      }
      
      if (selectedRecord) {
        const guaInfo = selectedRecord.record.question 
          ? `**关联排盘：${selectedRecord.gua}**\n**问题：${selectedRecord.record.question}**\n\n`
          : `**关联排盘：${selectedRecord.gua}**\n\n`
        content = guaInfo + content
      }
      
      const draftData = {
        title: title.trim() || '未命名案例草稿',
        content: content.trim() || '',
        type: 'help' as const,
        divination_record_id: selectedRecord ? selectedRecord.record.id : null,
      }
      
      let draft
      if (isEditMode && editingPostId && isDraft) {
        draft = await updateDraft(editingPostId, draftData)
        toast({ title: '草稿已更新' })
      } else {
        draft = await saveDraft(draftData)
        toast({ title: '草稿已保存' })
        setIsEditMode(true)
        setEditingPostId(draft.id)
        setIsDraft(true)
      }
    } catch (error) {
      toast({ title: '保存草稿失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    } finally {
      setIsSavingDraft(false)
    }
  }

  return (
    <>
      <style jsx global>
        {styles}
      </style>
      <div className="min-h-screen bg-[#f5f5f7] paper-texture font-sans text-stone-800 pb-20">
        
        {/* Navbar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200 h-14 lg:h-16">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="-ml-2 hover:bg-stone-100 h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5 text-stone-600" />
              </Button>
              <h1 className="text-base lg:text-lg font-serif font-bold text-stone-900 truncate max-w-[120px] lg:max-w-none">
                {isEditMode ? '编辑案例' : '发布案例'}
              </h1>
            </div>
            
            {/* 顶部操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full px-3 lg:px-6 h-8 lg:h-10 text-xs lg:text-sm"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
              >
                {isSavingDraft ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin lg:mr-2" />
                ) : (
                  <Save className="h-3.5 w-3.5 lg:mr-2" />
                )}
                <span className="hidden lg:inline">{isSavingDraft ? '保存中' : '保存草稿'}</span>
                <span className="lg:hidden">{isSavingDraft ? '保存' : '草稿'}</span>
              </Button>
              <Button
                className="bg-[#C82E31] hover:bg-[#b02225] text-white rounded-full px-4 lg:px-6 h-8 lg:h-10 text-xs lg:text-sm shadow-md shadow-red-100 transition-all"
                onClick={handlePublish}
                disabled={isSubmitting || !title.trim() || !selectedRecord}
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin lg:mr-2" />
                ) : (
                  <Send className="h-3.5 w-3.5 lg:mr-2" />
                )}
                <span>{isSubmitting ? (isEditMode ? "更新" : "发布") : (isDraft ? "发布" : (isEditMode ? "更新" : "发布"))}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-0 lg:px-8 py-0 lg:py-8">
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 items-start">
            
            {/* 左侧编辑器区 */}
            <div className="flex-1 w-full min-w-0">
              <Card className="min-h-[85vh] border-none shadow-sm flex flex-col bg-white rounded-none lg:rounded-xl">
                <CardContent className="flex-1 p-0 flex flex-col">
                  {/* 标题输入 */}
                  <div className="px-4 lg:px-8 pt-6 pb-2">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="请输入案例标题"
                      className="text-xl lg:text-2xl font-serif font-bold border-none shadow-none px-0 placeholder:text-stone-300 focus-visible:ring-0 bg-transparent"
                    />
                  </div>

                  {/* 选中的排盘显示 */}
                  {selectedRecord && (
                    <div className="px-4 lg:px-8 pb-4">
                      <div className="bg-stone-50 rounded-lg p-3 flex items-center justify-between group border border-stone-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#C82E31]/10 flex items-center justify-center text-[#C82E31] font-serif font-bold">
                            {selectedRecord.gua.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-stone-900">{selectedRecord.title || '无标题排盘'}</div>
                            <div className="text-xs text-stone-500 flex items-center gap-2">
                              <span>{selectedRecord.gua}</span>
                              <span>·</span>
                              <span>{selectedRecord.date}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)} className="text-stone-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 提示选择排盘 */}
                  {!selectedRecord && (
                     <div className="px-4 lg:px-8 pb-4">
                       <div className="hidden lg:flex bg-red-50 border border-red-100 text-red-800 rounded-lg p-3 text-sm items-center gap-2">
                          <ScrollText className="w-4 h-4" />
                          请在右侧选择一个排盘记录作为案例依据
                       </div>
                       
                       <Button 
                         variant="outline" 
                         className="lg:hidden w-full border-dashed border-2 h-14 text-stone-500 hover:text-[#C82E31] hover:border-[#C82E31] hover:bg-red-50/50 gap-2"
                         onClick={() => setIsSheetOpen(true)}
                       >
                          <ScrollText className="w-4 h-4" />
                          点击选择排盘记录
                       </Button>
                     </div>
                  )}

                  {/* 编辑器 1：案例背景 */}
                  <div className="px-4 lg:px-8 py-2">
                    <h3 className="text-sm font-bold text-stone-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-3 bg-stone-300 rounded-full"></div>
                      案例背景
                    </h3>
                  </div>
                  <div className="flex-1 rich-text-content relative z-0 mb-8">
                    <RichTextEditor
                      content={backgroundDesc}
                      onChange={setBackgroundDesc}
                      placeholder="请详细描述案例背景、求测事项..."
                    />
                  </div>

                  {/* 编辑器 2：卦理推演 */}
                  <div className="px-4 lg:px-8 py-2 border-t border-stone-100 pt-8">
                    <h3 className="text-sm font-bold text-[#C82E31] mb-2 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-3 bg-[#C82E31] rounded-full"></div>
                      卦理推演
                    </h3>
                  </div>
                  <div className="flex-1 rich-text-content relative z-0">
                    <RichTextEditor
                      content={reasoning}
                      onChange={setReasoning}
                      placeholder="请详细描述断语分析、反馈结果..."
                    />
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* 右侧设置区 */}
            <div className="hidden lg:flex w-80 shrink-0 flex-col gap-4 h-[600px] mt-8">
              <RecordSelectionList 
                records={historyRecords} 
                loading={loadingRecords} 
                selectedId={selectedRecord?.id} 
                onSelect={setSelectedRecord} 
              />
            </div>
            
            {/* Mobile Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0 rounded-t-xl bg-white">
                <SheetTitle className="sr-only">选择排盘</SheetTitle>
                <div className="flex-1 overflow-hidden h-full pt-10">
                  <RecordSelectionList 
                    records={historyRecords} 
                    loading={loadingRecords} 
                    selectedId={selectedRecord?.id} 
                    onSelect={(record) => {
                      setSelectedRecord(record)
                      setIsSheetOpen(false)
                    }} 
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </main>
      </div>
    </>
  )
}
