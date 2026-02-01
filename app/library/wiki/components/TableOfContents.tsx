'use client'

import { useEffect, useMemo, useState } from 'react'

interface TOCItem {
  id: string
  text: string
  level: number
}

export function TableOfContents({ content }: { content: string }) {
  const [activeId, setActiveId] = useState<string>('')

  const headings = useMemo(() => {
    // Parse headings from markdown content
    // This is a simple parser, might need adjustment based on real markdown usage
    const lines = content.split('\n')
    const extracted: TOCItem[] = []
    
    // Slugify function matching the server-side one
    const slugify = (text: string) => text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '')

    lines.forEach(line => {
      const match = line.match(/^(#{1,3})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const text = match[2].trim()
        const id = slugify(text)
        extracted.push({ id, text, level })
      }
    })
    
    return extracted
  }, [content])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '0px 0px -80% 0px' }
    )

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="font-bold text-sm text-slate-900 mb-4">目录</h4>
      <div className="relative border-l border-slate-200 pl-4">
          {headings.map(heading => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={`block text-sm mb-2 transition-colors ${
                activeId === heading.id 
                  ? 'text-blue-600 font-medium' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' })
                setActiveId(heading.id)
              }}
            >
              {heading.text}
            </a>
          ))}
      </div>
    </div>
  )
}
