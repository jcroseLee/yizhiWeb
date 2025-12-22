# 修复 "Bucket not found" 错误

## ⚠️ 错误说明

如果遇到 `StorageApiError: Bucket not found` 错误，说明 Supabase Storage 中缺少必需的存储桶。

## 问题原因

Web 应用需要以下存储桶才能正常工作：
- `avatars` - 用于存储用户头像
- `posts` - 用于存储帖子图片和封面图

## 解决方法

### 方法 1：使用 Supabase CLI 应用迁移（推荐）

如果你使用 Supabase CLI 管理数据库，运行以下命令：

```bash
cd supabase
supabase db push
```

或者直接应用所有迁移：

```bash
supabase migration up
```

这将自动创建所有必需的存储桶和存储策略。

### 方法 2：在 Supabase Dashboard 中手动创建

#### 步骤 1：创建 avatars 存储桶

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Storage** 页面
4. 点击 **New bucket**
5. 设置以下配置：
   - **Name**: `avatars`
   - **Public bucket**: ✅ 启用（允许公开访问）
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

6. 点击 **Create bucket**

#### 步骤 2：创建 posts 存储桶

重复步骤 1，但使用以下配置：
   - **Name**: `posts`
   - **Public bucket**: ✅ 启用
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

#### 步骤 3：设置存储策略（Storage Policies）

创建存储桶后，需要在 **Storage** > **Policies** 中设置访问策略。

**对于 avatars 存储桶：**

在 SQL Editor 中执行以下 SQL：

```sql
-- 允许认证用户上传自己的头像
CREATE POLICY "avatars_upload_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许认证用户更新自己的头像
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许认证用户删除自己的头像
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许公开读取
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

**对于 posts 存储桶：**

```sql
-- 允许认证用户上传自己的帖子图片
CREATE POLICY "posts_upload_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许认证用户更新自己的帖子图片
CREATE POLICY "posts_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许认证用户删除自己的帖子图片
CREATE POLICY "posts_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许公开读取
CREATE POLICY "posts_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');
```

### 方法 3：使用 SQL 脚本快速创建

在 Supabase Dashboard 的 **SQL Editor** 中执行以下脚本：

```sql
-- 创建 avatars 存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 创建 posts 存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts',
  'posts',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "avatars_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "posts_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "posts_update_own" ON storage.objects;
DROP POLICY IF EXISTS "posts_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "posts_select_public" ON storage.objects;

-- 创建 avatars 策略
CREATE POLICY "avatars_upload_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 创建 posts 策略
CREATE POLICY "posts_upload_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "posts_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "posts_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "posts_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');
```

## 验证

创建存储桶后，可以通过以下方式验证：

1. 在 Supabase Dashboard 的 **Storage** 页面，应该能看到 `avatars` 和 `posts` 两个存储桶
2. 尝试在应用中上传头像或帖子图片，应该不再出现 "Bucket not found" 错误

## 相关迁移文件

存储桶的迁移文件位于：
- `supabase/migrations/20250126_create_avatars_bucket.sql`
- `supabase/migrations/20250203_create_posts_bucket.sql`

如果使用 Supabase CLI，这些迁移会在运行 `supabase db push` 时自动应用。

