'use client'

// --- 样式补丁：宣纸纹理和树状图连接线 ---
const styles = `
  .paper-texture {
    background-color: #F9F7F2;
    background-image: 
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* 树状连接线 */
  .tree-line {
    position: relative;
  }
  .tree-line::before {
    content: '';
    position: absolute;
    left: 0.6875rem; /* 对齐图标中心 */
    top: 0;
    bottom: 0;
    width: 0.0625rem;
    background-color: #e5e5e5;
    z-index: 0;
  }
  .tree-line:last-child::before {
    height: 1rem; /* 最后一项只连到一半 */
  }
  
  /* 子节点水平连接线 */
  .tree-branch {
    position: relative;
  }
  .tree-branch::after {
    content: '';
    position: absolute;
    left: -0.75rem; /* 连接到父级垂直线 */
    top: 50%;
    width: 0.75rem;
    height: 0.0625rem;
    background-color: #e5e5e5;
  }
`

export function WikiStyles() {
  return <style jsx global>{styles}</style>
}
