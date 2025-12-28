import { NextResponse } from 'next/server';
// 确保路径正确导入你的服务函数
import { createCustomTag, getTags, setPostTags } from '@/lib/services/community';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const results: Record<string, any> = {};
  const supabase = await createClient();

  try {
    // --- 准备工作：获取一个测试用户和帖子 ---
    // (为了测试 BE-05，我们需要一个真实的 postId)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("请先登录一个账号再访问此测试接口");
    
    const { data: post } = await supabase.from('posts').select('id').eq('user_id', user.id).limit(1).single();
    if (!post) throw new Error("当前用户没有帖子，无法测试 BE-05");


    // ==========================================
    // BE-01: 获取标签列表 (Subject)
    // ==========================================
    console.log('Testing BE-01...');
    const subjectTags = await getTags({ category: 'subject' }, supabase);
    const hasTechnique = subjectTags.some((t: any) => t.category === 'technique');
    results['BE-01'] = {
      passed: subjectTags.length > 0 && !hasTechnique,
      details: `获取到 ${subjectTags.length} 个 Subject 标签`
    };


    // ==========================================
    // BE-02: 获取标签列表 - Scope 过滤
    // ==========================================
    console.log('Testing BE-02...');
    const liuyaoTags = await getTags({ scope: 'liuyao' }, supabase);
    const hasOtherScope = liuyaoTags.some((t: any) => t.scope !== 'liuyao');
    results['BE-02'] = {
      passed: liuyaoTags.length > 0 && !hasOtherScope,
      details: `获取到 ${liuyaoTags.length} 个 Liuyao 标签`
    };


    // ==========================================
    // BE-03 & BE-04: 创建自定义标签 (正常 & 重复)
    // ==========================================
    console.log('Testing BE-03 & BE-04...');
    const uniqueName = `Test_${Date.now().toString().slice(-6)}`;
    
    // 第一次创建
    const newTag = await createCustomTag({ name: uniqueName }, supabase);
    
    // 第二次创建 (测试重复)
    let duplicateError = null;
    try {
      await createCustomTag({ name: uniqueName }, supabase);
    } catch (e: any) {
      duplicateError = e.message;
    }

    results['BE-03_04'] = {
      passed: newTag && newTag.category === 'custom',
      duplicate_test: duplicateError ? '拦截成功' : '未拦截或返回了旧ID (视具体实现而定)',
      created_tag: newTag
    };


    // ==========================================
    // BE-05: 设置帖子标签
    // ==========================================
    console.log('Testing BE-05...');
    // 使用刚才创建的标签 + 一个现有的标签(假设 ID 存在，或者你可以先查一个)
    if (newTag?.id) {
        await setPostTags(post.id, [newTag.id], supabase);
        
        // 验证结果：查库看是否关联成功
        const { data: checkPost } = await supabase.from('posts').select('tags').eq('id', post.id).single();
        
        results['BE-05'] = {
            passed: checkPost?.tags?.includes(uniqueName),
            current_post_tags: checkPost?.tags
        };
    } else {
        results['BE-05'] = { passed: false, reason: '依赖 BE-03 失败' };
    }


    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
