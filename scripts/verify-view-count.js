async function runTest() {
  const [{ createClient }, fs, path] = await Promise.all([
    import('@supabase/supabase-js'),
    import('node:fs'),
    import('node:path'),
  ])

  const loadEnv = () => {
    try {
      const envPath = path.resolve(__dirname, '../.env.local')
      if (!fs.existsSync(envPath)) {
        console.warn('Warning: .env.local not found at ' + envPath)
        return {}
      }
      const content = fs.readFileSync(envPath, 'utf8')
      const env = {}
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([^#=]+)=(.+)$/)
        if (match) {
          const key = match[1].trim()
          let value = match[2].trim()
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1)
          }
          env[key] = value
        }
      })
      return env
    } catch (e) {
      console.error('Error loading .env.local:', e)
      return {}
    }
  }

  const env = loadEnv()
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    console.error('Please ensure web/.env.local exists or set environment variables.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  console.log('🚀 Starting concurrency test for view count...');
  console.log(`Target Supabase: ${SUPABASE_URL}`);

  // 1. 获取一个测试帖子
  const { data: posts, error: fetchError } = await supabase
    .from('posts')
    .select('id, view_count')
    .limit(1);

  if (fetchError) {
    console.error('❌ Failed to fetch a post for testing:', fetchError.message);
    return;
  }
  
  if (!posts || posts.length === 0) {
    console.error('❌ No posts found in database to test.');
    return;
  }

  const post = posts[0];
  const postId = post.id;
  const initialViewCount = post.view_count || 0;
  
  console.log(`\n📋 Testing with Post ID: ${postId}`);
  console.log(`🔢 Initial View Count: ${initialViewCount}`);

  // 2. 并发请求
  const REQUEST_COUNT = 20; // 并发数
  console.log(`\n⚡ Sending ${REQUEST_COUNT} concurrent RPC requests...`);
  
  const startTime = Date.now();
  const promises = [];
  for (let i = 0; i < REQUEST_COUNT; i++) {
    promises.push(
      supabase.rpc('increment_post_view_count', { post_id: postId })
        .then(({ error }) => {
          if (error) throw error;
          return true;
        })
    );
  }
  
  try {
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    console.log(`✅ All requests completed in ${duration}ms`);
  } catch (err) {
    console.error('❌ Error during concurrent requests:', err);
    return;
  }
  
  // 3. 验证结果
  // 给一点时间让数据库落盘（虽然RPC应该是即时的，但为了稳妥）
  await new Promise(resolve => setTimeout(resolve, 500));

  const { data: updatedPost, error: verifyError } = await supabase
    .from('posts')
    .select('view_count')
    .eq('id', postId)
    .single();

  if (verifyError) {
    console.error('❌ Failed to fetch updated post:', verifyError.message);
    return;
  }

  const finalViewCount = updatedPost.view_count;
  console.log(`\n🔢 Final View Count: ${finalViewCount}`);
  
  const expectedViewCount = initialViewCount + REQUEST_COUNT;
  const actualIncrement = finalViewCount - initialViewCount;
  
  console.log(`\n📊 Results:`);
  console.log(`   Expected Increment: ${REQUEST_COUNT}`);
  console.log(`   Actual Increment:   ${actualIncrement}`);
  console.log(`   Expected Final:     ${expectedViewCount}`);
  
  if (actualIncrement === REQUEST_COUNT) {
    console.log('\n✅ TEST PASSED: View count incremented accurately under concurrency.');
  } else if (actualIncrement > REQUEST_COUNT) {
     console.log('\n⚠️  TEST INCONCLUSIVE: Count increased MORE than expected. Other users might be viewing the post?');
  } else {
    console.error(`\n❌ TEST FAILED: Lost ${REQUEST_COUNT - actualIncrement} updates.`);
  }
}

runTest();
