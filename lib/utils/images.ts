/**
 * 图片资源路径工具函数
 * 统一管理项目中使用的图片路径
 */

const IMAGE_BASE_PATH = '/images'

/**
 * 获取图片完整路径
 */
export function getImagePath(category: string, filename: string): string {
  return `${IMAGE_BASE_PATH}/${category}/${filename}`
}

/**
 * 背景图片路径
 */
export const backgroundImages = {
  main: getImagePath('backgrounds', 'bg.png'),
  top: getImagePath('backgrounds', 'topbg.png'),
  paper: getImagePath('backgrounds', 'paper-texture.png'),
} as const

/**
 * 图标图片路径
 */
export const iconImages = {
  home: getImagePath('icons', 'home.png'),
  community: getImagePath('icons', 'community.png'),
  message: getImagePath('icons', 'message.png'),
  my: getImagePath('icons', 'my.png'),
  masters: getImagePath('icons', 'masters.png'),
} as const

/**
 * 卦象相关图片路径
 */
export const hexagramImages = {
  coin: getImagePath('hexagram', 'coin.png'),
  coinReverse: getImagePath('hexagram', 'coin-reverse.png'),
  guashi: getImagePath('hexagram', 'guashi.png'),
} as const

/**
 * 插画图片路径
 */
export const illustrationImages = {
  baishan: getImagePath('illustrations', 'baishan.png'),
  cherryBlossom: getImagePath('illustrations', 'cherry-blossom.png'),
  yu: getImagePath('illustrations', 'yu.png'),
} as const

/**
 * Logo 图片路径
 */
export const logoImages = {
  main: getImagePath('logos', 'logo.png'),
} as const

/**
 * 使用示例：
 * 
 * import { iconImages, backgroundImages } from '@/lib/utils/images'
 * import Image from 'next/image'
 * 
 * <Image src={iconImages.home} alt="首页" width={24} height={24} />
 * <div style={{ backgroundImage: `url(${backgroundImages.main})` }} />
 */

