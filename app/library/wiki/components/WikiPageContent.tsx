import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { Button } from '@/lib/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { Share2 } from 'lucide-react'
import Link from 'next/link'
import { WikiArticleContainer } from './WikiArticleContainer'
import { WikiArticleList } from './WikiArticleList'
import { WikiSidebar } from './WikiSidebar'

// Shared Server Component for Wiki Page Logic
export async function WikiPageContent({ slug }: { slug: string }) {
  // Use admin client to bypass RLS for public wiki content
  let supabase
  try {
    supabase = createSupabaseAdmin()
  } catch (error) {
    console.warn('Failed to create admin client, falling back to anon client:', error)
    supabase = await createClient()
  }
  
  // Fetch Categories for Sidebar (needed for all views)
  const { data: categories } = await supabase
      .from('wiki_categories')
      .select('*')
      .order('sort_order')
  
  // Fetch Articles for Sidebar
  const { data: allArticles } = await supabase
      .from('wiki_articles')
      .select('id, title, slug, category_id, sort_order, status')
      .eq('status', 'published')
      .order('sort_order')

  const buildTree = (cats: any[] | null, arts: any[] | null) => {
      if (!cats) return []
      const map = new Map()
      const roots: any[] = []
      
      // Initialize map
      cats.forEach(c => map.set(c.id, { ...c, children: [], articles: [] }))
      
      // Add articles
      if (arts) {
          arts.forEach(a => {
              if (a.category_id && map.has(a.category_id)) {
                  map.get(a.category_id).articles.push(a)
              }
          })
      }

      // Build hierarchy
      cats.forEach(c => {
          const node = map.get(c.id)
          if (c.parent_id) {
              const parent = map.get(c.parent_id)
              if (parent) parent.children.push(node)
              else roots.push(node)
          } else {
              roots.push(node)
          }
      })
      
      const sortFn = (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
      
      map.forEach(node => {
          if (node.children) node.children.sort(sortFn)
          if (node.articles) node.articles.sort(sortFn)
      })
      
      return roots.sort(sortFn)
  }
  const treeData = buildTree(categories, allArticles)

  // 1. Try to find Article
  const { data: article } = await supabase
    .from('wiki_articles')
    .select('*, wiki_categories(name, slug)')
    .eq('slug', slug)
    .single()

  if (article) {
      // Fetch Related Books
      let relatedBooks = []
      if (article.related_book_ids && article.related_book_ids.length > 0) {
          const { data: books } = await supabase
              .from('library_books')
              .select('*')
              .in('id', article.related_book_ids)
          relatedBooks = books || []
      }

      return (
        <div className="flex flex-col h-screen paper-texture">
           <header className="flex-none h-14 border-b border-stone-200/60 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <Link href="/library/wiki" className="font-serif font-bold text-lg text-[#1a252f]">藏经阁</Link>
                 <span className="text-stone-300">/</span>
                 <span className="text-sm text-stone-500">{article.wiki_categories?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-stone-600 hover:text-[#1a252f] hover:bg-stone-100">
                      <Share2 className="w-4 h-4 mr-2" /> 分享
                  </Button>
              </div>
           </header>
           <div className="flex-1 flex overflow-hidden">
              <WikiSidebar className="hidden lg:flex border-r border-stone-200/60 !bg-transparent" initialCategories={treeData} />
              <main className="flex-1 overflow-y-auto scroll-smooth">
                 <WikiArticleContainer article={article} relatedBooks={relatedBooks} />
              </main>
           </div>
        </div>
      )
  }

  // 2. Try to find Category
  const { data: category } = await supabase
    .from('wiki_categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (category) {
      // Helper to get all descendant category IDs
      const getDescendantIds = (parentId: string, allCats: any[]) => {
          let ids = [parentId]
          const children = allCats.filter(c => c.parent_id === parentId)
          for (const child of children) {
              ids = [...ids, ...getDescendantIds(child.id, allCats)]
          }
          return ids
      }
      
      const targetCategoryIds = getDescendantIds(category.id, categories || [])
 
      const { data: articles } = await supabase
          .from('wiki_articles')
          .select('id, title, slug, summary, category_id, wiki_categories(name)')
          .in('category_id', targetCategoryIds)
          .eq('status', 'published')
          .order('sort_order')
      
      const formattedArticles = (articles || []).map((a: any) => ({
          ...a,
          category_name: a.wiki_categories?.name
      }))

      return (
        <div className="flex flex-col h-screen bg-[#FAFAFA]">
           <header className="flex-none h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <Link href="/library/wiki" className="font-serif font-bold text-lg text-slate-900">藏经阁</Link>
                 <span className="text-slate-300">/</span>
                 <span className="text-sm text-slate-500">{category.name}</span>
              </div>
           </header>
           <div className="flex-1 flex overflow-hidden">
              <WikiSidebar className="hidden lg:flex" initialCategories={treeData} />
              <main className="flex-1 overflow-y-auto bg-white scroll-smooth">
                 <div className="max-w-4xl mx-auto px-8 py-10 lg:px-12 lg:py-12">
                     <WikiArticleList 
                        title={category.name} 
                        description={category.description} 
                        type="category" 
                        articles={formattedArticles} 
                     />
                 </div>
              </main>
           </div>
        </div>
      )
  }

  // 3. Try to find Tag
  const { data: tag } = await supabase
    .from('wiki_tags')
    .select('*')
    .eq('slug', slug)
    .single()

  if (tag) {
     const { data: tagArticles } = await supabase
          .from('wiki_article_tags')
          .select('article_id, wiki_articles(id, title, slug, summary, category_id, wiki_categories(name), status)')
          .eq('tag_id', tag.id)

     const articles = (tagArticles || [])
        .map((item: any) => item.wiki_articles)
        .filter((a: any) => a && (a.status === 'published'))
        .map((a: any) => ({
            ...a,
            category_name: a.wiki_categories?.name
        }))

      return (
        <div className="flex flex-col h-screen bg-[#FAFAFA]">
           <header className="flex-none h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <Link href="/library/wiki" className="font-serif font-bold text-lg text-slate-900">藏经阁</Link>
                 <span className="text-slate-300">/</span>
                 <span className="text-sm text-slate-500">标签: {tag.name}</span>
              </div>
           </header>
           <div className="flex-1 flex overflow-hidden">
              <WikiSidebar className="hidden lg:flex" initialCategories={treeData} />
              <main className="flex-1 overflow-y-auto bg-white scroll-smooth">
                 <div className="max-w-4xl mx-auto px-8 py-10 lg:px-12 lg:py-12">
                     <WikiArticleList 
                        title={tag.name} 
                        type="tag" 
                        articles={articles} 
                     />
                 </div>
              </main>
           </div>
        </div>
      )
  }

  // 4. Not Found
  return (
    <div className="flex items-center justify-center h-screen bg-[#FAFAFA]">
        <div className="text-center">
            <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">未找到页面</h1>
            <p className="text-slate-500 mb-4">该词条、分类或标签可能已被移除或尚未创建。</p>
            <Link href="/library/wiki">
                <Button>返回藏经阁</Button>
            </Link>
        </div>
    </div>
  )
}
