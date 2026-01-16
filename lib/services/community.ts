import { trackEvent } from '@/lib/analytics'
import { logError } from '../utils/errorLogger'
import { getCurrentUser } from './auth'
import { getSupabaseClient } from './supabaseClient'

// -----------------------------------------------------------------------------
// 图片上传工具函数
// -----------------------------------------------------------------------------

/**
 * 上传文章封面图片
 */
export async function uploadPostCover(file: File): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支持的文件类型，请上传 JPEG、PNG、WebP 或 GIF 格式的图片')
    }

    // 验证文件大小（10MB，封面图可以稍大一些）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过 10MB')
    }

    // 生成文件名：userId/covers/timestamp.extension
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}/covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // 上传文件到 posts bucket（如果不存在则使用 avatars）
    const { error } = await supabase.storage
      .from('posts')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      // 如果 posts bucket 不存在或没有权限，尝试使用 avatars bucket
      const { error: fallbackError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (fallbackError) {
        console.error('Error uploading cover image:', fallbackError)
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
  } catch (error) {
    console.error('Error uploading cover image:', error)
    throw error
  }
}

// -----------------------------------------------------------------------------
// 类型定义
// -----------------------------------------------------------------------------

export interface DivinationRecord {
  id: string
  original_key: string
  changed_key: string
  lines: string[]
  changing_flags: number[]
  divination_time: string
  question?: string
  method: number
}

export type DivinationMethodType = 'liuyao' | 'bazi' | 'qimen' | 'meihua' | 'ziwei' | 'general'
export type TagCategory = 'subject' | 'technique' | 'custom'

export interface Tag {
  id: string
  name: string
  category: TagCategory
  scope: DivinationMethodType | null
  usage_count: number
  created_at?: string
  updated_at?: string
}

export interface Post {
  id: string
  user_id: string
  title: string
  content: string
  content_html?: string
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
  status?: 'published' | 'draft' | 'archived' | 'pending' | 'hidden' | 'rejected'  // 帖子状态
  section?: 'study' | 'help' | 'casual' | 'announcement' | null
  subsection?: string | null
  method?: DivinationMethodType | null
  tags?: string[]
  // 关联的用户信息
  author?: {
    id: string
    nickname: string | null
    avatar_url: string | null
    title_level?: number
  } | null
  // 是否已点赞
  is_liked?: boolean
  // 是否已收藏
  is_favorited?: boolean
  // 帖子类型（从content或tags推断，或添加type字段）
  type?: 'theory' | 'help' | 'debate' | 'chat'
  // 悬赏金额（如果有）
  bounty?: number
  // 关联的排盘记录ID
  divination_record_id?: string | null
  // 关联的排盘记录数据（用于显示卦象）
  divination_record?: DivinationRecord | null
  // 文章封面图URL
  cover_image_url?: string | null
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  like_count: number
  created_at: string
  updated_at: string
  // 是否被采纳
  is_adopted?: boolean
  adopted_at?: string | null
  adopted_by?: string | null
  // 关联的用户信息
  author?: {
    id: string
    nickname: string | null
    avatar_url: string | null
    title_level?: number
  } | null
  // 是否已点赞
  is_liked?: boolean
  // 子评论（保留用于向后兼容，但平铺模式下不使用）
  replies?: Comment[]
  // 被回复的评论信息（用于微博模式）
  reply_to?: {
    id: string
    author?: {
      id: string
      nickname: string | null
      avatar_url: string | null
    } | null
  }
}

export interface CreatePostInput {
  title: string
  content: string
  content_html?: string
  type?: 'theory' | 'help' | 'debate' | 'chat'
  bounty?: number
  divination_record_id?: string | null
  cover_image_url?: string | null
  method?: DivinationMethodType | null
}

export interface CreateCommentInput {
  post_id: string
  content: string
  parent_id?: string | null
}

export interface PostRow {
  id: string
  user_id: string
  title: string
  content: string
  content_html?: string
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
  status?: 'published' | 'draft' | 'archived' | 'pending' | 'hidden' | 'rejected'
  method?: DivinationMethodType | null
  tags?: string[]
  bounty?: number
  divination_record_id?: string | null
  divination_records?: DivinationRecord | DivinationRecord[] | null
  cover_image_url?: string | null
  type?: 'theory' | 'help' | 'debate' | 'chat'
}

export interface ProfileRow {
  id: string
  nickname: string | null
  avatar_url: string | null
}

export interface CommentRow {
  id: string
  user_id: string
  post_id: string
  parent_id: string | null
  content: string
  like_count: number
  created_at: string
  updated_at: string
  is_adopted?: boolean
  adopted_at?: string | null
  adopted_by?: string | null
  posts?: {
    id: string
    title: string
    type: string
  }
}

// -----------------------------------------------------------------------------
// 帖子相关函数
// -----------------------------------------------------------------------------

/**
 * 获取帖子列表
 */
export async function getPosts(options?: {
  limit?: number
  offset?: number
  type?: 'theory' | 'help' | 'debate' | 'chat'
  orderBy?: 'created_at' | 'like_count' | 'comment_count' | 'view_count'
  orderDirection?: 'asc' | 'desc'
  followed?: boolean
}): Promise<Post[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const {
    limit = 20,
    offset = 0,
    type,
    orderBy = 'created_at',
    orderDirection = 'desc',
    followed = false,
  } = options || {}

  // 如果是关注列表，先获取关注的用户ID
  let followedUserIds: string[] = []
  if (followed) {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return []
    }
    
    const { data: follows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)
      
    if (!follows || follows.length === 0) {
      return []
    }
    
    followedUserIds = follows.map(f => f.following_id)
  }

  // 查询帖子，同时获取关联的排盘记录
  // 只查询已发布的帖子（status = 'published'），排除草稿
  let query = supabase
    .from('posts')
    .select(`
      *,
      divination_records (
        id,
        original_key,
        changed_key,
        lines,
        changing_flags,
        method,
        original_json
      )
    `)
    .in('status', ['published', 'hidden', 'archived'])  // 显示发布、隐藏和已结案的帖子
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(offset, offset + limit - 1)

  // 如果指定了类型，添加过滤
  if (type) {
    query = query.eq('type', type)
  }

  // 如果是关注列表，过滤用户ID
  if (followed) {
    query = query.in('user_id', followedUserIds)
  }

  const { data, error } = await query

  if (error) {
    logError('Error fetching posts:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // 获取所有唯一的 user_id
  const userIds = [...new Set(data.map((post) => post.user_id).filter(Boolean))]

  // 批量查询用户信息
  const profilesMap = new Map<string, { id: string; nickname: string | null; avatar_url: string | null }>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', userIds)

    if (profiles) {
      profiles.forEach((profile) => {
        profilesMap.set(profile.id, profile)
      })
    }
  }

  // 获取当前用户ID，用于检查是否已点赞
  const currentUser = await getCurrentUser()
  const userId = currentUser?.id

  // 获取用户点赞的帖子ID列表
  let likedPostIds: string[] = []
  // 获取用户收藏的帖子ID列表
  let favoritedPostIds: string[] = []
  if (userId) {
    const [likesResult, favoritesResult] = await Promise.all([
      supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', data.map((p) => p.id)),
      supabase
        .from('post_favorites')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', data.map((p) => p.id))
    ])

    likedPostIds = likesResult.data?.map(l => l.post_id) || []
    favoritedPostIds = favoritesResult.data?.map(f => f.post_id) || []
  }

  // 格式化数据并合并用户信息
  // 注意：divination_records 可能是数组，需要处理
  return data.map((post) => {
    // 处理 divination_records：如果是数组且只有一个元素，取第一个；如果是对象，直接使用
    let divinationRecord: DivinationRecord | null = null
    if (post.divination_records) {
      if (Array.isArray(post.divination_records)) {
        divinationRecord = post.divination_records.length > 0 ? (post.divination_records[0] as DivinationRecord) : null
      } else {
        divinationRecord = post.divination_records as DivinationRecord
      }
    }

    return {
      ...post,
      author: profilesMap.get(post.user_id) || null,
      is_liked: likedPostIds.includes(post.id),
      is_favorited: favoritedPostIds.includes(post.id),
      divination_record: divinationRecord,
    }
  })
}

/**
 * 获取相关文章列表（排除求测类帖子）
 */
export async function getRelatedPosts(currentPostId: string, limit = 5): Promise<Post[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // 获取不包含 help 类型的帖子，且不包含当前帖子
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .neq('type', 'help') // 排除求测类
    .neq('id', currentPostId) // 排除当前帖子
    .in('status', ['published']) // 只显示已发布
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching related posts:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // 获取用户信息
  const userIds = [...new Set(data.map((post) => post.user_id).filter(Boolean))]
  const profilesMap = new Map<string, { id: string; nickname: string | null; avatar_url: string | null }>()
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', userIds)

    if (profiles) {
      profiles.forEach((profile) => {
        profilesMap.set(profile.id, profile)
      })
    }
  }

  return data.map((post) => ({
    ...post,
    author: profilesMap.get(post.user_id) || null,
    // 相关文章列表不需要点赞/收藏状态，简化处理
    is_liked: false,
    is_favorited: false,
  }))
}

/**
 * 获取单个帖子详情
 */
export async function getPost(postId: string): Promise<Post | null> {
  if (!postId) {
    console.warn('getPost called with empty postId')
    return null
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // 增加浏览量（使用RPC原子更新，失败不影响主流程）
  try {
    const { error } = await supabase.rpc('increment_post_view_count', { 
      post_id: postId 
    })
    
    if (error) {
      console.warn('Failed to increment view count:', error)
    }
  } catch (err) {
    // 浏览量更新失败不影响获取帖子
    console.warn('Failed to call increment_post_view_count rpc:', err)
  }

  // 浏览帖子时自动增加修业值（防刷机制：每个帖子每天只能获得一次EXP）
  try {
    const currentUser = await getCurrentUser()
    if (currentUser) {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD格式
      
      // 检查今天是否已经浏览过这个帖子并获得过EXP
      const { data: existingLog } = await supabase
        .from('post_view_exp_log')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('post_id', postId)
        .eq('view_date', today)
        .maybeSingle()
      
      // 如果今天还没有浏览过这个帖子，则增加EXP并记录
      if (!existingLog) {
        // 先记录浏览日志（防止并发）
        const { error: insertError } = await supabase
          .from('post_view_exp_log')
          .insert({
            user_id: currentUser.id,
            post_id: postId,
            view_date: today,
          })
          .select()
          .maybeSingle()
        
        // 如果插入成功（没有冲突），则增加EXP
        // 如果插入失败（可能是并发导致的唯一约束冲突），则说明已经记录过，不再增加EXP
        // 23505 是唯一约束违反错误，这是正常的并发情况，不需要处理
        if (!insertError) {
          // 插入成功，增加EXP
          const { addExp } = await import('./growth')
          await addExp(5, '浏览帖子')
        } else if (insertError.code !== '23505') {
          // 如果不是唯一约束冲突，记录其他错误（但不影响主流程）
          console.warn('Failed to insert post view exp log:', insertError)
        }
        // 如果是23505错误（唯一约束冲突），说明已经有记录了，这是正常的并发情况，静默处理
      }
    }
  } catch (error) {
    // 静默处理错误，不影响获取帖子
    console.error('Failed to add exp for post view:', error)
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (error) {
    // 如果是帖子不存在（PGRST116），返回 null 而不是抛出错误
    if (error.code === 'PGRST116') {
      console.debug(`Post ${postId} not found (may have been deleted)`)
      return null
    }
    
    // 检查是否是空错误对象（通常表示帖子已删除或无权访问）
    if (!error.message && !error.code) {
      console.debug(`Post ${postId} returned empty error (may have been deleted or inaccessible)`)
      return null
    }
    
    // 提供更详细的错误信息（仅用于真正的错误）
    const errorMessage = error.message || error.code || 'Unknown error'
    const errorDetails = {
      message: errorMessage,
      code: error.code,
      details: error.details,
      hint: error.hint,
      postId,
      rawError: error
    }
    console.error('Error fetching post:', JSON.stringify(errorDetails, null, 2))
    throw new Error(`Failed to fetch post: ${errorMessage}`)
  }

  if (!data) {
    return null
  }

  // 查询用户信息
  let author = null
  if (data.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', data.user_id)
      .single()

    if (profile) {
      author = profile
    }
  }

  // 检查是否已点赞和已收藏
  const currentUser = await getCurrentUser()
  let isLiked = false
  let isFavorited = false
  if (currentUser) {
    const [likeResult, favoriteResult] = await Promise.all([
      supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .maybeSingle(),
      supabase
        .from('post_favorites')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .maybeSingle()
    ])

    isLiked = !!likeResult.data
    isFavorited = !!favoriteResult.data
  }

  // 如果帖子有关联的排盘记录，获取排盘数据
  let divinationRecord = null
  if (data.divination_record_id) {
    try {
      // 查询关联的排盘记录
      // 注意：需要 RLS 策略允许通过帖子关联查询（见迁移文件 20250126_allow_post_associated_divination_records.sql）
      const { data: record, error: recordError } = await supabase
        .from('divination_records')
        .select('*')
        .eq('id', data.divination_record_id)
        .single()
      
      if (recordError) {
        console.warn('Failed to fetch divination record for post:', {
          postId: postId,
          divination_record_id: data.divination_record_id,
          error: recordError
        })
      } else if (record) {
        divinationRecord = record
      }
    } catch (error) {
      console.error('Error fetching divination record:', error)
    }
  } else {
    // 调试信息：帖子没有关联排盘记录
    console.debug('Post has no divination_record_id:', postId)
  }

  return {
    ...data,
    author,
    is_liked: isLiked,
    is_favorited: isFavorited,
    divination_record: divinationRecord,
  }
}

/**
 * 创建帖子
 */
export async function createPost(input: CreatePostInput): Promise<Post> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: currentUser.id,
      title: input.title,
      content: input.content,
      content_html: input.content_html || input.content,
      type: input.type || 'theory',
      bounty: input.bounty || 0,
      divination_record_id: input.divination_record_id || null,
      cover_image_url: input.cover_image_url || null,
      method: input.method ?? null,
    })
    .select('*')
    .single()

  if (error) {
    logError('Error creating post:', error)
    throw error
  }

  // 查询用户信息
  let author = null
  if (data.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', data.user_id)
      .single()

    if (profile) {
      author = profile
    }
  }

  // 发布帖子成功后，自动增加修业值
  try {
    const { addExp } = await import('./growth')
    await addExp(20, '发布帖子')
  } catch (error) {
    // 静默处理错误，不影响帖子发布
    logError('Failed to add exp for post creation:', error)
  }

  return {
    ...data,
    author,
    is_liked: false,
  }
}

/**
 * 更新帖子
 */
export async function updatePost(
  postId: string,
  updates: Partial<CreatePostInput>
): Promise<Post> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const updateData: Record<string, unknown> = {}
  if ('title' in updates) updateData.title = updates.title
  if ('content' in updates) updateData.content = updates.content
  if ('content_html' in updates) {
    updateData.content_html = updates.content_html ?? updates.content
  } else if ('content' in updates && typeof updates.content !== 'undefined') {
    updateData.content_html = updates.content
  }
  if ('cover_image_url' in updates) updateData.cover_image_url = updates.cover_image_url
  if ('type' in updates) updateData.type = updates.type
  if ('bounty' in updates) updateData.bounty = updates.bounty
  if ('divination_record_id' in updates) updateData.divination_record_id = updates.divination_record_id
  if ('method' in updates) updateData.method = updates.method

  const { data, error } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)
    .eq('user_id', currentUser.id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating post:', error)
    throw error
  }

  // 查询用户信息
  let author = null
  if (data.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', data.user_id)
      .single()

    if (profile) {
      author = profile
    }
  }

  return {
    ...data,
    author,
    is_liked: false,
  }
}

/**
 * 获取用户的帖子列表
 * @param userId 用户ID，如果不提供则使用当前登录用户
 */
export async function getUserPosts(options?: {
  userId?: string
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'like_count' | 'comment_count' | 'view_count'
  orderDirection?: 'asc' | 'desc'
}): Promise<Post[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // 获取当前用户（用于判断是否是查看自己的帖子）
  const currentUser = await getCurrentUser()
  
  // 如果没有提供userId，使用当前登录用户
  let targetUserId = options?.userId
  if (!targetUserId) {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }
    targetUserId = currentUser.id
  }

  const {
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'desc',
  } = options || {}

  // 查询用户的帖子，同时获取关联的排盘记录
  // 如果查看的是当前用户的帖子，包括草稿；否则只显示已发布的
  const isOwnPosts = currentUser?.id === targetUserId
  
  let query = supabase
    .from('posts')
    .select(`
      *,
      divination_records (
        id,
        original_key,
        changed_key,
        lines,
        changing_flags,
        method,
        original_json
      )
    `)
    .eq('user_id', targetUserId)
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(offset, offset + limit - 1)
  
  // 如果不是查看自己的帖子，只显示已发布的
  // 如果是查看自己的帖子，包括已发布和草稿（不限制 status）
  if (!isOwnPosts) {
    query = query.in('status', ['published', 'archived'])
  } else {
    // 明确包含已发布、草稿、待审核、隐藏、已拒绝、已归档
    query = query.in('status', ['published', 'draft', 'pending', 'hidden', 'rejected', 'archived'])
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching user posts:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // 获取用户的profile信息
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url')
    .eq('id', targetUserId)
    .single()

  const author = profile ? {
    id: profile.id,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
  } : null

  // 获取当前登录用户点赞和收藏的帖子ID列表
  let likedPostIds: string[] = []
  let favoritedPostIds: string[] = []
  if (currentUser) {
    const [likesResult, favoritesResult] = await Promise.all([
      supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUser.id)
        .in('post_id', data.map((p) => p.id)),
      supabase
        .from('post_favorites')
        .select('post_id')
        .eq('user_id', currentUser.id)
        .in('post_id', data.map((p) => p.id))
    ])

    likedPostIds = likesResult.data?.map(l => l.post_id) || []
    favoritedPostIds = favoritesResult.data?.map(f => f.post_id) || []
  }

  // 格式化数据并合并用户信息
  return data.map((post) => {
    // 处理 divination_records：如果是数组且只有一个元素，取第一个；如果是对象，直接使用
    let divinationRecord: DivinationRecord | null = null
    if (post.divination_records) {
      if (Array.isArray(post.divination_records)) {
        divinationRecord = post.divination_records.length > 0 ? (post.divination_records[0] as DivinationRecord) : null
      } else {
        divinationRecord = post.divination_records as DivinationRecord
      }
    }

    return {
      ...post,
      author,
      is_liked: likedPostIds.includes(post.id),
      is_favorited: favoritedPostIds.includes(post.id),
      divination_record: divinationRecord,
    }
  })
}

/**
 * 获取用户收藏的帖子列表
 */
export async function getUserFavoritePosts(options?: {
  limit?: number
  offset?: number
}): Promise<Post[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const {
    limit = 50,
    offset = 0,
  } = options || {}

  // 先获取用户收藏的帖子ID列表
  const { data: favorites, error: favoritesError } = await supabase
    .from('post_favorites')
    .select('post_id')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (favoritesError) {
    console.error('Error fetching favorite posts:', favoritesError)
    throw favoritesError
  }

  if (!favorites || favorites.length === 0) {
    return []
  }

  const postIds = favorites.map(f => f.post_id)

  // 查询帖子详情，同时获取关联的排盘记录
  // 只查询已发布的帖子，排除草稿
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      *,
      divination_records (
        id,
        original_key,
        changed_key,
        lines,
        changing_flags,
        method,
        original_json
      )
    `)
    .in('id', postIds)
    .in('status', ['published', 'archived'])  // 只显示已发布和已结案的帖子
    .order('created_at', { ascending: false })

  if (postsError) {
    console.error('Error fetching posts:', postsError)
    throw postsError
  }

  if (!posts || posts.length === 0) {
    return []
  }

  // 获取所有唯一的 user_id
  const userIds = [...new Set(posts.map((post: PostRow) => post.user_id).filter(Boolean))]

  // 批量查询用户信息
  const profilesMap = new Map<string, { id: string; nickname: string | null; avatar_url: string | null }>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', userIds)

    if (profiles) {
      profiles.forEach((profile: ProfileRow) => {
        profilesMap.set(profile.id, profile)
      })
    }
  }

  // 获取当前用户点赞的帖子ID列表
  let likedPostIds: string[] = []
  const favoritedPostIds: string[] = postIds
  const [likesResult] = await Promise.all([
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUser.id)
      .in('post_id', postIds),
  ])

  likedPostIds = likesResult.data?.map(l => l.post_id) || []

  // 格式化数据并合并用户信息
  return posts.map((post: PostRow) => {
    // 处理 divination_records：如果是数组且只有一个元素，取第一个；如果是对象，直接使用
    let divinationRecord = null
    if (post.divination_records) {
      if (Array.isArray(post.divination_records)) {
        divinationRecord = post.divination_records.length > 0 ? post.divination_records[0] : null
      } else {
        divinationRecord = post.divination_records
      }
    }

    return {
      ...post,
      author: profilesMap.get(post.user_id) || null,
      is_liked: likedPostIds.includes(post.id),
      is_favorited: favoritedPostIds.includes(post.id),
      divination_record: divinationRecord,
    }
  })
}

/**
 * 获取用户点赞的帖子列表
 */
export async function getUserLikedPosts(options?: {
  limit?: number
  offset?: number
}): Promise<Post[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const {
    limit = 50,
    offset = 0,
  } = options || {}

  // 先获取用户点赞的帖子ID列表
  const { data: likes, error: likesError } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (likesError) {
    console.error('Error fetching liked posts:', likesError)
    throw likesError
  }

  if (!likes || likes.length === 0) {
    return []
  }

  const postIds = likes.map(l => l.post_id)

  // 查询帖子详情，同时获取关联的排盘记录
  // 只查询已发布的帖子，排除草稿
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      *,
      divination_records (
        id,
        original_key,
        changed_key,
        lines,
        changing_flags,
        method,
        original_json
      )
    `)
    .in('id', postIds)
    .in('status', ['published', 'archived'])  // 只显示已发布和已结案的帖子
    .order('created_at', { ascending: false })

  if (postsError) {
    console.error('Error fetching posts:', postsError)
    throw postsError
  }

  if (!posts || posts.length === 0) {
    return []
  }

  // 获取所有唯一的 user_id
  const userIds = [...new Set(posts.map((post: PostRow) => post.user_id).filter(Boolean))]

  // 批量查询用户信息
  const profilesMap = new Map<string, { id: string; nickname: string | null; avatar_url: string | null }>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', userIds)

    if (profiles) {
      profiles.forEach((profile: ProfileRow) => {
        profilesMap.set(profile.id, profile)
      })
    }
  }

  // 获取当前用户收藏的帖子ID列表
  const likedPostIds: string[] = postIds
  let favoritedPostIds: string[] = []
  const [favoritesResult] = await Promise.all([
    supabase
      .from('post_favorites')
      .select('post_id')
      .eq('user_id', currentUser.id)
      .in('post_id', postIds),
  ])

  favoritedPostIds = favoritesResult.data?.map(f => f.post_id) || []

  // 格式化数据并合并用户信息
  return posts.map((post: PostRow) => {
    // 处理 divination_records：如果是数组且只有一个元素，取第一个；如果是对象，直接使用
    let divinationRecord = null
    if (post.divination_records) {
      if (Array.isArray(post.divination_records)) {
        divinationRecord = post.divination_records.length > 0 ? post.divination_records[0] : null
      } else {
        divinationRecord = post.divination_records
      }
    }

    return {
      ...post,
      author: profilesMap.get(post.user_id) || null,
      is_liked: likedPostIds.includes(post.id),
      is_favorited: favoritedPostIds.includes(post.id),
      divination_record: divinationRecord,
    }
  })
}

/**
 * 删除帖子
 */
export async function deletePost(postId: string): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', currentUser.id)

  if (error) {
    console.error('Error deleting post:', error)
    throw error
  }
}

/**
 * 切换帖子点赞状态
 */
export async function togglePostLike(postId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  // 检查是否已点赞
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', currentUser.id)
    .maybeSingle()

  if (existingLike) {
    // 取消点赞
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', currentUser.id)

    if (error) {
      console.error('Error unliking post:', JSON.stringify(error, null, 2))
      throw error
    }
    trackEvent('post_interaction', {
      action_type: 'unlike',
      target_id: postId,
      target_type: 'post',
    })
    return false
  } else {
    // 点赞
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: currentUser.id,
      })

    if (error) {
      // Handle race condition: if already liked (unique violation), consider it a success
      if (error.code === '23505') {
        trackEvent('post_interaction', {
          action_type: 'like',
          target_id: postId,
          target_type: 'post',
        })
        return true
      }
      console.error('Error liking post:', JSON.stringify(error, null, 2))
      throw error
    }

    // 点赞成功后，自动增加修业值
    try {
      const { addExp } = await import('./growth')
      await addExp(2, '点赞帖子')
    } catch (error) {
      // 静默处理错误，不影响点赞
      console.error('Failed to add exp for post like:', error)
    }

    trackEvent('post_interaction', {
      action_type: 'like',
      target_id: postId,
      target_type: 'post',
    })
    return true
  }
}

/**
 * 切换帖子收藏状态
 */
export async function togglePostFavorite(postId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  // 检查是否已收藏
  const { data: existingFavorite } = await supabase
    .from('post_favorites')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', currentUser.id)
    .maybeSingle()

  if (existingFavorite) {
    // 取消收藏
    const { error } = await supabase
      .from('post_favorites')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', currentUser.id)

    if (error) {
      console.error('Error unfavoriting post:', error)
      throw error
    }
    trackEvent('post_interaction', {
      action_type: 'unfavorite',
      target_id: postId,
      target_type: 'post',
    })
    return false
  } else {
    // 收藏
    const { error } = await supabase
      .from('post_favorites')
      .insert({
        post_id: postId,
        user_id: currentUser.id,
      })

    if (error) {
      // Handle race condition: if already favorited (unique violation), consider it a success
      if (error.code === '23505') {
        trackEvent('post_interaction', {
          action_type: 'favorite',
          target_id: postId,
          target_type: 'post',
        })
        return true
      }
      console.error('Error favoriting post:', JSON.stringify(error, null, 2))
      throw error
    }

    trackEvent('post_interaction', {
      action_type: 'favorite',
      target_id: postId,
      target_type: 'post',
    })
    return true
  }
}

// -----------------------------------------------------------------------------
// 评论相关函数
// -----------------------------------------------------------------------------

/**
 * 获取帖子的评论列表
 */
export async function getComments(postId: string): Promise<Comment[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    logError('Error fetching comments:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // 获取所有唯一的 user_id
  const userIds = [...new Set(data.map((comment) => comment.user_id).filter(Boolean))]

  // 批量查询用户信息
  const profilesMap = new Map<string, { id: string; nickname: string | null; avatar_url: string | null }>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', userIds)

    if (profiles) {
      profiles.forEach((profile) => {
        profilesMap.set(profile.id, profile)
      })
    }
  }

  // 获取当前用户ID，用于检查是否已点赞
  const currentUser = await getCurrentUser()
  const userId = currentUser?.id

  // 获取用户点赞的评论ID列表
  let likedCommentIds: string[] = []
  if (userId) {
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', data.map((c: CommentRow) => c.id))

    likedCommentIds = likes?.map(l => l.comment_id) || []
  }

  // 格式化数据并创建评论映射（用于查找被回复的评论）
  const commentMap = new Map<string, Comment>()
  const allComments = data.map((comment: CommentRow) => {
    const formattedComment: Comment = {
      ...comment,
      // 确保 is_adopted 字段被正确保留（对所有用户可见）
      is_adopted: comment.is_adopted === true || !!comment.adopted_by,
      adopted_at: comment.adopted_at || null,
      adopted_by: comment.adopted_by || null,
      author: profilesMap.get(comment.user_id) || null,
      is_liked: likedCommentIds.includes(comment.id),
      replies: [],
    }
    commentMap.set(comment.id, formattedComment)
    return formattedComment
  })

  // 为每个评论添加被回复评论的信息（微博模式）
  allComments.forEach((comment) => {
    if (comment.parent_id) {
      const parentComment = commentMap.get(comment.parent_id)
      if (parentComment) {
        comment.reply_to = {
          id: parentComment.id,
          author: parentComment.author || null,
        }
      }
    }
  })

  // 返回所有评论的平铺列表
  // 排序规则：已采纳的评论优先显示在最前面，然后按时间排序
  return allComments.sort((a, b) => {
    // 如果一个是已采纳，另一个不是，已采纳的排在前面
    if (a.is_adopted === true && b.is_adopted !== true) return -1
    if (a.is_adopted !== true && b.is_adopted === true) return 1
    // 如果都是已采纳或都不是，按时间排序
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

/**
 * 获取指定用户的评论列表（用于用户公开主页）
 * @param userId 用户ID
 * @param limit 限制数量
 * @param offset 偏移量
 */
export async function getUserComments(options?: {
  userId: string
  limit?: number
  offset?: number
}): Promise<Comment[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { userId, limit = 20, offset = 0 } = options || {}
  if (!userId) {
    return []
  }

  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      posts (
        id,
        title,
        type
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching user comments:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // 获取用户信息
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url')
    .eq('id', userId)
    .single()

  const author = profile ? {
    id: profile.id,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
  } : null

  // 获取当前用户点赞的评论ID列表
  const currentUser = await getCurrentUser()
  let likedCommentIds: string[] = []
  if (currentUser) {
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', currentUser.id)
      .in('comment_id', data.map((c: CommentRow) => c.id))

    likedCommentIds = likes?.map(l => l.comment_id) || []
  }

  // 格式化数据
  return data.map((comment: CommentRow) => ({
    ...comment,
    author,
    is_liked: likedCommentIds.includes(comment.id),
    post: comment.posts ? {
      id: comment.posts.id,
      title: comment.posts.title,
      type: comment.posts.type,
    } : null,
  }))
}

/**
 * 创建评论
 */
export async function createComment(
  input: CreateCommentInput
): Promise<Comment> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: input.post_id,
      user_id: currentUser.id,
      content: input.content,
      parent_id: input.parent_id || null,
    })
    .select('*')
    .single()

  if (error) {
    logError('Error creating comment:', error)
    throw error
  }

  // 查询用户信息
  let author = null
  if (data.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', data.user_id)
      .single()

    if (profile) {
      author = profile
    }
  }

  // 发表评论成功后，自动增加修业值
  try {
    const { addExp } = await import('./growth')
    await addExp(10, '发表评论')
  } catch (error) {
    // 静默处理错误，不影响评论创建
    console.error('Failed to add exp for comment creation:', error)
  }

  trackEvent('post_interaction', {
    action_type: 'comment',
    target_id: input.post_id,
    comment_id: data.id,
  })

  return {
    ...data,
    author,
    is_liked: false,
    replies: [],
  }
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: string): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', currentUser.id)

  if (error) {
    console.error('Error deleting comment:', error)
    throw error
  }
}

/**
 * 切换评论点赞状态
 * 当评论被点赞时，评论作者获得 +1 声望值
 */
export async function toggleCommentLike(commentId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  // 获取评论信息（需要评论作者ID）
  const { data: comment } = await supabase
    .from('comments')
    .select('user_id')
    .eq('id', commentId)
    .single()

  if (!comment) {
    throw new Error('Comment not found')
  }

  // 检查是否已点赞
  const { data: existingLike } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('comment_id', commentId)
    .eq('user_id', currentUser.id)
    .maybeSingle()

  if (existingLike) {
    // 取消点赞（不扣除声望值，因为PRD中没有规定）
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', currentUser.id)

    if (error) {
      console.error('Error unliking comment:', error)
      throw error
    }
    trackEvent('post_interaction', {
      action_type: 'unlike',
      target_id: commentId,
      target_type: 'comment',
    })
    return false
  } else {
    // 点赞
    const { error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: currentUser.id,
      })

    if (error) {
      // Handle race condition: if already liked (unique violation), consider it a success
      if (error.code === '23505') {
        trackEvent('post_interaction', {
          action_type: 'like',
          target_id: commentId,
          target_type: 'comment',
        })
        return true
      }
      console.error('Error liking comment:', JSON.stringify(error, null, 2))
      throw error
    }

    // 评论被点赞，评论作者获得 +1 声望值
    // 注意：只有评论作者不是当前用户时才加声望（不能给自己点赞加声望）
    if (comment.user_id !== currentUser.id) {
      try {
        const { addReputation } = await import('./growth')
        await addReputation(1, '断语获得赞同', commentId)
      } catch (error) {
        // 声望增加失败不影响点赞操作
        console.error('Failed to add reputation for comment like:', error)
      }
    }

    trackEvent('post_interaction', {
      action_type: 'like',
      target_id: commentId,
      target_type: 'comment',
    })
    return true
  }
}

/**
 * 采纳评论（题主采纳最佳答案）
 * 当评论被采纳时：
 * 1. 评论作者获得 +10 声望值
 * 2. 如果帖子有悬赏金（bounty > 0），则从题主转给答主
 * 只有题主（帖子作者）可以采纳评论
 */
export async function adoptComment(commentId: string, postId: string): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { success: false, message: '请先登录' }
  }

  try {
    // 1. 验证用户是否为帖子作者（题主），并获取帖子信息（包括悬赏金和标题）
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id, bounty, title')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return { success: false, message: '帖子不存在' }
    }

    if (post.user_id !== currentUser.id) {
      return { success: false, message: '只有题主可以采纳评论' }
    }

    // 2. 获取评论信息
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, user_id, is_adopted')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return { success: false, message: '评论不存在' }
    }

    // 3. 检查是否已经被采纳
    if (comment.is_adopted) {
      return { success: false, message: '该评论已被采纳' }
    }

    // 4. 检查是否已有其他评论被采纳（一个帖子只能采纳一个评论）
    const { data: existingAdoptedComment } = await supabase
      .from('comments')
      .select('id')
      .eq('post_id', postId)
      .eq('is_adopted', true)
      .maybeSingle()

    if (existingAdoptedComment) {
      return { success: false, message: '该帖子已有评论被采纳，请先取消采纳' }
    }

    // 5. 如果有悬赏金，检查题主余额是否充足
    if (post.bounty && post.bounty > 0) {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('yi_coins')
        .eq('id', currentUser.id)
        .single()

      if (profileError || !userProfile) {
        return { success: false, message: '无法获取账户信息，请重试' }
      }

      const currentBalance = userProfile.yi_coins || 0
      if (currentBalance < post.bounty) {
        return { 
          success: false, 
          message: `易币余额不足。当前余额：${currentBalance}，需要：${post.bounty}。请先充值后再采纳。` 
        }
      }
    }

    // 6. 更新评论的采纳状态
    // 注意：数据库触发器会自动增加评论作者的声望值
    const { error: updateError, data: updatedData } = await supabase
      .from('comments')
      .update({
        is_adopted: true,
        adopted_at: new Date().toISOString(),
        adopted_by: currentUser.id,
      })
      .eq('id', commentId)
      .select()

    if (updateError) {
      console.error('Error adopting comment:', updateError)
      return { success: false, message: '采纳失败，请重试' }
    }

    // 检查是否真正更新了数据（防止 RLS 静默拦截）
    if (!updatedData || updatedData.length === 0) {
      console.error('Adoption failed: No rows updated. Likely RLS permission issue.')
      return { 
        success: false, 
        message: '采纳失败：数据库权限限制。请管理员执行 SQL 修复 RLS 策略 (add_comment_adoption_policy.sql)。' 
      }
    }

    // 7. 手动调用声望增加函数（作为备份，因为触发器已经处理）
    try {
      const { addReputation } = await import('./growth')
      await addReputation(10, '断语被题主采纳', commentId)
    } catch (error) {
      // 如果触发器已经处理，这里可能会重复，但不会影响主流程
      console.debug('Reputation may have been added by trigger:', error)
    }

    // 8. 如果有悬赏金，执行易币转账（此时余额已确认充足）
    let bountyMessage = ''
    if (post.bounty && post.bounty > 0) {
      try {
        const { transferYiCoins } = await import('./growth')
        const transferResult = await transferYiCoins(
          currentUser.id, // 题主（发送者）
          comment.user_id, // 答主（接收者）
          post.bounty,
          'bounty_reward',
          `悬赏求测贴采纳奖励（帖子ID: ${postId}）`,
          postId
        )

        if (transferResult.success) {
          bountyMessage = `，${post.bounty}易币已转给答主`
        } else {
          console.error('Bounty transfer failed:', transferResult.message)
          // 虽然已经检查过余额，但转账仍可能失败（如并发问题）
          // 此时评论已被采纳，需要回滚采纳状态
          const { error: rollbackError } = await supabase
            .from('comments')
            .update({
              is_adopted: false,
              adopted_at: null,
              adopted_by: null,
            })
            .eq('id', commentId)
          
          if (rollbackError) {
            console.error('Failed to rollback adoption after transfer failure:', rollbackError)
          }
          
          return { 
            success: false, 
            message: `悬赏金转账失败：${transferResult.message}。采纳操作已取消，请重试。` 
          }
        }
      } catch (error) {
        console.error('Error transferring bounty:', error)
        // 转账异常，回滚采纳状态
        const { error: rollbackError } = await supabase
          .from('comments')
          .update({
            is_adopted: false,
            adopted_at: null,
            adopted_by: null,
          })
          .eq('id', commentId)
        
        if (rollbackError) {
          console.error('Failed to rollback adoption after transfer error:', rollbackError)
        }
        
        return { 
          success: false, 
          message: '悬赏金转账失败，采纳操作已取消，请重试' 
        }
      }
    }

    // 9. 发送系统通知给答主（评论作者）
    try {
      const { createNotification } = await import('./notifications')
      const notificationContent = post.bounty && post.bounty > 0
        ? `您的评论被采纳，获得${post.bounty}易币和10声望值`
        : '您的评论被采纳，获得10声望值'
      
      await createNotification(
        comment.user_id, // 答主（接收通知的用户）
        'system',
        commentId,
        'comment',
        currentUser.id, // 题主（操作者）
        notificationContent,
        {
          post_id: postId,
          post_title: post.title,
          bounty: post.bounty || 0,
        }
      )
    } catch (error) {
      console.error('Error creating notification:', error)
      // 通知创建失败不影响采纳操作
    }

    return { 
      success: true, 
      message: `已采纳该评论，评论者获得10声望值${bountyMessage}` 
    }
  } catch (error) {
    console.error('Error adopting comment:', error)
    return { success: false, message: '采纳失败，请重试' }
  }
}

/**
 * 取消采纳评论
 * 只有题主可以取消采纳
 * 注意：根据PRD，取消采纳不扣除声望值
 */
export async function cancelAdoptComment(commentId: string, postId: string): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { success: false, message: '请先登录' }
  }

  try {
    // 验证用户是否为帖子作者
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single()

    if (!post || post.user_id !== currentUser.id) {
      return { success: false, message: '只有题主可以取消采纳' }
    }

    // 更新评论，清除采纳状态
    const { error } = await supabase
      .from('comments')
      .update({
        is_adopted: false,
        adopted_at: null,
        adopted_by: null,
      })
      .eq('id', commentId)

    if (error) {
      console.error('Error canceling adopt:', error)
      return { success: false, message: '取消采纳失败，请重试' }
    }

    // 注意：根据PRD，取消采纳不扣除声望值

    return { success: true, message: '已取消采纳' }
  } catch (error) {
    console.error('Error canceling adopt:', error)
    return { success: false, message: '取消采纳失败，请重试' }
  }
}

// -----------------------------------------------------------------------------
// 草稿箱功能
// -----------------------------------------------------------------------------

/**
 * 保存为草稿
 */
export async function saveDraft(input: CreatePostInput): Promise<Post> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  // 构建插入数据，只包含有值的字段
  const insertData: Record<string, string | number | null | undefined> = {
    user_id: currentUser.id,
    title: input.title || '未命名草稿',
    content: input.content || '',
    content_html: input.content_html || input.content || '',
    type: input.type || 'theory',
    method: input.method ?? null,
  }

  // 只添加有值的可选字段
  if (input.bounty !== undefined && input.bounty !== null && input.bounty > 0) {
    insertData.bounty = input.bounty
  } else {
    insertData.bounty = 0
  }

  if (input.divination_record_id) {
    insertData.divination_record_id = input.divination_record_id
  }

  if (input.cover_image_url) {
    insertData.cover_image_url = input.cover_image_url
  }

  // 尝试添加 status 字段（如果字段不存在，会报错）
  insertData.status = 'draft'

  const { data, error } = await supabase
    .from('posts')
    .insert(insertData)
    .select('*')
    .single()

  if (error) {
    // 检查是否是字段不存在的错误
    const errorMessage = error.message || ''
    const errorCode = error.code || ''
    const errorDetails = error.details || ''
    const errorHint = error.hint || ''
    
    // 如果错误信息包含 "column" 和 "does not exist"，说明字段不存在
    if (
      errorMessage.toLowerCase().includes('column') && 
      (errorMessage.toLowerCase().includes('does not exist') || 
       errorMessage.toLowerCase().includes('不存在'))
    ) {
      const missingField = errorMessage.match(/column "(\w+)" does not exist/i)?.[1] ||
                          errorMessage.match(/列 "(\w+)" 不存在/i)?.[1]
      logError('Error saving draft - Database migration required:', {
        message: `字段 "${missingField || 'status'}" 不存在，请运行数据库迁移`,
        code: errorCode,
        details: errorDetails,
        hint: errorHint || '请执行迁移文件: supabase/migrations/20250223_add_draft_status_to_posts.sql',
        fullError: error,
      })
      throw new Error(
        `❌ 数据库字段缺失：${missingField || 'status'}\n\n` +
        `请运行数据库迁移后再试。\n` +
        `迁移文件: supabase/migrations/20250223_add_draft_status_to_posts.sql\n\n` +
        `快速修复：在 Supabase Dashboard 的 SQL Editor 中执行：\n` +
        `ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived'));`
      )
    }
    
    // 检查是否是约束错误（如 status 值不符合约束）
    if (
      errorMessage.toLowerCase().includes('check constraint') ||
      errorMessage.toLowerCase().includes('violates check constraint')
    ) {
      logError('Error saving draft - Constraint violation:', {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
        hint: errorHint || 'status 字段的值必须是 published, draft 或 archived',
        fullError: error,
      })
      throw new Error(
        `❌ 数据约束错误：${errorMessage}\n\n` +
        `请检查 status 字段的值是否正确。`
      )
    }
    
    // 记录详细错误信息
    logError('Error saving draft:', {
      message: errorMessage || '未知错误',
      code: errorCode || 'UNKNOWN',
      details: errorDetails || '',
      hint: errorHint || '',
      fullError: error,
      insertData: insertData, // 记录插入的数据以便调试
    })
    
    // 抛出更友好的错误
    throw new Error(
      `保存草稿失败：${errorMessage || '未知错误'}\n` +
      (errorCode ? `错误代码: ${errorCode}\n` : '') +
      (errorHint ? `提示: ${errorHint}` : '')
    )
  }

  // 查询用户信息
  let author = null
  if (data.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', data.user_id)
      .single()

    if (profile) {
      author = {
        id: profile.id,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
      }
    }
  }

  return {
    ...data,
    author,
    is_liked: false,
  }
}

/**
 * 更新草稿
 */
export async function updateDraft(
  draftId: string,
  updates: Partial<CreatePostInput>
): Promise<Post> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('posts')
    .update({
      title: updates.title,
      content: updates.content,
      content_html: updates.content_html || updates.content,
      cover_image_url: updates.cover_image_url,
      type: updates.type,
      bounty: updates.bounty,
      divination_record_id: updates.divination_record_id,
      method: updates.method,
    })
    .eq('id', draftId)
    .eq('user_id', currentUser.id)
    .eq('status', 'draft')  // 只能更新草稿
    .select('*')
    .single()

  if (error) {
    logError('Error updating draft:', error)
    throw error
  }

  // 查询用户信息
  let author = null
  if (data.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', data.user_id)
      .single()

    if (profile) {
      author = {
        id: profile.id,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
      }
    }
  }

  return {
    ...data,
    author,
    is_liked: false,
  }
}

/**
 * 发布草稿（将草稿状态改为已发布）
 */
export async function publishDraft(draftId: string): Promise<Post> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('posts')
    .update({
      status: 'published',
    })
    .eq('id', draftId)
    .eq('user_id', currentUser.id)
    .eq('status', 'draft')  // 只能发布草稿
    .select('*')
    .single()

  if (error) {
    logError('Error publishing draft:', error)
    throw error
  }

  // 发布后添加修业值
  try {
    const { addExp } = await import('./growth')
    await addExp(10, '发布帖子')
  } catch (error) {
    logError('Failed to add exp for publishing post:', error)
  }

  // 查询用户信息
  let author = null
  if (data.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', data.user_id)
      .single()

    if (profile) {
      author = {
        id: profile.id,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
      }
    }
  }

  return {
    ...data,
    author,
    is_liked: false,
  }
}

/**
 * 获取用户的草稿列表
 */
export async function getUserDrafts(
  options?: {
    limit?: number
    offset?: number
  }
): Promise<Post[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const {
    limit = 50,
    offset = 0,
  } = options || {}

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      divination_records (
        id,
        original_key,
        changed_key,
        lines,
        changing_flags,
        method,
        original_json
      )
    `)
    .eq('user_id', currentUser.id)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logError('Error fetching drafts:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // 获取用户信息
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url')
    .eq('id', currentUser.id)
    .single()

  const author = profile ? {
    id: profile.id,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
  } : null

  // 格式化数据
  return data.map((post: PostRow) => {
    // 处理 divination_records
    let divinationRecord = null
    if (post.divination_records) {
      if (Array.isArray(post.divination_records)) {
        divinationRecord = post.divination_records.length > 0 ? post.divination_records[0] : null
      } else {
        divinationRecord = post.divination_records
      }
    }

    return {
      ...post,
      author,
      is_liked: false,
      is_favorited: false,
      divination_record: divinationRecord,
    }
  })
}

/**
 * 删除草稿
 */
export async function deleteDraft(draftId: string): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', draftId)
    .eq('user_id', currentUser.id)
    .eq('status', 'draft')  // 只能删除草稿

  if (error) {
    logError('Error deleting draft:', error)
    throw error
  }
}

export async function getTags(options?: {
  category?: TagCategory
  scope?: DivinationMethodType | null
  search?: string
  limit?: number
}, client?: SupabaseClient): Promise<Tag[]> {
  const supabase = client || getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { category, scope, search, limit = 50 } = options || {}

  let query = supabase.from('tags').select('*')

  if (category) query = query.eq('category', category)

  if (scope === null) query = query.is('scope', null)
  else if (scope) query = query.eq('scope', scope)

  if (search && search.trim()) query = query.ilike('name', `%${search.trim()}%`)

  const { data, error } = await query
    .order('usage_count', { ascending: false })
    .order('name', { ascending: true })
    .range(0, limit - 1)

  if (error) {
    logError('Error fetching tags:', error)
    throw error
  }

  return (data || []) as Tag[]
}

export async function getPostTags(postId: string): Promise<Tag[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('post_tags')
    .select('tag_id, tags ( id, name, category, scope, usage_count )')
    .eq('post_id', postId)

  if (error) {
    logError('Error fetching post tags:', error)
    throw error
  }

  const rows = (data || []) as Array<{ tag_id: string; tags: Tag | Tag[] | null }>
  const tags: Tag[] = []
  for (const row of rows) {
    if (!row.tags) continue
    if (Array.isArray(row.tags)) {
      if (row.tags[0]) tags.push(row.tags[0])
    } else {
      tags.push(row.tags)
    }
  }
  return tags
}

export async function setPostTags(postId: string, tagIds: string[], client?: SupabaseClient): Promise<void> {
  const supabase = client || getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { error: deleteError } = await supabase.from('post_tags').delete().eq('post_id', postId)
  if (deleteError) {
    logError('Error deleting post tags:', deleteError)
    throw deleteError
  }

  const uniqueTagIds = Array.from(new Set(tagIds.filter(Boolean)))
  if (uniqueTagIds.length === 0) return

  const { error: insertError } = await supabase.from('post_tags').insert(
    uniqueTagIds.map((tagId) => ({
      post_id: postId,
      tag_id: tagId,
    }))
  )

  if (insertError) {
    logError('Error inserting post tags:', insertError)
    throw insertError
  }
}

import { SupabaseClient } from '@supabase/supabase-js'

export async function createCustomTag(input: {
  name: string
  scope?: DivinationMethodType | null
}, client?: SupabaseClient): Promise<Tag> {
  const supabase = client || getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const name = input.name.trim()
  if (!name) {
    throw new Error('标签名不能为空')
  }

  const { data, error } = await supabase
    .from('tags')
    .insert({
      name,
      category: 'custom',
      scope: input.scope ?? null,
    })
    .select('*')
    .single()

  if (error) {
    logError('Error creating custom tag:', error)
    throw error
  }

  return data as Tag
}
