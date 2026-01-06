import { createClient } from '@/lib/supabase/client'

export type WikiCategory = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  type: 'foundation' | 'school' | 'scenario' | 'other'
  children?: WikiCategory[]
  articles?: WikiArticle[]
  sort_order: number
}

export type WikiArticle = {
  id: string
  title: string
  slug: string
  summary?: string
  content?: string
  compiled_html?: string
  category_id?: string
  related_book_ids?: string[]
  view_count?: number
  status: 'published' | 'draft' | 'archived'
  updated_at?: string
  sort_order?: number
  last_revision_id?: string
  contributors?: { name: string; id?: string; date: string }[]
}

export type WikiTag = {
  id: string
  name: string
  slug?: string // global tags might not have slug in all versions, but we should handle it
  category?: string
}

const supabase = createClient()

export const WikiService = {
  async getCategories() {
    if (!supabase) return []
    
    // Fetch categories
    const { data: categories, error: catError } = await supabase
      .from('wiki_categories')
      .select('*')
      .order('sort_order')
    
    if (catError) {
      console.error('Error fetching wiki categories:', catError)
      return []
    }

    // Fetch all published articles to populate the tree
    const { data: articles, error: artError } = await supabase
      .from('wiki_articles')
      .select('id, title, slug, category_id, sort_order, status')
      .eq('status', 'published')
      .order('sort_order')

    if (artError) {
        console.error('Error fetching wiki articles for tree:', artError)
        // We can still return categories even if articles fail
    }

    return buildTree(categories, articles || [])
  },

  async getArticle(slug: string) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('wiki_articles')
      .select('*, wiki_categories(name, slug)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
    
    if (error) return null
    
    // Fetch related books if any
    let relatedBooks = []
    if (data.related_book_ids && data.related_book_ids.length > 0) {
       const { data: books } = await supabase
         .from('library_books')
         .select('*')
         .in('id', data.related_book_ids)
       relatedBooks = books || []
    }

    return { ...data, related_books: relatedBooks }
  },

  async getArticlesByCategory(categoryId: string) {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('wiki_articles')
      .select('id, title, slug, summary, view_count, sort_order')
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .order('sort_order')
    
    if (error) return []
    return data
  },

  async getTags() {
    if (!supabase) return []
    // Use wiki_tags
    const { data, error } = await supabase
      .from('wiki_tags') 
      .select('*')
      // .order('usage_count', { ascending: false }) // wiki_tags doesn't have usage_count in schema yet
      .limit(50)
    
    if (error) return []
    return data
  },

  async getArticlesByTag(tagId: string) {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('wiki_article_tags')
      .select('article_id, wiki_articles(id, title, slug, summary, category_id, wiki_categories(name))')
      .eq('tag_id', tagId)
    
    if (error) return []
    // Flatten result and filter published
    return data
      .map((item: any) => item.wiki_articles)
      .filter((article: any) => article && (article.status === 'published' || article.is_published === true)) // handle backward compat if needed, though we migrated
      .map((article: any) => ({
        ...article,
        category_name: article.wiki_categories?.name
      }))
  },

  async getCategoryBySlug(slug: string) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('wiki_categories')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (error) return null
    return data
  },

  async getTagBySlug(slug: string) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (error) return null
    return data
  },

  // Get related cases (posts) for an article based on its tags
  async getRelatedCases(articleId: string, limit = 5) {
      if (!supabase) return []
      
      // 1. Get tags for the article
      const { data: tagData } = await supabase
          .from('wiki_article_tags')
          .select('tag_id')
          .eq('article_id', articleId)
      
      const tagIds = tagData?.map(t => t.tag_id) || []
      if (tagIds.length === 0) return []

      // 2. Find posts with these tags (via post_tags)
      // We want high quality posts (likes > 10, or sorted by likes)
      // Since supabase query on M2M is tricky, we can use rpc or just client side filtering if dataset small, 
      // but for "high quality" we should filter.
      // Let's try to get post_ids first.
      const { data: postTags } = await supabase
          .from('post_tags')
          .select('post_id')
          .in('tag_id', tagIds)
      
      const postIds = [...new Set(postTags?.map(p => p.post_id) || [])]
      if (postIds.length === 0) return []

      const { data: posts, error } = await supabase
          .from('posts')
          .select('id, title, content, likes, user_id, created_at, profiles(nickname, avatar_url)')
          .in('id', postIds)
          .order('likes', { ascending: false })
          .limit(limit)

      if (error) {
          console.error('Error fetching related cases:', error)
          return []
      }
      return posts
  },
  
  async submitContribution(articleId: string, content: string, reason: string) {
      if (!supabase) throw new Error('Supabase client not initialized')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { error } = await supabase
          .from('wiki_versions')
          .insert({
              article_id: articleId,
              editor_id: user.id,
              content_snapshot: content,
              change_reason: reason
          })
      
      if (error) throw error
      return true
  }
}

function buildTree(categories: any[], articles: any[] = []) {
  const map = new Map()
  const roots: any[] = []

  // Initialize map with empty children and articles arrays
  categories.forEach(cat => {
    map.set(cat.id, { ...cat, children: [], articles: [] })
  })

  // Add articles to their categories
  articles.forEach(article => {
      if (article.category_id && map.has(article.category_id)) {
          map.get(article.category_id).articles.push(article)
      }
  })

  // Build hierarchy
  categories.forEach(cat => {
    const node = map.get(cat.id)
    if (cat.parent_id) {
      const parent = map.get(cat.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        // If parent not found (shouldn't happen with referential integrity), treat as root or orphan
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  })
  
  // Sort children and articles by sort_order
  const sortFn = (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
  
  map.forEach(node => {
    if (node.children && node.children.length > 0) {
      node.children.sort(sortFn)
    }
    if (node.articles && node.articles.length > 0) {
        node.articles.sort(sortFn)
    }
  })
  
  return roots.sort(sortFn)
}
