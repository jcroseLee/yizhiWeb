'use client'

import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Strike from '@tiptap/extension-strike'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, Link as LinkIcon, Strikethrough, Underline as UnderlineIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface SimpleRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export default function SimpleRichTextEditor({
  value,
  onChange,
  placeholder = '发表你的真知灼见...',
  className,
  minHeight = '100px',
}: SimpleRichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#C82E31] underline hover:text-[#a61b1f]',
        },
      }),
      Underline,
      Strike,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none px-3 py-2 text-sm prose-p:my-1 prose-p:leading-relaxed',
        style: `min-height: ${minHeight};`,
      },
    },
    immediatelyRender: false,
  })

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    if (previousUrl) {
      // 如果已有链接，则移除
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // 显示链接输入框
    setLinkUrl('')
    setShowLinkInput(true)
  }, [editor])

  const handleLinkConfirm = useCallback(() => {
    if (!editor) return

    if (linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const handleLinkCancel = useCallback(() => {
    setShowLinkInput(false)
    setLinkUrl('')
    editor?.chain().focus().run()
  }, [editor])

  // 同步外部 value 变化到编辑器
  useEffect(() => {
    if (!editor) return
    
    const currentContent = editor.getHTML()
    // 只有当外部 value 与编辑器内容不同时才更新
    // 避免在用户输入时触发不必要的更新
    if (value !== currentContent) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  return (
    <div className={cn('relative border border-stone-200 rounded-xl bg-stone-50 focus-within:bg-white focus-within:border-[#C82E31] transition-all', className)}>
      {/* 工具栏 */}
      <div className="flex items-center gap-1 border-b border-stone-200 bg-stone-50/50 px-2 py-1.5 rounded-t-xl">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={cn(
            'p-1.5 rounded hover:bg-stone-200 transition-colors text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed',
            editor.isActive('bold') && 'bg-stone-200 text-[#C82E31]'
          )}
          title="加粗 (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={cn(
            'p-1.5 rounded hover:bg-stone-200 transition-colors text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed',
            editor.isActive('italic') && 'bg-stone-200 text-[#C82E31]'
          )}
          title="斜体 (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          className={cn(
            'p-1.5 rounded hover:bg-stone-200 transition-colors text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed',
            editor.isActive('underline') && 'bg-stone-200 text-[#C82E31]'
          )}
          title="下划线 (Ctrl+U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={cn(
            'p-1.5 rounded hover:bg-stone-200 transition-colors text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed',
            editor.isActive('strike') && 'bg-stone-200 text-[#C82E31]'
          )}
          title="删除线"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-stone-300 mx-0.5"></div>
        <button
          onClick={setLink}
          className={cn(
            'p-1.5 rounded hover:bg-stone-200 transition-colors text-stone-600',
            editor.isActive('link') && 'bg-stone-200 text-[#C82E31]'
          )}
          title="插入链接"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 编辑器内容 */}
      <div className="bg-stone-50 rounded-b-xl overflow-hidden focus-within:bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* 链接输入框 */}
      {showLinkInput && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg p-3 z-10">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="输入链接地址"
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C82E31]/20 focus:border-[#C82E31]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleLinkConfirm()
              } else if (e.key === 'Escape') {
                handleLinkCancel()
              }
            }}
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={handleLinkCancel}
              className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleLinkConfirm}
              className="px-3 py-1.5 text-xs bg-[#C82E31] text-white rounded hover:bg-[#a61b1f] transition-colors"
            >
              确认
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
