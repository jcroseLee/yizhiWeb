'use client'

import Image from 'next/image'
import { iconImages, backgroundImages, hexagramImages } from '@/lib/utils/images'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/lib/components/ui/card'

/**
 * 图片使用示例组件
 * 展示如何在项目中使用图片资源
 */
export function ImageExample() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>图片资源使用示例</CardTitle>
          <CardDescription>
            展示如何在项目中使用统一管理的图片资源
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 使用 Next.js Image 组件（推荐） */}
          <div>
            <h3 className="text-lg font-semibold mb-4">图标图片</h3>
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <Image
                  src={iconImages.home}
                  alt="首页"
                  width={32}
                  height={32}
                  className="opacity-80"
                />
                <span className="text-xs text-muted-foreground">首页</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Image
                  src={iconImages.community}
                  alt="社区"
                  width={32}
                  height={32}
                  className="opacity-80"
                />
                <span className="text-xs text-muted-foreground">社区</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Image
                  src={iconImages.message}
                  alt="消息"
                  width={32}
                  height={32}
                  className="opacity-80"
                />
                <span className="text-xs text-muted-foreground">消息</span>
              </div>
            </div>
          </div>

          {/* 卦象图片 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">卦象图片</h3>
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <Image
                  src={hexagramImages.coin}
                  alt="硬币正面"
                  width={48}
                  height={48}
                />
                <span className="text-xs text-muted-foreground">硬币正面</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Image
                  src={hexagramImages.coinReverse}
                  alt="硬币反面"
                  width={48}
                  height={48}
                />
                <span className="text-xs text-muted-foreground">硬币反面</span>
              </div>
            </div>
          </div>

          {/* 背景图片示例 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">背景图片</h3>
            <div
              className="h-32 rounded-lg bg-cover bg-center flex items-center justify-center"
              style={{
                backgroundImage: `url(${backgroundImages.main})`,
              }}
            >
              <p className="text-white font-semibold">背景图片示例</p>
            </div>
          </div>

          {/* 代码示例 */}
          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-semibold mb-2">代码示例：</h4>
            <pre className="text-sm overflow-x-auto">
              <code>{`import Image from 'next/image'
import { iconImages } from '@/lib/utils/images'

<Image
  src={iconImages.home}
  alt="首页"
  width={32}
  height={32}
/>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

