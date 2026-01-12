'use client'

import { BookOpen, Check, Edit2, Plus, Trash2, X } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

import { Button } from '@/lib/components/ui/button'
import { Textarea } from '@/lib/components/ui/textarea'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import {
  addDivinationNote,
  deleteDivinationNote,
  getDivinationNotes,
  updateDivinationNote,
  type DivinationNote
} from '@/lib/services/profile'

interface PrivateNotesSectionProps {
  /** 记录ID（本地ID或云端UUID） */
  recordId: string
  /** 是否已保存到云端 */
  isSaved: boolean
  /** 是否可以查看笔记 */
  canView: boolean
  /** AI笔记前缀，用于过滤显示（默认：'【AI详批】'） */
  aiNotePrefix?: string
  /** 本地存储前缀（默认：'divinationLocalNotes:'） */
  localStoragePrefix?: string
  /** 登录重定向回调 */
  onLoginRedirect?: () => void
  /** 自定义样式类名 */
  className?: string
  /** 笔记更新回调，用于同步外部状态 */
  onNotesChange?: (notes: DivinationNote[]) => void
}

export interface PrivateNotesSectionRef {
  /** 获取当前所有笔记（包括AI笔记） */
  getNotes: () => DivinationNote[]
  /** 获取笔记列表的DOM元素引用 */
  scrollIntoView: (options?: ScrollIntoViewOptions) => void
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const loadLocalNotes = (resultId: string, prefix: string): DivinationNote[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(`${prefix}${resultId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DivinationNote[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveLocalNotes = (resultId: string, notes: DivinationNote[], prefix: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${prefix}${resultId}`, JSON.stringify(notes))
  } catch (e) {
    console.error("Failed to save local notes:", e)
  }
}

export const PrivateNotesSection = forwardRef<PrivateNotesSectionRef, PrivateNotesSectionProps>(({
  recordId,
  isSaved,
  canView,
  aiNotePrefix = '【AI详批】',
  localStoragePrefix = 'divinationLocalNotes:',
  onLoginRedirect,
  className = '',
  onNotesChange
}, ref) => {
  const { toast } = useToast()
  const noteSectionRef = useRef<HTMLDivElement>(null)

  const [notes, setNotes] = useState<DivinationNote[]>([])
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  // 过滤掉AI笔记，只显示用户笔记
  const displayNotes = useMemo(
    () => notes.filter((n) => !n.content.startsWith(aiNotePrefix)),
    [notes, aiNotePrefix]
  )

  // 暴露方法给外部
  useImperativeHandle(ref, () => ({
    getNotes: () => notes,
    scrollIntoView: (options?: ScrollIntoViewOptions) => {
      noteSectionRef.current?.scrollIntoView(options)
    }
  }), [notes])

  // 同步notes到外部
  useEffect(() => {
    if (onNotesChange) {
      onNotesChange(notes)
    }
  }, [notes, onNotesChange])

  // 加载笔记
  useEffect(() => {
    if (!canView || !recordId) return

    const loadNotes = async () => {
      // 如果是已保存的记录，从云端加载
      if (isSaved) {
        try {
          const fetchedNotes = await getDivinationNotes(recordId)
          setNotes(fetchedNotes)
        } catch (err) {
          console.error("Failed to load notes:", err)
          // 如果加载失败，尝试从本地加载
          setNotes(loadLocalNotes(recordId, localStoragePrefix))
        }
      } else {
        // 本地记录，从localStorage加载
        setNotes(loadLocalNotes(recordId, localStoragePrefix))
      }
    }

    loadNotes()
  }, [recordId, isSaved, canView, localStoragePrefix])

  const handleAddNote = useCallback(async () => {
    if (!newNoteContent.trim()) return

    // 如果是本地结果，直接保存到本地
    if (!isSaved) {
      const newNote: DivinationNote = {
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        content: newNoteContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const updatedNotes = [newNote, ...notes]
      setNotes(updatedNotes)
      saveLocalNotes(recordId, updatedNotes, localStoragePrefix)
      setNewNoteContent('')
      toast({ title: '本地笔记已添加', description: '保存到云端后将自动同步' })
      return
    }

    const user = await getCurrentUser()
    if (!user) {
      if (onLoginRedirect) {
        onLoginRedirect()
      } else {
        toast({ title: '需要登录', description: '请先登录以添加笔记', variant: 'destructive' })
      }
      return
    }

    setNoteLoading(true)
    try {
      const { success, note } = await addDivinationNote(recordId, newNoteContent)
      if (success && note) {
        setNotes(prev => [note, ...prev])
        setNewNoteContent('')
        toast({ title: '笔记添加成功' })
      } else {
        toast({ title: '添加失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '添加失败', variant: 'destructive' })
    } finally {
      setNoteLoading(false)
    }
  }, [newNoteContent, isSaved, notes, recordId, localStoragePrefix, toast, onLoginRedirect])

  const handleUpdateNote = useCallback(async (noteId: string) => {
    if (!editNoteContent.trim()) return

    // 如果是本地笔记或未保存到云端，直接更新本地
    if (noteId.startsWith('local_') || !isSaved) {
      const updatedNotes = notes.map(n =>
        n.id === noteId
          ? { ...n, content: editNoteContent, updated_at: new Date().toISOString() }
          : n
      )
      setNotes(updatedNotes)
      saveLocalNotes(recordId, updatedNotes, localStoragePrefix)
      setEditingNoteId(null)
      setEditNoteContent('')
      toast({ title: '本地笔记已更新' })
      return
    }

    const user = await getCurrentUser()
    if (!user) {
      if (onLoginRedirect) {
        onLoginRedirect()
      } else {
        toast({ title: '需要登录', description: '请先登录以更新笔记', variant: 'destructive' })
      }
      return
    }

    setNoteLoading(true)
    try {
      const { success, note } = await updateDivinationNote(noteId, editNoteContent)
      if (success && note) {
        setNotes(prev => prev.map(n => n.id === noteId ? note : n))
        setEditingNoteId(null)
        setEditNoteContent('')
        toast({ title: '笔记更新成功' })
      } else {
        toast({ title: '更新失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '更新失败', variant: 'destructive' })
    } finally {
      setNoteLoading(false)
    }
  }, [editNoteContent, isSaved, notes, recordId, localStoragePrefix, toast, onLoginRedirect])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return

    // 如果是本地笔记或未保存到云端，直接删除本地
    if (noteId.startsWith('local_') || !isSaved) {
      const updatedNotes = notes.filter(n => n.id !== noteId)
      setNotes(updatedNotes)
      saveLocalNotes(recordId, updatedNotes, localStoragePrefix)
      toast({ title: '本地笔记已删除' })
      return
    }

    const user = await getCurrentUser()
    if (!user) {
      if (onLoginRedirect) {
        onLoginRedirect()
      } else {
        toast({ title: '需要登录', description: '请先登录以删除笔记', variant: 'destructive' })
      }
      return
    }

    setNoteLoading(true)
    try {
      const { success } = await deleteDivinationNote(noteId)
      if (success) {
        setNotes(prev => prev.filter(n => n.id !== noteId))
        toast({ title: '笔记删除成功' })
      } else {
        toast({ title: '删除失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    } finally {
      setNoteLoading(false)
    }
  }, [isSaved, notes, recordId, localStoragePrefix, toast, onLoginRedirect])

  if (!canView) return null

  return (
    <div ref={noteSectionRef} className={`mb-8 bg-white border border-stone-200 rounded-lg p-5 lg:p-8 shadow-sm scroll-mt-20 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="w-5 h-5 text-[#C82E31]" />
        <h4 className="font-serif font-bold text-stone-800 text-base lg:text-lg tracking-wide">
          私密笔记
        </h4>
        <span className="text-[10px] sm:text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
          仅自己可见
        </span>
      </div>

      <div className="space-y-6">
        {/* 笔记列表 */}
        <div className="space-y-4">
          {displayNotes.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm italic bg-stone-50 rounded-lg border border-dashed border-stone-200">
              暂无笔记，记录下您的断语或反馈吧...
            </div>
          ) : (
            displayNotes.map(note => (
              <div
                key={note.id}
                className="group relative bg-stone-50/50 hover:bg-stone-50 border border-stone-100 rounded-lg p-4 transition-all"
              >
                {editingNoteId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                      className="min-h-[80px] bg-white"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingNoteId(null)
                          setEditNoteContent('')
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4 text-stone-400" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={noteLoading}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-stone-400 font-mono">
                        {formatDateTime(note.created_at)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-stone-200 text-stone-400 hover:text-stone-600"
                          disabled={noteLoading}
                          onClick={() => {
                            setEditingNoteId(note.id)
                            setEditNoteContent(note.content)
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100 text-stone-400 hover:text-red-600"
                          disabled={noteLoading}
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-stone-700 font-serif whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* 添加笔记 */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <Textarea
            placeholder="写下新的笔记..."
            className="min-h-[80px] bg-white border-stone-200 resize-none focus:border-[#C82E31]/30 transition-colors font-serif text-stone-700"
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddNote}
              disabled={noteLoading || !newNoteContent.trim()}
              variant="outline"
              className="text-stone-600 hover:text-[#C82E31] hover:bg-red-50 border-stone-200 gap-1"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              {noteLoading ? '添加中...' : '添加笔记'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})

PrivateNotesSection.displayName = 'PrivateNotesSection'
