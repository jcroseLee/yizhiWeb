'use client'

import { Button } from '@/lib/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'
import { Input } from '@/lib/components/ui/input'
import { Textarea } from '@/lib/components/ui/textarea'
import { useToast } from '@/lib/hooks/use-toast'
import { BookOpen, Edit, Save, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RelatedCases } from './RelatedCases'
import { TableOfContents } from './TableOfContents'

interface WikiArticleContainerProps {
  article: any
  relatedBooks: any[]
}

export function WikiArticleContainer({ article, relatedBooks }: WikiArticleContainerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Form States
  const [title, setTitle] = useState(article.title)
  const [content, setContent] = useState(article.content || '')
  const [summary, setSummary] = useState(article.summary || '')
  const [authorName, setAuthorName] = useState('')
  const [changeDescription, setChangeDescription] = useState('')

  // Dialog States
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showRevisionWarning, setShowRevisionWarning] = useState(false)

  const { toast } = useToast()

  // Reset form when entering edit mode
  const handleStartEdit = () => {
    setTitle(article.title)
    setContent(article.content || '')
    setSummary(article.summary || '')
    setAuthorName('')
    setChangeDescription('')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setShowCancelConfirm(true)
  }

  const handleConfirmCancel = () => {
    setIsEditing(false)
    setShowCancelConfirm(false)
  }

  const handleSubmit = async (ignoreWarning = false) => {
    if (!title.trim() || !content.trim()) {
        toast({
            title: '请填写完整',
            description: '标题和正文不能为空',
            variant: 'destructive'
        })
        return
    }

    // Check for revision marker if content has changed and warning is not ignored
    if (!ignoreWarning && content !== (article.content || '') && !content.includes('{{REV}}')) {
        setShowRevisionWarning(true)
        return
    }

    await performSubmit()
  }

  const performSubmit = async () => {
    setShowRevisionWarning(false)
    setLoading(true)
    try {
      const res = await fetch('/api/wiki/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          title,
          content,
          summary,
          authorName: authorName || '匿名用户',
          changeDescription: changeDescription || '内容更新'
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('Submission error:', errorData)
        throw new Error(errorData.error || '提交失败')
      }

      toast({
        title: '提交成功',
        description: '您的修改建议已提交，等待管理员审核。',
      })
      setIsEditing(false)
    } catch (error: any) {
      console.error('Submission error details:', error)
      toast({
        title: '提交失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSubmitWithoutRevision = () => {
    performSubmit()
  }

  // Markdown Components Configuration
  const slugify = (text: string) => text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '')
  
  const MarkdownComponents = {
      h1: ({node, ...props}: any) => <h1 id={slugify(String(props.children))} className="font-serif text-3xl font-bold text-[#1a252f] mb-8 mt-10 scroll-mt-24 tracking-wide" {...props} />,
      h2: ({node, ...props}: any) => <h2 id={slugify(String(props.children))} className="font-serif text-2xl font-bold text-[#2c3e50] mb-6 mt-10 scroll-mt-24 border-b border-stone-200 pb-2 tracking-wide" {...props} />,
      h3: ({node, ...props}: any) => <h3 id={slugify(String(props.children))} className="font-serif text-xl font-bold text-[#34495e] mb-4 mt-8 scroll-mt-24" {...props} />,
      h4: ({node, ...props}: any) => <h4 id={slugify(String(props.children))} className="font-serif text-lg font-bold text-[#34495e] mb-3 mt-6 scroll-mt-24" {...props} />,
      p: ({node, ...props}: any) => <p className="leading-8 text-[#2c3e50] mb-6 text-justify" {...props} />,
      blockquote: ({node, ...props}: any) => (
        <blockquote className="border-l-4 border-[#8c7b75] bg-[#f5f1e8]/50 px-6 py-4 my-8 rounded-r italic text-stone-600 font-serif" {...props} />
      ),
      code: ({node, inline, className, children, ...props}: any) => {
         const match = /language-(\w+)/.exec(className || '')
         return !inline ? (
           <pre className="bg-[#2c3e50] text-stone-100 p-4 rounded-lg overflow-x-auto my-6 font-mono text-sm shadow-inner" {...props}>
             <code className={className} {...props}>
               {children}
             </code>
           </pre>
         ) : (
           <code className="bg-[#f5f1e8] text-[#c0392b] px-1.5 py-0.5 rounded font-mono text-sm border border-stone-200" {...props}>
             {children}
           </code>
         )
      },
      ul: ({node, ...props}: any) => <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-[#2c3e50]" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-[#2c3e50]" {...props} />,
      li: ({node, ...props}: any) => <li className="leading-7" {...props} />,
      a: ({node, ...props}: any) => {
          const isContributor = props.href?.startsWith('#contributor-');
          if (isContributor) {
              return <sup className="text-[#c0392b] font-bold ml-0.5 select-none"><a {...props} className="hover:underline cursor-pointer no-underline" /></sup>
          }
          return <a className="text-[#c0392b] hover:text-[#a93226] underline underline-offset-4 decoration-stone-300 transition-colors" {...props} />
      },
      img: ({node, ...props}: any) => <img className="rounded-lg shadow-md my-8 mx-auto border border-stone-100" {...props} />,
      hr: ({node, ...props}: any) => <hr className="my-10 border-stone-200" {...props} />,
      table: ({node, ...props}: any) => <div className="overflow-x-auto my-8 rounded-lg border border-stone-200"><table className="w-full text-sm text-left text-stone-600" {...props} /></div>,
      thead: ({node, ...props}: any) => <thead className="text-xs text-stone-700 uppercase bg-[#f5f1e8]" {...props} />,
      th: ({node, ...props}: any) => <th className="px-6 py-3 font-serif font-bold" {...props} />,
      tbody: ({node, ...props}: any) => <tbody {...props} />,
      tr: ({node, ...props}: any) => <tr className="bg-white border-b border-stone-100 hover:bg-stone-50" {...props} />,
      td: ({node, ...props}: any) => <td className="px-6 py-4" {...props} />,
  }

  return (
    <div className="flex max-w-7xl mx-auto relative min-h-screen">
        <div className="flex-1 px-8 py-10 lg:px-12 lg:py-12 max-w-4xl min-w-0 mb-20">
            {isEditing ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-500">词条标题</label>
                        <Input 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="font-serif text-2xl font-bold p-4 h-auto"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-500">摘要</label>
                        <Textarea 
                            value={summary} 
                            onChange={e => setSummary(e.target.value)} 
                            className="font-serif min-h-[6.25rem] text-lg leading-relaxed bg-[#f5f1e8]/30"
                            placeholder="输入词条摘要..."
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <label className="text-sm font-medium text-stone-500">正文内容 (Markdown)</label>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={() => {
                                    const textarea = document.getElementById('wiki-content-editor') as HTMLTextAreaElement;
                                    if (textarea) {
                                        const start = textarea.selectionStart;
                                        const end = textarea.selectionEnd;
                                        const text = textarea.value;
                                        const before = text.substring(0, start);
                                        const after = text.substring(end, text.length);
                                        const newText = before + '{{REV}}' + after;
                                        setContent(newText);
                                        // Need to defer focus slightly for React state update
                                        setTimeout(() => {
                                            textarea.focus();
                                            textarea.setSelectionRange(start + 7, start + 7);
                                        }, 0);
                                    }
                                }}
                            >
                                <Edit className="w-3 h-3 mr-1" /> 插入修订标记
                            </Button>
                        </div>
                        <Textarea 
                            id="wiki-content-editor"
                            value={content} 
                            onChange={e => setContent(e.target.value)} 
                            className="font-mono min-h-[37.5rem] leading-relaxed p-4"
                            placeholder="# 正文标题..."
                        />
                        <p className="text-xs text-stone-400">在修改处点击上方按钮插入标记，审核通过后将自动转换为序号 [N]。</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-500">您的昵称</label>
                            <Input 
                                value={authorName} 
                                onChange={e => setAuthorName(e.target.value)} 
                                placeholder="留名（可选）"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-500">修改说明</label>
                            <Input 
                                value={changeDescription} 
                                onChange={e => setChangeDescription(e.target.value)} 
                                placeholder="简述修改内容（可选）"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <article className="max-w-none font-serif">
                    <h1 className="font-serif text-4xl font-bold text-[#1a252f] mb-8 text-center tracking-wider">{article.title}</h1>
                    {article.summary && (
                        <div className="bg-[#f5f1e8]/50 p-6 rounded text-stone-600 font-serif text-lg leading-relaxed mb-12 border-y border-stone-200 relative mx-4">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#fdfbf7] px-3 text-stone-400 text-sm font-serif">摘要</div>
                            {article.summary}
                        </div>
                    )}
                    <ReactMarkdown components={MarkdownComponents} remarkPlugins={[remarkGfm]}>
                        {article.content || ''}
                    </ReactMarkdown>
                    {article.contributors && article.contributors.length > 0 && (
                        <div className="mt-12 pt-6 border-t border-stone-200/60">
                            <div className="text-sm text-stone-500 font-serif flex flex-col gap-3">
                                <span className="font-bold text-stone-700">贡献者与修订历史：</span>
                                {article.contributors.map((c: any, i: number) => (
                                    <div key={i} id={`contributor-${i + 1}`} className="flex items-start gap-3 bg-stone-50/50 p-2 rounded hover:bg-stone-100/50 transition-colors">
                                        <span className="font-mono text-[#c0392b] font-bold select-none min-w-[1.5rem]">[{i + 1}]</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {c.id ? (
                                                    <Link href={`/u/${c.id}`} className="font-bold text-stone-800 hover:text-[#c0392b] hover:underline transition-colors">
                                                        {c.name}
                                                    </Link>
                                                ) : (
                                                    <span className="font-bold text-stone-800">{c.name}</span>
                                                )}
                                                <span className="text-stone-400 text-xs">{new Date(c.date).toLocaleDateString()}</span>
                                            </div>
                                            {c.change_description && c.change_description !== '内容更新' && (
                                                <div className="text-stone-600 leading-relaxed">
                                                    {c.change_description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </article>
            )}

            {/* Related Books - Only show in View Mode */}
            {!isEditing && relatedBooks.length > 0 && (
                <div className="mt-16 pt-8 border-t border-stone-200">
                    <h3 className="text-lg font-serif font-bold mb-6 flex items-center text-[#1a252f]">
                        <BookOpen className="w-5 h-5 mr-2" /> 关联古籍
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {relatedBooks.map((book: any) => (
                            <div key={book.id} className="p-4 border border-stone-200 rounded-lg hover:border-stone-400 transition-colors cursor-pointer bg-white/50 hover:bg-white/80">
                                <div className="font-bold text-[#2c3e50] font-serif">{book.title}</div>
                                <div className="text-sm text-stone-500 mt-2 font-serif">{book.author} · {book.dynasty}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Right Sidebar */}
        <div className="hidden xl:block w-80 p-8 border-l border-stone-200/60 bg-transparent">
            <div className="sticky top-20 space-y-8">
                {!isEditing && (
                    <Button 
                        variant="outline" 
                        className="w-full text-stone-500 border-stone-200 hover:bg-stone-100 hover:text-stone-700 justify-start"
                        onClick={handleStartEdit}
                    >
                        <Edit className="w-4 h-4 mr-2" /> 完善此词条
                    </Button>
                )}
                
                {/* Always show TOC and Related Cases, though TOC might not track edits in real-time */}
                <TableOfContents content={isEditing ? content : (article.content || '')} />
                <RelatedCases articleId={article.id} />
            </div>
        </div>

        {/* Sticky Footer for Edit Mode */}
        {isEditing && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-stone-200 p-4 shadow-lg z-50 animate-in slide-in-from-bottom-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
                    <span className="text-sm text-stone-500 font-serif">
                        正在编辑: {article.title}
                    </span>
                    <div className="flex gap-4">
                        <Button variant="ghost" onClick={handleCancel} disabled={loading}>
                            <X className="w-4 h-4 mr-2" /> 取消
                        </Button>
                        <Button onClick={() => handleSubmit()} disabled={loading} className="min-w-[7.5rem]">
                            {loading ? '提交中...' : (
                                <>
                                    <Save className="w-4 h-4 mr-2" /> 提交修改
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>确定要取消编辑吗？</DialogTitle>
              <DialogDescription>未保存的内容将丢失。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                取消
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmCancel}
                className="bg-[#C82E31] text-white hover:bg-[#B02629]"
              >
                确定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revision Warning Dialog */}
        <Dialog open={showRevisionWarning} onOpenChange={setShowRevisionWarning}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>检测到您修改了正文，但未插入"修订标记"</DialogTitle>
              <DialogDescription className="whitespace-pre-line">
                建议在修改处点击"插入修订标记"按钮，以便在正文中显示引用序号。

                点击"确定"继续提交（不标记），点击"取消"返回编辑。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRevisionWarning(false)}>
                取消
              </Button>
              <Button 
                onClick={handleConfirmSubmitWithoutRevision}
                className="bg-[#C82E31] text-white hover:bg-[#B02629]"
                disabled={loading}
              >
                确定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
