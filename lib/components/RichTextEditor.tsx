'use client'

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/lib/components/ui/dialog'
import { getCurrentUser } from '@/lib/services/auth'
import { getSupabaseClient } from '@/lib/services/supabaseClient'
import { useAlert } from '@/lib/utils/alert'
import Code from '@tiptap/extension-code'
import Dropcursor from '@tiptap/extension-dropcursor'
import Gapcursor from '@tiptap/extension-gapcursor'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Strike from '@tiptap/extension-strike'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    ChevronDown,
    Code as CodeIcon,
    Heading1,
    Image as ImageIcon,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Loader2,
    Plus,
    Redo,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo,
    Upload,
    X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = '分享你的易学见解...',
  className = ''
}: RichTextEditorProps) {
  const { alert } = useAlert()
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [showUploadArea, setShowUploadArea] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 输入对话框状态
  const [showInputDialog, setShowInputDialog] = useState(false)
  const [inputDialogTitle, setInputDialogTitle] = useState('')
  const [inputDialogValue, setInputDialogValue] = useState('')
  const [inputDialogCallback, setInputDialogCallback] = useState<((value: string | null) => void) | null>(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
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
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      Underline,
      Strike,
      Code.configure({
        HTMLAttributes: {
          class: 'bg-stone-100 px-1 py-0.5 rounded text-sm font-mono',
        },
      }),
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Dropcursor,
      Gapcursor,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
    immediatelyRender: false,
  })

  const lastAppliedExternalContentRef = useRef<string | null>(null)

  useEffect(() => {
    if (!editor) return
    const nextContent = content ?? ''
    const currentContent = editor.getHTML()
    if (nextContent === currentContent) return
    if (lastAppliedExternalContentRef.current === nextContent) return
    lastAppliedExternalContentRef.current = nextContent
    editor.commands.setContent(nextContent, { emitUpdate: false })
  }, [content, editor])

  // 显示输入对话框的辅助函数
  const showPrompt = useCallback((title: string, defaultValue: string = '', callback: (value: string | null) => void) => {
    setInputDialogTitle(title)
    setInputDialogValue(defaultValue)
    setInputDialogCallback(() => callback)
    setShowInputDialog(true)
  }, [])

  // 处理输入对话框确认
  const handleInputDialogConfirm = useCallback(() => {
    if (inputDialogCallback) {
      inputDialogCallback(inputDialogValue)
    }
    setShowInputDialog(false)
    setInputDialogCallback(null)
    setInputDialogValue('')
  }, [inputDialogValue, inputDialogCallback])

  // 处理输入对话框取消
  const handleInputDialogCancel = useCallback(() => {
    if (inputDialogCallback) {
      inputDialogCallback(null)
    }
    setShowInputDialog(false)
    setInputDialogCallback(null)
    setInputDialogValue('')
  }, [inputDialogCallback])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    showPrompt('输入链接地址', previousUrl || '', (url) => {
      if (url === null) {
        return
      }

      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        return
      }

      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    })
  }, [editor, showPrompt])

  const insertImage = useCallback((url?: string) => {
    if (!editor) return
    
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    } else {
      // 如果没有提供 URL，提示用户输入
      showPrompt('输入图片地址', '', (inputUrl) => {
        if (inputUrl) {
          editor.chain().focus().setImage({ src: inputUrl }).run()
        }
      })
    }
  }, [editor, showPrompt])

  // 上传图片到 Supabase Storage
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('请先登录')
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      // 如果没有 Supabase，使用 base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    try {
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('不支持的文件类型，请上传 JPEG、PNG、WebP 或 GIF 格式的图片')
      }

      // 验证文件大小（5MB）
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('文件大小不能超过 5MB')
      }

      // 生成文件名：userId/timestamp.extension
      // RLS 策略要求路径格式为 {user_id}/{filename}，第一层文件夹必须是用户 ID
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // 上传文件到 posts bucket（如果不存在则使用 avatars）
      const { error } = await supabase.storage
        .from('posts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        // 如果 posts bucket 不存在或没有权限，尝试使用 avatars bucket
        // 两个 bucket 的路径格式相同：{user_id}/{filename}
        const { error: fallbackError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (fallbackError) {
          // Provide helpful error message for missing buckets
          if (fallbackError.message?.includes('Bucket not found') || fallbackError.message?.includes('bucket')) {
            throw new Error('存储桶未创建。请在 Supabase Dashboard 中创建 "posts" 和 "avatars" 存储桶，或运行数据库迁移。')
          }
          throw fallbackError
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        return urlData.publicUrl
      }

      // 获取公开 URL
      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error: unknown) {
      console.error('Error uploading image:', error)
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      throw new Error(errorMessage)
    }
  }, [])

  // 处理文件选择
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const maxFiles = 3
    const maxSize = 5 * 1024 * 1024 // 5MB

    // 验证文件数量
    if (fileArray.length > maxFiles) {
      alert(`最多只能上传 ${maxFiles} 个文件`, 'destructive')
      return
    }

    // 验证文件大小和类型
    const validFiles: File[] = []
    for (const file of fileArray) {
      if (file.size > maxSize) {
        alert(`文件 ${file.name} 超过 5MB 限制`, 'destructive')
        continue
      }
      if (!file.type.startsWith('image/')) {
        alert(`文件 ${file.name} 不是图片格式`, 'destructive')
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    setUploadingFiles(validFiles)
    setUploading(true)

    try {
      for (const file of validFiles) {
        const url = await uploadImage(file)
        insertImage(url)
      }
      setShowUploadArea(false)
      setUploadingFiles([])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      alert(`上传失败: ${errorMessage}`, 'destructive')
    } finally {
      setUploading(false)
    }
  }, [uploadImage, insertImage, alert])

  // 处理文件输入变化
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    // 重置 input，以便可以再次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFileSelect])

  // 处理拖拽上传
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  if (!editor) {
    return null
  }

  const currentHeading = editor.isActive('heading', { level: 1 })
    ? 'H1'
    : editor.isActive('heading', { level: 2 })
    ? 'H2'
    : editor.isActive('heading', { level: 3 })
    ? 'H3'
    : '文本'

  return (
    <div className={`border border-stone-200 rounded-xl bg-white ${className}`}>
      {/* 完整工具栏 - 符合官网 Simple Editor 模式 */}
      <div className="flex items-center gap-1 border-b border-stone-100 p-2 flex-wrap">
        {/* 撤销/重做 */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-2 rounded hover:bg-stone-100 transition-colors text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="撤销 (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-2 rounded hover:bg-stone-100 transition-colors text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="重做 (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </button>

        <div className="w-px h-4 bg-stone-200 mx-1"></div>

        {/* 标题下拉菜单 */}
        <div className="relative">
          <button
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            className={`p-2 rounded hover:bg-stone-100 transition-colors flex items-center gap-1 ${
              editor.isActive('heading') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
            }`}
            title="标题"
          >
            <Heading1 className="h-4 w-4" />
            <span className="text-xs">{currentHeading}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {showHeadingMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowHeadingMenu(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                <button
                  onClick={() => {
                    editor.chain().focus().setParagraph().run()
                    setShowHeadingMenu(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 ${
                    !editor.isActive('heading') ? 'bg-stone-50 text-[#C82E31]' : 'text-stone-600'
                  }`}
                >
                  文本
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                    setShowHeadingMenu(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 ${
                    editor.isActive('heading', { level: 1 }) ? 'bg-stone-50 text-[#C82E31]' : 'text-stone-600'
                  }`}
                >
                  标题 1
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                    setShowHeadingMenu(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 ${
                    editor.isActive('heading', { level: 2 }) ? 'bg-stone-50 text-[#C82E31]' : 'text-stone-600'
                  }`}
                >
                  标题 2
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run()
                    setShowHeadingMenu(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 ${
                    editor.isActive('heading', { level: 3 }) ? 'bg-stone-50 text-[#C82E31]' : 'text-stone-600'
                  }`}
                >
                  标题 3
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-stone-200 mx-1"></div>

        {/* 列表 */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('bulletList') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="无序列表"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('orderedList') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="有序列表"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px h-4 bg-stone-200 mx-1"></div>

        {/* 文本格式化 */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('bold') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="粗体 (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('italic') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="斜体 (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('strike') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="删除线"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('code') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="代码"
        >
          <CodeIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('underline') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="下划线"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <div className="w-px h-4 bg-stone-200 mx-1"></div>

        {/* 链接和图片 */}
        <button
          onClick={setLink}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('link') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="添加链接"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertImage()}
          className="p-2 rounded hover:bg-stone-100 transition-colors text-stone-600"
          title="插入图片"
        >
          <ImageIcon className="h-4 w-4" />
        </button>

        {/* 上标/下标 */}
        <button
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('subscript') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="下标"
        >
          <span className="text-xs font-bold">x₂</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive('superscript') ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="上标"
        >
          <span className="text-xs font-bold">x²</span>
        </button>

        <div className="w-px h-4 bg-stone-200 mx-1"></div>

        {/* 对齐 */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="左对齐"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="居中对齐"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded hover:bg-stone-100 transition-colors ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="右对齐"
        >
          <AlignRight className="h-4 w-4" />
        </button>

        <div className="w-px h-4 bg-stone-200 mx-1"></div>

        {/* Add 按钮 - 显示上传区域 */}
        <button
          onClick={() => setShowUploadArea(!showUploadArea)}
          className={`p-2 rounded hover:bg-stone-100 transition-colors flex items-center gap-1 ${
            showUploadArea ? 'bg-stone-100 text-[#C82E31]' : 'text-stone-600'
          }`}
          title="添加文件"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs font-medium">Add</span>
        </button>
      </div>

      {/* 文件上传区域 */}
      {showUploadArea && (
        <div
          className="relative border-b border-stone-100 p-4 bg-stone-50/50"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <button
            onClick={() => {
              setShowUploadArea(false)
              setUploadingFiles([])
            }}
            className="absolute top-2 right-2 p-1 rounded hover:bg-stone-200 text-stone-500 z-10"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative border-2 border-dashed border-stone-300 rounded-lg p-8 text-center hover:border-[#C82E31] transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#C82E31]" />
                <div className="text-sm text-stone-600">
                  正在上传 {uploadingFiles.length} 个文件...
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      点击上传或拖拽文件到此处
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      最多 3 个文件，每个文件最大 5MB
                    </p>
                  </div>
                </div>
                {uploadingFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadingFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm"
                      >
                        <span className="text-stone-700 truncate flex-1">{file.name}</span>
                        <span className="text-stone-500 ml-2">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 编辑器内容区 */}
      <div 
        className="min-h-[400px] max-h-[600px] overflow-y-auto"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #a8a29e;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror p {
          margin: 0.5rem 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #C82E31;
          padding-left: 1rem;
          margin: 0.5rem 0;
          font-style: italic;
          color: #57534e;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 0.5rem 0;
        }
        .ProseMirror a {
          color: #C82E31;
          text-decoration: underline;
        }
        .ProseMirror a:hover {
          color: #a61b1f;
        }
        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1rem 0;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0.75rem 0;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }
        .ProseMirror code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          font-family: monospace;
        }
        .ProseMirror p[style*="text-align: center"] {
          text-align: center;
        }
        .ProseMirror p[style*="text-align: right"] {
          text-align: right;
        }
      `}</style>

      {/* 输入对话框 */}
      <Dialog open={showInputDialog} onOpenChange={(open) => {
        if (!open) {
          handleInputDialogCancel()
        }
      }}>
        <DialogContent className='bg-white rounded-lg p-3 lg:p-4'>
          <DialogHeader>
            <DialogTitle>{inputDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={inputDialogValue}
              onChange={(e) => setInputDialogValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInputDialogConfirm()
                } else if (e.key === 'Escape') {
                  handleInputDialogCancel()
                }
              }}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C82E31] focus:border-transparent"
              autoFocus
              placeholder={inputDialogTitle}
            />
          </div>
          <DialogFooter>
            <button
              onClick={handleInputDialogCancel}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleInputDialogConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-[#C82E31] rounded-md hover:bg-[#a61b1f] transition-colors"
            >
              确定
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
