export const styles = `
  .input-clean {
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
  }
  .input-clean:focus {
    box-shadow: none;
    outline: none;
  }
  
  .custom-scrollbar::-webkit-scrollbar { width: 0.375rem; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e7e5e4; border-radius: 1.25rem; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d6d3d1; }

  /* 核心修复：强制编辑器高度自适应（写文章模式） */
  .rich-text-content {
    min-height: 50vh !important;
    height: auto !important;
    overflow: visible !important;
    border: none !important;
  }

  /* 移动端工具栏调整 */
  .rich-text-content > div:first-child {
    position: sticky !important;
    top: 3.5rem !important; /* 移动端 Navbar 高度通常稍小 */
    z-index: 30 !important;
    background-color: rgba(255, 255, 255, 0.98) !important;
    border-bottom: 0.0625rem solid #e7e5e4 !important;
    margin: 0 !important;
    padding: 0.5rem 0.25rem !important;
    overflow-x: auto !important; /* 允许工具栏横向滚动 */
  }
  
  @media (min-width: 64rem) {
    .rich-text-content > div:first-child {
      top: 4rem !important;
    }
  }

  .rich-text-content > div:last-child {
    min-height: 50vh !important;
    max-height: none !important;
    height: auto !important;
    overflow: visible !important;
  }

  .rich-text-content .ProseMirror {
    min-height: 50vh !important;
    height: auto !important; 
    overflow: visible !important;
    outline: none !important;
    padding-bottom: 12.5rem !important;
  }
  
  .rich-text-content .ProseMirror p.is-editor-empty:first-child::before {
    color: #a8a29e;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`
