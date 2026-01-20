import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getCurrentPathWithSearchAndHash, getCurrentUser, redirectToLogin, setLoginIntent } from './auth';
import { getSupabaseClient } from './supabaseClient';

export async function syncProfileFromAuthUser(
  params: { user: User; defaultNickname?: string; role?: string },
  client?: SupabaseClient
): Promise<void> {
  const supabase = client || getSupabaseClient()
  if (!supabase) return

  const now = new Date().toISOString()
  const role = params.role || 'user'
  const userId = params.user.id

  const insertPayload: Record<string, unknown> = {
    id: userId,
    role,
  }

  if (params.defaultNickname) insertPayload.nickname = params.defaultNickname
  if (params.user.email) insertPayload.email = params.user.email
  insertPayload.last_login_at = now

  await supabase
    .from('profiles')
    .upsert(insertPayload, { onConflict: 'id', ignoreDuplicates: true })

  const updatePayload: Record<string, unknown> = {
    last_login_at: now,
  }
  if (params.user.email) updatePayload.email = params.user.email

  await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
}

export interface UserProfile {
  id: string
  nickname: string | null
  avatar_url: string | null
  motto: string | null
  role: string
  created_at: string
  exp?: number
  reputation?: number
  yi_coins?: number
  coin_paid?: number
  coin_free?: number
  cash_balance?: number
  title_level?: number
  level?: number
  last_checkin_date?: string | null
  consecutive_checkin_days?: number
}

export interface UserStats {
  publishedCases: number // 发布案例
  participatedDeductions: number // 参与推演
  likesReceived: number // 获赞同
  accuracyRate: number // 准确率
  verifiedCases: number // 已验证案例数
}

export interface UserFollowStats {
  followingCount: number // 关注数
  followersCount: number // 粉丝数
  postsCount: number // 总发帖数
}

export interface Note {
  id: string
  title: string
  description: string | null
  question: string | null
  created_at: string
  updated_at: string
}

// 请求去重：避免同一时间多次请求相同的数据
const pendingProfileRequests = new Map<string, Promise<UserProfile | null>>()
const pendingProfileWithGrowthRequests = new Map<string, Promise<{
  profile: UserProfile | null
  growth: {
    exp: number
    reputation: number
    yiCoins: number
    cashBalance: number
    titleLevel: number
    lastCheckinDate: string | null
    consecutiveCheckinDays: number
  } | null
}>>()

/**
 * 获取用户资料
 * 优化：添加请求去重机制，避免并发请求
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  // 请求去重：如果已经有相同的请求在进行中，直接返回该请求的Promise
  const requestKey = `getUserProfile-${user.id}`
  if (pendingProfileRequests.has(requestKey)) {
    return pendingProfileRequests.get(requestKey)!
  }

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const requestPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // 如果是"未找到"错误（PGRST116）或 406 错误，这是正常的（用户可能还没有profile记录）
        // 静默处理，不记录日志
        if (error.code === 'PGRST116' || 
            (error as { status?: number }).status === 406 ||
            error.message?.includes('JSON object requested, multiple') || 
            error.message?.includes('0 rows') ||
            error.message?.includes('Not Acceptable')) {
          // Profile 不存在是正常情况，静默返回 null
          return null
        }
        
        // 记录详细的错误信息（仅当不是空对象时）
        // 使用可选链和默认值，确保即使属性不存在也能记录
        const errorDetails = {
          code: error.code || 'UNKNOWN',
          message: error.message || 'Unknown error',
          details: error.details || null,
          hint: error.hint || null,
          userId: user.id,
          errorType: error.constructor?.name || typeof error,
          errorString: String(error),
        }
        
        // 只有当错误信息不是完全为空时才记录
        const hasActualError = errorDetails.code !== 'UNKNOWN' || 
                              errorDetails.message !== 'Unknown error' ||
                              errorDetails.details !== null ||
                              errorDetails.hint !== null
        
        if (hasActualError) {
          console.error('Error fetching profile (raw):', error)
          try {
            console.error('Error fetching profile (details):', JSON.stringify(errorDetails, null, 2))
          } catch (e) {
            console.error('Error fetching profile (fallback):', errorDetails)
          }
        }
        
        return null
      }

      if (data) {
        data.coin_paid = data.coin_paid || 0
        data.coin_free = data.coin_free || 0
        if (data.yi_coins === undefined || data.yi_coins === null) {
          data.yi_coins = data.coin_paid + data.coin_free
        }
      }

      return data
    } catch (error) {
      // 处理意外的错误（非 Supabase 错误）
      let errorInfo: unknown
      
      if (error instanceof Error) {
        errorInfo = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      } else if (typeof error === 'object' && error !== null) {
        // 尝试序列化错误对象
        try {
          errorInfo = {
            type: typeof error,
            stringified: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            raw: error,
          }
        } catch (stringifyError) {
          // 如果序列化失败，使用更安全的方法
          errorInfo = {
            type: typeof error,
            constructor: error.constructor?.name,
            keys: Object.keys(error),
            toString: String(error),
            raw: error,
          }
        }
      } else {
        errorInfo = { 
          raw: error,
          type: typeof error,
          stringified: String(error),
        }
      }
      
      console.error('Unexpected error fetching profile:', {
        userId: user.id,
        error: errorInfo,
      })
      return null
    } finally {
      // 请求完成后移除
      pendingProfileRequests.delete(requestKey)
    }
  })()

  // 保存请求Promise
  pendingProfileRequests.set(requestKey, requestPromise)
  return requestPromise
}

/**
 * 获取指定用户的资料（用于查看其他用户的个人主页）
 * @param userId 用户ID
 */
export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error('getUserProfileById: Supabase client not available')
    return null
  }

  // 验证 userId 是否有效
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.error('getUserProfileById: Invalid userId provided', { userId })
    return null
  }

  // 请求去重：如果已经有相同的请求在进行中，直接返回该请求的Promise
  const requestKey = `getUserProfileById-${userId}`
  if (pendingProfileRequests.has(requestKey)) {
    return pendingProfileRequests.get(requestKey)!
  }

  const requestPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // 更详细的错误日志
        console.error('Error fetching user profile by id:', {
          userId,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          fullError: error,
        })
        
        // 如果是 PGRST116 (not found)，这是正常的，返回 null
        if (error.code === 'PGRST116') {
          console.log(`User profile not found for userId: ${userId}`)
          return null
        }
        
        return null
      }

      if (!data) {
        console.log(`No profile data returned for userId: ${userId}`)
        return null
      }

      if (data) {
        data.coin_paid = data.coin_paid || 0
        data.coin_free = data.coin_free || 0
        if (data.yi_coins === undefined || data.yi_coins === null) {
          data.yi_coins = data.coin_paid + data.coin_free
        }
      }

      return data as UserProfile
    } catch (error) {
      // 捕获意外的错误
      console.error('Unexpected error fetching user profile by id:', {
        userId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      })
      return null
    } finally {
      // 请求完成后移除
      pendingProfileRequests.delete(requestKey)
    }
  })()

  // 保存请求Promise
  pendingProfileRequests.set(requestKey, requestPromise)
  return requestPromise
}

/**
 * 获取用户完整资料（包含成长数据）
 * 优化版本：一次性获取所有字段，避免多次查询profiles表
 * 添加请求去重机制
 */
export async function getUserProfileWithGrowth(): Promise<{
  profile: UserProfile | null
  growth: {
    exp: number
    reputation: number
    yiCoins: number
    cashBalance: number
    titleLevel: number
    lastCheckinDate: string | null
    consecutiveCheckinDays: number
  } | null
}> {
  const user = await getCurrentUser()
  if (!user) {
    return { profile: null, growth: null }
  }

  // 请求去重：如果已经有相同的请求在进行中，直接返回该请求的Promise
  const requestKey = `getUserProfileWithGrowth-${user.id}`
  if (pendingProfileWithGrowthRequests.has(requestKey)) {
    return pendingProfileWithGrowthRequests.get(requestKey)!
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { profile: null, growth: null }
  }

  const requestPromise = (async () => {
    try {
      // 一次性查询所有需要的字段（*已经包含所有字段，不需要重复指定）
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // 如果是"未找到"错误（PGRST116）或 406 错误，这是正常的（用户可能还没有profile记录）
        // 静默处理，不记录日志
        if (error.code === 'PGRST116' || 
            (error as { status?: number }).status === 406 ||
            error.message?.includes('JSON object requested, multiple') || 
            error.message?.includes('0 rows') ||
            error.message?.includes('Not Acceptable')) {
          // Profile 不存在是正常情况，静默返回 null
          return { profile: null, growth: null }
        }
        
        // 记录详细的错误信息（仅当不是空对象时）
        const errorDetails = {
          code: error.code || 'UNKNOWN',
          message: error.message || 'Unknown error',
          details: error.details || null,
          hint: error.hint || null,
          userId: user.id,
          errorType: error.constructor?.name || typeof error,
          errorString: String(error),
        }
        
        // 只有当错误信息不是完全为空时才记录
        const hasActualError = errorDetails.code !== 'UNKNOWN' || 
                              errorDetails.message !== 'Unknown error' ||
                              errorDetails.details !== null ||
                              errorDetails.hint !== null
        
        if (hasActualError) {
          console.error('Error fetching profile with growth:', errorDetails)
        }
        
        return { profile: null, growth: null }
      }

      const coinPaid = data.coin_paid || 0
      const coinFree = data.coin_free || 0
      const totalCoins = (data.yi_coins !== undefined && data.yi_coins !== null) ? data.yi_coins : (coinPaid + coinFree)

      const profile: UserProfile = {
        id: data.id,
        nickname: data.nickname,
        avatar_url: data.avatar_url,
        motto: data.motto,
        role: data.role,
        created_at: data.created_at,
        exp: data.exp,
        reputation: data.reputation,
        yi_coins: totalCoins,
        coin_paid: coinPaid,
        coin_free: coinFree,
        cash_balance: data.cash_balance,
        title_level: data.title_level,
        level: data.level,
        last_checkin_date: data.last_checkin_date,
        consecutive_checkin_days: data.consecutive_checkin_days,
      }

      const growth = {
        exp: data.exp || 0,
        reputation: data.reputation || 0,
        yiCoins: totalCoins,
        cashBalance: parseFloat(data.cash_balance || '0'),
        titleLevel: data.title_level || 1,
        lastCheckinDate: data.last_checkin_date,
        consecutiveCheckinDays: data.consecutive_checkin_days || 0,
      }

      return { profile, growth }
    } catch (error) {
      // 处理意外的错误（非 Supabase 错误）
      let errorInfo: unknown
      
      if (error instanceof Error) {
        errorInfo = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      } else if (typeof error === 'object' && error !== null) {
        // 尝试序列化错误对象
        try {
          errorInfo = {
            type: typeof error,
            stringified: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            raw: error,
          }
        } catch (stringifyError) {
          // 如果序列化失败，使用更安全的方法
          errorInfo = {
            type: typeof error,
            constructor: error.constructor?.name,
            keys: Object.keys(error),
            toString: String(error),
            raw: error,
          }
        }
      } else {
        errorInfo = { 
          raw: error,
          type: typeof error,
          stringified: String(error),
        }
      }
      
      console.error('Unexpected error fetching profile with growth:', {
        userId: user.id,
        error: errorInfo,
      })
      return { profile: null, growth: null }
    } finally {
      // 请求完成后移除
      pendingProfileWithGrowthRequests.delete(requestKey)
    }
  })()

  // 保存请求Promise
  pendingProfileWithGrowthRequests.set(requestKey, requestPromise)
  return requestPromise
}

/**
 * 上传头像到 Supabase Storage
 */
export async function uploadAvatar(file: File): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支持的文件类型，请上传 JPEG、PNG、WebP 或 GIF 格式的图片')
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过 5MB')
    }

    // 生成文件名：userId/timestamp.extension
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    // 上传文件到 avatars bucket
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading avatar:', error)
      // Provide helpful error message for missing bucket
      if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
        throw new Error('存储桶未创建。请在 Supabase Dashboard 中创建 "avatars" 存储桶，或运行数据库迁移。')
      }
      throw error
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error: unknown) {
    console.error('Error uploading avatar:', error)
    throw error
  }
}

/**
 * 更新用户资料
 */
export async function updateUserProfile(updates: {
  nickname?: string
  avatar_url?: string
  motto?: string
}): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const supabase = getSupabaseClient()
  if (!supabase) return false

  try {
    // Filter out undefined values to avoid sending them to the database
    const cleanUpdates: Record<string, string | null> = {}
    if (updates.nickname !== undefined) cleanUpdates.nickname = updates.nickname
    if (updates.avatar_url !== undefined) cleanUpdates.avatar_url = updates.avatar_url
    if (updates.motto !== undefined) cleanUpdates.motto = updates.motto

    const { error } = await supabase
      .from('profiles')
      .update(cleanUpdates)
      .eq('id', user.id)

    if (error) {
      console.error('Error updating profile:', error)
      // Check if it's a schema cache issue (PGRST204)
      if (error.code === 'PGRST204' && error.message?.includes('motto')) {
        console.error('The motto column may not exist in the database. Please run the migration: 20251211_ensure_motto_column.sql')
      }
      return false
    }

    return true
  } catch (error: unknown) {
    console.error('Error updating profile:', error)
    // Check if it's a schema cache issue
    const err = error as { code?: string; message?: string }
    if (err?.code === 'PGRST204' && err?.message?.includes('motto')) {
      console.error('The motto column may not exist in the database. Please run the migration: 20251211_ensure_motto_column.sql')
    }
    return false
  }
}

/**
 * 获取用户统计数据
 */
export async function getUserStats(userId?: string): Promise<UserStats> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      publishedCases: 0,
      participatedDeductions: 0,
      likesReceived: 0,
      accuracyRate: 0,
      verifiedCases: 0,
    }
  }

  // 如果没有提供userId，使用当前登录用户
  let targetUserId = userId
  if (!targetUserId) {
    const user = await getCurrentUser()
    if (!user) {
      return {
        publishedCases: 0,
        participatedDeductions: 0,
        likesReceived: 0,
        accuracyRate: 0,
        verifiedCases: 0,
      }
    }
    targetUserId = user.id
  }

  try {
    // 获取发布案例数（发布的帖子数）
    const { count: publishedCases } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId)

    // 获取参与推演数（推演记录数）
    const { count: participatedDeductions } = await supabase
      .from('divination_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId)

    // 获取获赞同数（用户收到的点赞数）
    const { data: posts } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', targetUserId)

    let likesReceived = 0
    if (posts && posts.length > 0) {
      const postIds = posts.map(p => p.id)
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds)
      likesReceived = count || 0
    }

    // 获取准确率（基于已验证案例）
    // 注意：如果数据库中没有verification_result字段，这部分会返回0
    // 我们使用更安全的方式，先尝试查询，如果失败则使用默认值
    let verifiedCases = 0
    let accuracyRate = 0

    // 由于 verification_result 字段可能不存在，我们使用 try-catch 包裹
    // 并且不直接查询该字段，而是先检查表结构
    // 如果字段不存在，直接返回 0
    try {
      // 尝试查询所有记录，然后检查是否有 verification_result 字段
      const { data: allRecords, error: queryError } = await supabase
        .from('divination_records')
        .select('*')
        .eq('user_id', targetUserId)
        .limit(1)

      // 如果查询成功且第一条记录存在 verification_result 字段
      if (!queryError && allRecords && allRecords.length > 0) {
        const firstRecord = allRecords[0] as { verification_result?: unknown }
        if ('verification_result' in firstRecord) {
          // 字段存在，查询所有有验证结果的记录
          const { data: verifiedRecords } = await supabase
            .from('divination_records')
            .select('verification_result')
            .eq('user_id', targetUserId)
            .not('verification_result', 'is', null)

          if (verifiedRecords && verifiedRecords.length > 0) {
            verifiedCases = verifiedRecords.length
            const accurateCount = verifiedRecords.filter(
              (r: { verification_result?: unknown }) => r.verification_result === true || r.verification_result === 'accurate' || r.verification_result === 1
            ).length
            accuracyRate = Math.round((accurateCount / verifiedRecords.length) * 100)
          }
        }
      }
    } catch (error) {
      // 如果字段不存在或查询失败，忽略错误，使用默认值0
      console.log('verification_result field may not exist, using default values:', error)
    }

    return {
      publishedCases: publishedCases || 0,
      participatedDeductions: participatedDeductions || 0,
      likesReceived,
      accuracyRate,
      verifiedCases: verifiedCases || 0,
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return {
      publishedCases: 0,
      participatedDeductions: 0,
      likesReceived: 0,
      accuracyRate: 0,
      verifiedCases: 0,
    }
  }
}

/**
 * 获取用户关注统计数据（关注数、粉丝数、总发帖数）
 */
export async function getUserFollowStats(userId?: string): Promise<UserFollowStats> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      followingCount: 0,
      followersCount: 0,
      postsCount: 0,
    }
  }

  // 如果没有提供userId，使用当前登录用户
  let targetUserId = userId
  if (!targetUserId) {
    const user = await getCurrentUser()
    if (!user) {
      return {
        followingCount: 0,
        followersCount: 0,
        postsCount: 0,
      }
    }
    targetUserId = user.id
  }

  try {
    // 获取关注数（我关注的人数）
    const { count: followingCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', targetUserId)

    // 获取粉丝数（关注我的人数）
    const { count: followersCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', targetUserId)

    // 获取总发帖数
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId)

    return {
      followingCount: followingCount || 0,
      followersCount: followersCount || 0,
      postsCount: postsCount || 0,
    }
  } catch (error) {
    console.error('Error fetching user follow stats:', error)
    return {
      followingCount: 0,
      followersCount: 0,
      postsCount: 0,
    }
  }
}

/**
 * 检查是否已关注某个用户
 * @param userId 要检查的用户ID
 */
export async function isFollowingUser(userId: string): Promise<boolean> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return false

  const supabase = getSupabaseClient()
  if (!supabase) return false

  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error checking follow status:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking follow status:', error)
    return false
  }
}

/**
 * 关注/取消关注用户
 * @param userId 要关注/取消关注的用户ID
 * @returns 返回操作后的关注状态（true=已关注，false=未关注）
 */
export async function toggleFollowUser(userId: string): Promise<boolean> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    setLoginIntent({ type: 'follow_user', userId, returnTo: getCurrentPathWithSearchAndHash() })
    redirectToLogin()
    throw new Error('请先登录后再操作')
  }

  if (currentUser.id === userId) {
    throw new Error('不能关注自己')
  }

  const res = await fetch(`/api/community/users/${userId}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'toggle' }),
  })

  const json = await res.json().catch(() => null as any)
  if (!res.ok) {
    if (res.status === 401) {
      setLoginIntent({ type: 'follow_user', userId, returnTo: getCurrentPathWithSearchAndHash() })
      redirectToLogin()
    }
    throw new Error(json?.error || '操作失败，请稍后重试')
  }

  return !!json?.following
}

/**
 * 获取我关注的用户列表
 */
export async function getFollowingUsers(limit: number = 50, offset: number = 0): Promise<UserProfile[]> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return []

  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    // 获取关注关系
    const { data: follows, error: followsError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (followsError) {
      console.error('Error fetching following users:', followsError)
      return []
    }

    if (!follows || follows.length === 0) {
      return []
    }

    // 获取用户资料
    const followingIds = follows.map(f => f.following_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followingIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return []
    }

    return (profiles || []) as UserProfile[]
  } catch (error) {
    console.error('Error getting following users:', error)
    return []
  }
}

/**
 * 获取关注我的用户列表（粉丝列表）
 */
export async function getFollowersUsers(limit: number = 50, offset: number = 0): Promise<UserProfile[]> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return []

  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    // 获取关注关系
    const { data: follows, error: followsError } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', currentUser.id)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (followsError) {
      console.error('Error fetching followers:', followsError)
      return []
    }

    if (!follows || follows.length === 0) {
      return []
    }

    // 获取用户资料
    const followerIds = follows.map(f => f.follower_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followerIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return []
    }

    return (profiles || []) as UserProfile[]
  } catch (error) {
    console.error('Error getting followers:', error)
    return []
  }
}

/**
 * 获取用户每日活动数据（用于热力图）
 * 返回过去52周每周的活动次数
 * @param userId 用户ID，如果不提供则使用当前登录用户
 */
export async function getDailyActivityData(userId?: string): Promise<Array<{ week: number; date: string; count: number }>> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  // 如果没有提供userId，使用当前登录用户
  let targetUserId = userId
  if (!targetUserId) {
    const user = await getCurrentUser()
    if (!user) return []
    targetUserId = user.id
  }

  try {
    // 获取过去52周的数据
    const weeksAgo = 52
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeksAgo * 7)

      // 获取用户的推演记录（按创建日期分组）
    const { data: records } = await supabase
      .from('divination_records')
      .select('created_at')
      .eq('user_id', targetUserId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // 获取用户的帖子（按创建日期分组）
    const { data: posts } = await supabase
      .from('posts')
      .select('created_at')
      .eq('user_id', targetUserId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // 获取用户的评论（按创建日期分组）
    const { data: comments } = await supabase
      .from('comments')
      .select('created_at')
      .eq('user_id', targetUserId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // 合并所有活动数据
    const allActivities: Array<{ date: string; count: number }> = []
    
        // 处理推演记录
    records?.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0]
      const existing = allActivities.find(a => a.date === date)
      if (existing) {
        existing.count += 1
      } else {
        allActivities.push({ date, count: 1 })
      }
    })

    // 处理帖子
    posts?.forEach(post => {
      const date = new Date(post.created_at).toISOString().split('T')[0]
      const existing = allActivities.find(a => a.date === date)
      if (existing) {
        existing.count += 1
      } else {
        allActivities.push({ date, count: 1 })
      }
    })

    // 处理评论
    comments?.forEach(comment => {
      const date = new Date(comment.created_at).toISOString().split('T')[0]
      const existing = allActivities.find(a => a.date === date)
      if (existing) {
        existing.count += 1
      } else {
        allActivities.push({ date, count: 1 })
      }
    })

    // 转换为52周格式（每周的活动总数）
    const weeklyData: Array<{ week: number; date: string; count: number }> = []
    const today = new Date()
    
    for (let week = 0; week < weeksAgo; week++) {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - (weeksAgo - week) * 7)
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      // 计算这一周的活动总数
      const weekCount = allActivities.reduce((sum, activity) => {
        const activityDate = new Date(activity.date)
        if (activityDate >= weekStart && activityDate < weekEnd) {
          return sum + activity.count
        }
        return sum
      }, 0)

      weeklyData.push({
        week: week + 1,
        date: weekStart.toISOString().split('T')[0],
        count: weekCount
      })
    }

    return weeklyData
  } catch (error) {
    console.error('Error fetching daily activity data:', error)
    return []
  }
}

/**
 * 获取用户的笔记列表
 */
export async function getUserNotes(searchQuery?: string): Promise<Note[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase
      .from('divination_records')
      .select('id, question, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (searchQuery) {
      query = query.ilike('question', `%${searchQuery}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notes:', error)
      return []
    }

        // 将推演记录转换为笔记格式
    // 注意：divination_records 表没有 updated_at 字段，使用 created_at 作为替代
    return (data || []).map((record: DivinationNoteRow) => ({
      id: record.id,
      title: record.question
        ? record.question.length > 20
          ? record.question.substring(0, 20) + '...'
          : record.question
        : '未命名笔记',
      description: record.question || null,
      question: record.question,
      created_at: record.created_at,
      updated_at: record.created_at, // 使用 created_at 作为 updated_at
    }))
  } catch (error) {
    console.error('Error fetching notes:', error)
    return []
  }
}

export interface DivinationNote {
  id: string
  content: string
  created_at: string
  updated_at: string
}

export interface DivinationRecord {
  id: string
  user_id: string
  question: string | null
  divination_time: string
  method: number
  lines: string[]
  changing_flags: boolean[]
  original_key: string
  changed_key: string
  original_json?: Record<string, unknown>
  changed_json?: Record<string, unknown>
  created_at: string
  note?: string | null
  notes?: DivinationNote[]
}

export interface DivinationNoteRow {
  id: string
  question: string | null
  created_at: string
}

/**
 * 保存排盘记录到云端
 */
export async function saveDivinationRecord(payload: {
  question: string
  divinationTimeISO: string
  divinationMethod: number
  lines: string[]
  changingFlags: boolean[]
  note?: string
  result: {
    originalKey: string
    changedKey: string
    original: Record<string, unknown>
    changed: Record<string, unknown>
  }
}): Promise<{ success: boolean; message: string; recordId?: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 直接保存原始格式，不要转换
    // 规则：
    // - '-----' = 少阳（阳爻，静）
    // - '-- --' = 少阴（阴爻，静）
    // - '---X---' = 老阴（阴爻，动）
    // - '---O---' = 老阳（阳爻，动）
    // 必须保留动爻标记（X和O），不能转换为静爻格式
    const linesArray = payload.lines

    const { data, error } = await supabase
      .from('divination_records')
      .insert({
        user_id: user.id,
        question: payload.question || null,
        divination_time: payload.divinationTimeISO,
        method: payload.divinationMethod,
        lines: linesArray,
        changing_flags: payload.changingFlags,
        original_key: payload.result.originalKey,
        changed_key: payload.result.changedKey,
        original_json: payload.result.original || {},
        changed_json: payload.result.changed || {},
        note: payload.note || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error saving divination record:', error)
      return { success: false, message: '保存失败：' + (error.message || '未知错误') }
    }

    return { 
      success: true, 
      message: '保存成功', 
      recordId: data?.id 
    }
  } catch (error: unknown) {
    console.error('Error saving divination record:', error)
    const err = error as { message?: string }
    return { success: false, message: '保存失败：' + (err.message || '未知错误') }
  }
}

/**
 * 删除排盘记录
 */
export async function deleteDivinationRecord(recordId: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 先检查是否有帖子引用该排盘，避免触发外键报错
    const { count: referencingPosts, error: countError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('divination_record_id', recordId)

    if (countError) {
      console.error('Error checking post references before delete:', countError)
      return { success: false, message: '删除失败：无法检查引用关系，请稍后重试' }
    }

    if ((referencingPosts || 0) > 0) {
      return { success: false, message: '该排盘已关联帖子，请先删除或编辑帖子后再尝试删除排盘' }
    }

    const { error } = await supabase
      .from('divination_records')
      .delete()
      .eq('id', recordId)
      .eq('user_id', user.id) // 确保只能删除自己的记录

    if (error) {
      console.error('Error deleting divination record:', error)
      const err = error as { message?: string; hint?: string }
      const message = err?.message || err?.hint || '未知错误'
      return { success: false, message: '删除失败：' + message }
    }

    return { success: true, message: '删除成功' }
  } catch (error: unknown) {
    console.error('Error deleting divination record:', error)
    const err = error as { message?: string }
    return { success: false, message: '删除失败：' + (err.message || '未知错误') }
  }
}

/**
 * 批量删除排盘记录
 */
export async function deleteDivinationRecords(recordIds: string[]): Promise<{ 
  success: boolean; 
  message: string;
  deletedCount: number;
  failedIds: string[];
}> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录', deletedCount: 0, failedIds: recordIds }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误', deletedCount: 0, failedIds: recordIds }
  }

  if (recordIds.length === 0) {
    return { success: false, message: '请选择要删除的记录', deletedCount: 0, failedIds: [] }
  }

  try {
    // 先检查哪些排盘有帖子引用
    const { data: referencedRecords, error: checkError } = await supabase
      .from('posts')
      .select('divination_record_id')
      .in('divination_record_id', recordIds)

    if (checkError) {
      console.error('Error checking post references:', checkError)
      return { success: false, message: '删除失败：无法检查引用关系', deletedCount: 0, failedIds: recordIds }
    }

    // 找出被引用的记录ID
    const referencedIds = new Set(referencedRecords?.map(r => r.divination_record_id).filter(Boolean) || [])
    
    // 可以删除的记录ID
    const deletableIds = recordIds.filter(id => !referencedIds.has(id))
    
    if (deletableIds.length === 0) {
      return { 
        success: false, 
        message: '所选记录均已关联帖子，无法删除', 
        deletedCount: 0, 
        failedIds: recordIds 
      }
    }

    // 批量删除未被引用的记录
    const { error: deleteError } = await supabase
      .from('divination_records')
      .delete()
      .in('id', deletableIds)
      .eq('user_id', user.id) // 确保只能删除自己的记录

    if (deleteError) {
      console.error('Error deleting divination records:', deleteError)
      return { 
        success: false, 
        message: '删除失败：' + (deleteError.message || '未知错误'), 
        deletedCount: 0, 
        failedIds: recordIds 
      }
    }

    const failedIds = Array.from(referencedIds)
    const deletedCount = deletableIds.length

    if (failedIds.length > 0) {
      return {
        success: true,
        message: `成功删除 ${deletedCount} 条记录，${failedIds.length} 条记录因关联帖子无法删除`,
        deletedCount,
        failedIds
      }
    }

    return { 
      success: true, 
      message: `成功删除 ${deletedCount} 条记录`, 
      deletedCount,
      failedIds: [] 
    }
  } catch (error: unknown) {
    console.error('Error deleting divination records:', error)
    const err = error as { message?: string }
    return { 
      success: false, 
      message: '删除失败：' + (err.message || '未知错误'), 
      deletedCount: 0, 
      failedIds: recordIds 
    }
  }
}

/**
 * 获取排盘记录的完整数据（用于跳转到结果页）
 * @param recordId 记录 ID
 * @param requireOwnership 是否要求是记录的所有者（默认 true，用于个人中心；false 用于公开访问，如从帖子跳转）
 */
export async function getDivinationRecordById(recordId: string, requireOwnership: boolean = true): Promise<DivinationRecord | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    let query = supabase
      .from('divination_records')
      .select('*')
      .eq('id', recordId)
    
    // 如果需要所有权验证，添加 user_id 过滤
    if (requireOwnership) {
      const user = await getCurrentUser()
      if (!user) return null
      query = query.eq('user_id', user.id)
    }
    
    const { data, error } = await query.single()

    if (error) {
      console.error('Error fetching divination record:', error)
      return null
    }

    return data as DivinationRecord
  } catch (error) {
    console.error('Error fetching divination record:', error)
    return null
  }
}

/**
 * 获取用户的排盘记录
 */
export async function getUserDivinationRecords(limit: number = 50): Promise<DivinationRecord[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('divination_records')
      .select('id, question, divination_time, method, lines, changing_flags, original_key, changed_key, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching divination records:', error)
      return []
    }

    return (data || []) as DivinationRecord[]
  } catch (error) {
    console.error('Error fetching divination records:', error)
    return []
  }
}

/**
 * 获取排盘记录的所有笔记
 */
export async function getDivinationNotes(recordId: string): Promise<DivinationNote[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('divination_notes')
      .select('*')
      .eq('divination_record_id', recordId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching divination notes:', error)
      return []
    }

    return (data || []) as DivinationNote[]
  } catch (error) {
    console.error('Error fetching divination notes:', error)
    return []
  }
}

/**
 * 添加排盘记录笔记
 */
export async function addDivinationNote(recordId: string, content: string): Promise<{ success: boolean; message: string; note?: DivinationNote }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    const { data, error } = await supabase
      .from('divination_notes')
      .insert({
        user_id: user.id,
        divination_record_id: recordId,
        content: content
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error adding divination note:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return { success: false, message: '添加失败：' + (error.message || '未知错误') }
    }

    return { success: true, message: '添加成功', note: data as DivinationNote }
  } catch (error: unknown) {
    console.error('Error adding divination note:', error)
    const err = error as { message?: string }
    return { success: false, message: '添加失败：' + (err.message || '未知错误') }
  }
}

/**
 * 更新排盘记录笔记
 */
export async function updateDivinationNote(noteId: string, content: string): Promise<{ success: boolean; message: string; note?: DivinationNote }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    const { data, error } = await supabase
      .from('divination_notes')
      .update({ content: content })
      .eq('id', noteId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating divination note:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return { success: false, message: '更新失败：' + (error.message || '未知错误') }
    }

    return { success: true, message: '更新成功', note: data as DivinationNote }
  } catch (error: unknown) {
    console.error('Error updating divination note:', error)
    const err = error as { message?: string }
    return { success: false, message: '更新失败：' + (err.message || '未知错误') }
  }
}

/**
 * 删除排盘记录笔记
 */
export async function deleteDivinationNote(noteId: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    const { error } = await supabase
      .from('divination_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting divination note:', error)
      return { success: false, message: '删除失败：' + (error.message || '未知错误') }
    }

    return { success: true, message: '删除成功' }
  } catch (error: unknown) {
    console.error('Error deleting divination note:', error)
    const err = error as { message?: string }
    return { success: false, message: '删除失败：' + (err.message || '未知错误') }
  }
}

/**
 * 保存八字排盘记录到云端
 */
export async function saveBaZiRecord(payload: {
  name?: string
  gender: 'male' | 'female'
  dateISO: string
  trueSolarDateISO?: string
  hour?: string
  minute?: string
  city?: string
  solarTimeCorrection?: boolean
  earlyZiHour?: boolean
  result: Record<string, unknown>
}): Promise<{ success: boolean; message: string; recordId?: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 将bazi数据保存到divination_records表，使用method=1表示bazi，将数据存储在original_json中
    const { data, error } = await supabase
      .from('divination_records')
      .insert({
        user_id: user.id,
        question: payload.name || null,
        divination_time: payload.dateISO,
        method: 1, // 1表示bazi排盘
        lines: [], // bazi不需要lines
        changing_flags: [], // bazi不需要changing_flags
        original_key: 'bazi', // 标识为bazi
        changed_key: 'bazi',
        original_json: {
          name: payload.name,
          gender: payload.gender,
          dateISO: payload.dateISO,
          trueSolarDateISO: payload.trueSolarDateISO,
          hour: payload.hour,
          minute: payload.minute,
          city: payload.city,
          solarTimeCorrection: payload.solarTimeCorrection,
          earlyZiHour: payload.earlyZiHour,
          result: payload.result,
        },
        changed_json: {},
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error saving bazi record:', error)
      return { success: false, message: '保存失败：' + (error.message || '未知错误') }
    }

    return { 
      success: true, 
      message: '保存成功', 
      recordId: data?.id 
    }
  } catch (error: unknown) {
    console.error('Error saving bazi record:', error)
    const err = error as { message?: string }
    return { success: false, message: '保存失败：' + (err.message || '未知错误') }
  }
}

/**
 * 获取八字排盘记录
 */
export async function getBaZiRecordById(recordId: string, requireOwnership: boolean = true): Promise<{
  id: string
  user_id: string
  name: string | null
  dateISO: string
  gender: 'male' | 'female'
  trueSolarDateISO?: string
  hour?: string
  minute?: string
  city?: string
  solarTimeCorrection?: boolean
  earlyZiHour?: boolean
  result: Record<string, unknown>
  created_at: string
} | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    let query = supabase
      .from('divination_records')
      .select('*')
      .eq('id', recordId)
      .eq('method', 1) // 只查询bazi记录
    
    // 如果需要所有权验证，添加 user_id 过滤
    if (requireOwnership) {
      const user = await getCurrentUser()
      if (!user) return null
      query = query.eq('user_id', user.id)
    }
    
    const { data, error } = await query.single()

    if (error) {
      console.error('Error fetching bazi record:', error)
      return null
    }

    if (!data) return null

    const originalJson = typeof data.original_json === 'string' 
      ? JSON.parse(data.original_json) 
      : data.original_json || {}

    return {
      id: data.id,
      user_id: data.user_id,
      name: data.question || originalJson.name || null,
      dateISO: data.divination_time,
      gender: originalJson.gender || 'male',
      trueSolarDateISO: originalJson.trueSolarDateISO,
      hour: originalJson.hour,
      minute: originalJson.minute,
      city: originalJson.city,
      solarTimeCorrection: originalJson.solarTimeCorrection,
      earlyZiHour: originalJson.earlyZiHour,
      result: originalJson.result || {},
      created_at: data.created_at,
    }
  } catch (error) {
    console.error('Error fetching bazi record:', error)
    return null
  }
}

/**
 * 更新八字排盘记录的姓名
 */
export async function updateBaZiName(recordId: string, name: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 先获取当前记录
    const { data: record, error: fetchError } = await supabase
      .from('divination_records')
      .select('original_json')
      .eq('id', recordId)
      .eq('user_id', user.id)
      .eq('method', 1)
      .single()

    if (fetchError || !record) {
      return { success: false, message: '记录不存在或无权访问' }
    }

    // 更新question字段（存储name）和original_json中的name
    const originalJson = typeof record.original_json === 'string'
      ? JSON.parse(record.original_json)
      : record.original_json || {}

    const updatedJson = {
      ...originalJson,
      name: name,
    }

    const { error } = await supabase
      .from('divination_records')
      .update({ 
        question: name || null,
        original_json: updatedJson
      })
      .eq('id', recordId)
      .eq('user_id', user.id)
      .eq('method', 1)

    if (error) {
      console.error('Error updating bazi name:', error)
      return { success: false, message: '更新失败：' + (error.message || '未知错误') }
    }

    return { success: true, message: '更新成功' }
  } catch (error: unknown) {
    console.error('Error updating bazi name:', error)
    const err = error as { message?: string }
    return { success: false, message: '更新失败：' + (err.message || '未知错误') }
  }
}

/**
 * 更新排盘记录的问题描述
 */
export async function updateDivinationQuestion(recordId: string, question: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    const { error } = await supabase
      .from('divination_records')
      .update({ question: question })
      .eq('id', recordId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating divination question:', error)
      return { success: false, message: '更新失败：' + (error.message || '未知错误') }
    }

    return { success: true, message: '更新成功' }
  } catch (error: unknown) {
    console.error('Error updating divination question:', error)
    const err = error as { message?: string }
    return { success: false, message: '更新失败：' + (err.message || '未知错误') }
  }
}

/**
 * 更新排盘记录的笔记 (Deprecated: Use updateDivinationNote or addDivinationNote instead)
 */
export async function updateDivinationRecordNote(recordId: string, note: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    const { error } = await supabase
      .from('divination_records')
      .update({ note: note || null })
      .eq('id', recordId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating divination note:', error)
      return { success: false, message: '更新失败：' + (error.message || '未知错误') }
    }

    return { success: true, message: '更新成功' }
  } catch (error: unknown) {
    console.error('Error updating divination note:', error)
    const err = error as { message?: string }
    return { success: false, message: '更新失败：' + (err.message || '未知错误') }
  }
}
