/**
 * 草稿功能数据库诊断工具
 * 在浏览器控制台运行此函数来检查数据库状态
 */
export async function diagnoseDraftFeature() {
  console.log('🔍 开始诊断草稿功能...\n')
  
  try {
    // 动态导入 Supabase 客户端
    const { getSupabaseClient } = await import('@/lib/services/supabaseClient')
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      console.error('❌ Supabase 客户端未初始化')
      return
    }
    
    console.log('✅ Supabase 客户端已初始化\n')
    
    // 检查 status 字段是否存在
    console.log('📋 检查 posts 表结构...')
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'posts' AND column_name = 'status'
      `
    })
    
    if (columnsError) {
      // 如果 RPC 不可用，尝试直接查询
      console.log('⚠️  无法使用 RPC，尝试其他方法...')
      
      // 尝试插入一个测试记录（会失败但能告诉我们字段是否存在）
      const { error: testError } = await supabase
        .from('posts')
        .insert({
          title: 'TEST_DRAFT_CHECK',
          content: 'test',
          status: 'draft',
        })
        .select()
        .limit(0) // 不返回数据
      
      if (testError) {
        const errorMsg = testError.message || ''
        if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
          console.error('❌ status 字段不存在！')
          console.error('📝 错误信息:', errorMsg)
          console.log('\n🔧 解决方案:')
          console.log('1. 打开 Supabase Dashboard')
          console.log('2. 进入 SQL Editor')
          console.log('3. 执行迁移文件: supabase/migrations/20250223_add_draft_status_to_posts.sql')
          console.log('\n或者直接执行以下 SQL:')
          console.log(`
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' 
  CHECK (status IN ('published', 'draft', 'archived'));

UPDATE public.posts SET status = 'published' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_status_user_created 
  ON public.posts(user_id, status, created_at DESC);
          `)
          return
        } else {
          console.error('❌ 其他错误:', testError)
          return
        }
      } else {
        console.log('✅ status 字段存在！')
      }
    } else {
      if (columns && columns.length > 0) {
        console.log('✅ status 字段存在:', columns[0])
      } else {
        console.error('❌ status 字段不存在！')
        console.log('\n🔧 请运行数据库迁移')
        return
      }
    }
    
    // 检查 RLS 策略
    console.log('\n📋 检查 RLS 策略...')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'posts')
      .eq('policyname', 'posts_select_published_or_own')
    
    if (policiesError) {
      console.warn('⚠️  无法检查策略（可能需要管理员权限）')
    } else if (policies && policies.length > 0) {
      console.log('✅ RLS 策略已配置:', policies[0])
    } else {
      console.warn('⚠️  RLS 策略可能未配置')
    }
    
    // 检查索引
    console.log('\n📋 检查索引...')
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'posts')
      .eq('indexname', 'idx_posts_status_user_created')
    
    if (indexesError) {
      console.warn('⚠️  无法检查索引（可能需要管理员权限）')
    } else if (indexes && indexes.length > 0) {
      console.log('✅ 索引已创建')
    } else {
      console.warn('⚠️  索引可能未创建（不影响功能，但可能影响性能）')
    }
    
    console.log('\n✅ 诊断完成！')
    console.log('💡 如果所有检查都通过，请尝试保存草稿功能')
    
  } catch (error) {
    console.error('❌ 诊断过程中出错:', error)
  }
}

// 在浏览器控制台运行: diagnoseDraftFeature()

