import { cn } from '@/lib/utils/cn';

interface IconProps {
  className?: string;
}

// 金：圆形方孔钱 / 坚硬矿石的抽象，带有一抹光泽
export const MetalIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-4 h-4", className)} xmlns="http://www.w3.org/2000/svg">
    {/* 使用 path 的 fill-rule="evenodd" 创建圆形方孔钱 */}
    <path 
      d="M12 2 A10 10 0 0 1 22 12 A10 10 0 0 1 12 22 A10 10 0 0 1 2 12 A10 10 0 0 1 12 2 Z M9 9 L15 9 L15 15 L9 15 Z" 
      fillRule="evenodd"
      fillOpacity="0.8"
    />
    {/* 光泽效果 - 右上角高光 */}
    <circle cx="14" cy="8" r="2.5" fill="white" fillOpacity="0.3" />
  </svg>
);

// 木：向上生长的嫩芽/竹叶
export const WoodIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-4 h-4", className)} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 12 14 12 10C12 6 15 2 19 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M12 10C12 10 9 6 5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M19 2C16 2 14 4 14 8C14 11 16 12 19 12C21 10 21 6 19 2Z" fillOpacity="0.6"/>
    <path d="M5 6C8 6 9 8 9 10C9 12 7 14 5 14C3 12 3 9 5 6Z" fillOpacity="0.6"/>
  </svg>
);

// 水：流动的水滴/太极鱼的意象
export const WaterIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-4 h-4", className)} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L12.65 2.8C14.7 5.5 18 9.5 18 13.5C18 17.1 15.3 20 12 20C8.7 20 6 17.1 6 13.5C6 9.5 9.3 5.5 11.35 2.8L12 2Z" fillOpacity="0.8"/>
    <path d="M10 12C10 12 10 15 12 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);

// 火：向上的三昧真火
export const FireIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-4 h-4", className)} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C10 5 8 7 8 11C8 13 9 14 9 14C7 13 6 11 6 10C5 12 5 14 6 16C7.5 19 10 21 12 21C16 21 19 17 19 13C19 9 15 6 12 2Z" fillOpacity="0.8"/>
    <path d="M12 12C12 12 12.5 14 14 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
  </svg>
);

// 土：稳固的群山/磐石
export const EarthIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-4 h-4", className)} xmlns="http://www.w3.org/2000/svg">
    <path d="M2 18H22L16 8L12 14L9 10L2 18Z" fillOpacity="0.8"/>
    <path d="M4 18L9 10L13 15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
  </svg>
);
