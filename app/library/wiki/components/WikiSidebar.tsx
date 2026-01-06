'use client'

import { Badge } from '@/lib/components/ui/badge'
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import { WikiCategory, WikiService, WikiTag } from '@/lib/services/wiki'
import { ChevronDown, FileText, Folder } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const findPath = (nodes: WikiCategory[], targetSlug: string, currentPath: string[], results: Set<string>): boolean => {
  for (const node of nodes) {
    // Match Category
    if (node.slug === targetSlug) {
       currentPath.forEach(id => results.add(id))
       results.add(node.id) 
       return true
    }
    
    // Match Article
    if (node.articles) {
        const foundArticle = node.articles.find(a => a.slug === targetSlug)
        if (foundArticle) {
            currentPath.forEach(id => results.add(id))
            results.add(node.id)
            return true
        }
    }

    // Recurse
    if (node.children && node.children.length > 0) {
       if (findPath(node.children, targetSlug, [...currentPath, node.id], results)) {
          return true
       }
    }
  }
  return false
}

export function WikiSidebar({ 
    className, 
    initialCategories = [], 
    initialTags = [] 
}: { 
    className?: string
    initialCategories?: WikiCategory[]
    initialTags?: WikiTag[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [fetchedCategories, setFetchedCategories] = useState<WikiCategory[]>([])
  const [fetchedTags, setFetchedTags] = useState<WikiTag[]>([])
  
  // Use props if provided, otherwise fallback to fetched data
  const treeData = initialCategories.length > 0 ? initialCategories : fetchedCategories
  const tags = initialTags.length > 0 ? initialTags : fetchedTags

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const allIds = new Set<string>()
    if (initialCategories.length > 0) {
        initialCategories.forEach(c => allIds.add(c.id))
    }
    return allIds
  })

  // Initial Fetch if not provided
  useEffect(() => {
    if (initialCategories.length === 0) {
        const init = async () => {
        const [cats, tgs] = await Promise.all([
            WikiService.getCategories(),
            WikiService.getTags()
        ])
        setFetchedCategories(cats)
        setFetchedTags(tgs)
        
        // Expand all top-level nodes by default
        const allIds = new Set<string>()
        cats.forEach(c => allIds.add(c.id))
        setExpandedNodes(allIds)
        }
        init()
    }
  }, [initialCategories.length])

  // Auto-expand based on current path
  useEffect(() => {
    if (!pathname || treeData.length === 0) return
    
    const slug = pathname.split('/').pop()
    if (!slug) return

    const idsToExpand = new Set<string>()
    findPath(treeData, slug, [], idsToExpand)
    
    if (idsToExpand.size > 0) {
       // Use setTimeout to avoid synchronous state update warning and potential cascading renders
       const timer = setTimeout(() => {
         setExpandedNodes(prev => {
            let missing = false
            for (const id of idsToExpand) {
               if (!prev.has(id)) {
                   missing = true
                   break
               }
            }
            if (!missing) return prev
            
            const next = new Set(prev)
            idsToExpand.forEach(id => next.add(id))
            return next
         })
       }, 0)
       return () => clearTimeout(timer)
    }
  }, [pathname, treeData])

  const toggleNode = (id: string) => {
    const newSet = new Set(expandedNodes)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedNodes(newSet)
  }

  const renderTree = (nodes: WikiCategory[], level = 0) => {
    return nodes.map(node => {
      const hasChildren = (node.children && node.children.length > 0) || (node.articles && node.articles.length > 0)
      const currentSlug = pathname ? pathname.split('/').pop() : ''
      const isActive = node.slug === currentSlug

      return (
      <div key={node.id} className="mb-1">
        <div 
          className={`flex items-center w-full text-sm font-semibold mb-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${level > 0 ? 'ml-2' : ''} ${isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-900 hover:bg-slate-100'}`}
          onClick={() => router.push(`/library/wiki/${node.slug}`)}
        >
           <div
             className={`mr-1 p-0.5 rounded transition-colors ${hasChildren ? 'hover:bg-slate-300' : ''}`}
             onClick={(e) => {
               if (hasChildren) {
                 e.stopPropagation()
                 toggleNode(node.id)
               }
             }}
           >
             {hasChildren ? (
               <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedNodes.has(node.id) ? '' : '-rotate-90'}`} />
             ) : (
               <Folder className="w-4 h-4 text-slate-400" />
             )}
           </div>
           <span>{node.name}</span>
        </div>
        
        {expandedNodes.has(node.id) && (
          <div className="space-y-0.5 ml-2 border-l border-slate-200 pl-2">
             {/* Subcategories */}
             {node.children && node.children.length > 0 && renderTree(node.children, level + 1)}
             
             {/* Articles */}
             {node.articles && node.articles.map(article => {
                const isArticleActive = article.slug === currentSlug
                return (
                <div key={article.id} className="mb-1 ml-2">
                    <button
                        className={`flex items-center w-full text-sm px-2 py-1 rounded-md transition-colors ${isArticleActive ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                        onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/library/wiki/${article.slug}`)
                        }}
                    >
                        <FileText className={`w-3 h-3 mr-2 flex-shrink-0 ${isArticleActive ? 'text-slate-600' : 'text-slate-400'}`} />
                        <span className="truncate text-left">{article.title}</span>
                    </button>
                </div>
             )})}
          </div>
        )}
      </div>
    )})
  }

  // Group Categories
  const foundationCats = treeData.filter(c => c.type === 'foundation')
  const schoolCats = treeData.filter(c => c.type === 'school')
  const otherCats = treeData.filter(c => c.type !== 'foundation' && c.type !== 'school')

  return (
    <aside className={`w-64 bg-[#FAFAFA] border-r border-slate-200 flex flex-col ${className}`}>
        <ScrollArea className="flex-1 py-6 px-4">
            <div className="space-y-6">
                
                {/* Layer 1: Foundation */}
                {foundationCats.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">易学通识 (公共底层)</h3>
                    {renderTree(foundationCats)}
                </div>
                )}

                {/* Layer 2: Schools */}
                {schoolCats.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">分门别类 (独立流派)</h3>
                    {renderTree(schoolCats)}
                </div>
                )}

                {/* Layer 3: Scenarios (Tags) */}
                {tags.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">分类占验 (实战案例)</h3>
                    <div className="flex flex-wrap gap-2 px-2">
                        {tags.map(tag => (
                        <Badge 
                            key={tag.id} 
                            variant="outline"
                            className="cursor-pointer hover:bg-slate-100"
                            onClick={() => router.push(`/library/wiki/${tag.slug || tag.id}`)}
                        >
                            {tag.name}
                        </Badge>
                        ))}
                    </div>
                </div>
                )}
                
                {otherCats.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">其他</h3>
                    {renderTree(otherCats)}
                </div>
                )}

            </div>
        </ScrollArea>
    </aside>
  )
}
