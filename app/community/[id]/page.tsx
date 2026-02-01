import { getPostComments } from '@/lib/services/comments'
import { getPost, getRelatedPosts } from '@/lib/services/community'
import { calculateLevel } from '@/lib/services/growth'
import { getUserProfile } from '@/lib/services/profile'
import { getWalletBalance } from '@/lib/services/wallet'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PostDetailClient from './PostDetailClient'

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params
  const supabase = await createClient()

  // 1. Get current user (for permissions and personalization)
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Fetch Post
  const post = await getPost(postId, { supabase })
  if (!post) {
    notFound()
  }

  // 3. Fetch other data in parallel
  const [comments, relatedPosts, userProfile, walletBalanceResult] = await Promise.all([
    getPostComments(supabase, postId, user?.id),
    getRelatedPosts(postId, 5, { supabase }),
    getUserProfile({ supabase }),
    user?.id ? getWalletBalance(user.id, supabase) : Promise.resolve(null)
  ])

  const walletBalance = walletBalanceResult?.total ?? 0

  // 4. Fetch Author Stats if post has author
  let authorStats = null
  if (post.author?.id) {
    const [postsCountResult, collectionsCountResult, profileResult] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', post.author.id),
      supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('user_id', post.author.id),
      supabase.from('profiles').select('exp, yi_coins').eq('id', post.author.id).single()
    ])

    authorStats = {
      posts: postsCountResult.count || 0,
      collections: collectionsCountResult.count || 0,
      coins: profileResult.data?.yi_coins || 0,
      level: calculateLevel(profileResult.data?.exp || 0),
    }
  }

  return (
    <PostDetailClient
      postId={postId}
      initialPost={post}
      initialComments={comments}
      initialRelatedPosts={relatedPosts}
      initialUserProfile={userProfile}
      initialAuthorStats={authorStats}
      initialWalletBalance={walletBalance}
    />
  )
}
