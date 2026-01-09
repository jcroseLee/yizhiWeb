'use client'

import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import {
    BookOpen,
    Bot,
    Crown,
    Database,
    Feather,
    Library,
    Network,
    Shield,
    Sparkles,
    UserPlus
} from 'lucide-react'

// --- 样式补丁 ---
const styles = `
  /* 1. 基础纹理 */
  .paper-texture {
    background-color: #FDFBF7;
    background-image: 
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
  }

  /* 2. 水墨呼吸背景 */
  @keyframes ink-breathe {
    0% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.1); opacity: 0.5; }
    100% { transform: scale(1); opacity: 0.3; }
  }
  .ink-blob {
    animation: ink-breathe 10s infinite ease-in-out;
    filter: blur(80px);
    mix-blend-mode: multiply;
  }

  /* 3. 玻璃态卡片 */
  .glass-card {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
    transition: all 0.3s ease;
  }
  .glass-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.08);
    border-color: rgba(200, 46, 49, 0.1);
  }

  /* 4. 暗黑权益卡片 */
  .dark-glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
  }
  .dark-glass-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 215, 0, 0.2); /* 金色边框 */
  }

  /* 5. 徽章流光 */
  @keyframes shine {
    100% { left: 125%; }
  }
  .badge-shine {
    position: relative;
    overflow: hidden;
  }
  .badge-shine::after {
    content: '';
    position: absolute;
    top: 0;
    left: -75%;
    width: 50%;
    height: 100%;
    background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 100%);
    transform: skewX(-25deg);
    animation: shine 3s infinite;
  }

  /* 6. 入场动画 */
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-up {
    animation: fade-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    opacity: 0;
  }
`

// --- 组件：水墨背景 ---
const InkBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-stone-200/50 rounded-full ink-blob" />
    <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-red-50/60 rounded-full ink-blob" style={{ animationDelay: '-2s' }} />
  </div>
)

export default function CoBuildPlanPage() {
  return (
    <>
      <style jsx global>{styles}</style>
      
      <div className="min-h-screen paper-texture text-stone-800 font-sans selection:bg-[#C82E31] selection:text-white pb-20">
        
        {/* --- 1. Hero Section --- */}
        <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
            <InkBackground />
            
            <div className="relative z-10 max-w-4xl mx-auto">
                {/* 标签 */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C82E31]/5 border border-[#C82E31]/20 text-[#C82E31] text-xs font-bold mb-8 animate-fade-up">
                    <Sparkles className="w-3.5 h-3.5" />
                    早期共建计划 · Genesis Program
                </div>

                {/* 标题 */}
                <h1 className="text-4xl md:text-6xl font-serif font-bold text-stone-900 mb-6 leading-tight animate-fade-up" style={{ animationDelay: '0.1s' }}>
                    以<span className="text-[#C82E31]">数据</span>重构脉络<br/>
                    让<span className="text-[#C82E31]">智慧</span>在 AI 时代新生
                </h1>

                {/* 引言 */}
                <div className="max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.2s' }}>
                    <div className="relative pl-6 border-l-2 border-stone-300 text-left my-10">
                        <p className="text-lg text-stone-600 font-serif italic leading-relaxed">
                            “形而上者谓之道，形而下者谓之器。化而裁之谓之变，推而行之谓之通。”
                        </p>
                        <p className="text-sm text-stone-400 mt-2">—《周易·系辞》</p>
                    </div>
                    
                    <p className="text-stone-600 leading-relaxed text-base md:text-lg">
                        易知 (YiZhi AI) 不仅仅是一个工具，更是一场<span className="font-bold text-stone-900">“数字化修缮”</span>工程。
                        <br className="hidden md:block"/>
                        我们诚邀您——在这个时代依然敬畏逻辑、求索真知的“易友”，
                        <br className="hidden md:block"/>
                        成为易知的<span className="font-bold text-stone-900">早期共建者 (Co-Builders)</span>。
                    </p>
                </div>
            </div>
        </section>

        {/* --- 2. Directions Section (Bento Grid) --- */}
        <section className="px-6 py-16 relative z-10">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16 animate-fade-up relative" style={{ animationDelay: '0.3s' }}>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C82E31]/5 border border-[#C82E31]/10 text-[#C82E31] text-xs font-semibold mb-6">
                        <Sparkles className="w-3 h-3" />
                        <span>共建方向</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4 leading-tight">
                        您的每一次贡献<br className="hidden md:block"/>
                        <span className="text-[#C82E31]">都将成为 AI 神经网络中的关键突触</span>
                    </h2>
                    <p className="text-stone-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                        选择您感兴趣的共建方向，与我们一起构建数字易学的未来
                    </p>
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 w-px h-12 bg-gradient-to-b from-stone-300/50 to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up" style={{ animationDelay: '0.4s' }}>
                    
                    {/* Card 1: Library */}
                    <Card className="glass-card border-none rounded-2xl group cursor-pointer h-full">
                        <CardContent className="p-8 flex flex-col h-full">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Library className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-3">藏经阁修缮</h3>
                            <p className="text-stone-500 text-sm leading-relaxed mb-6 flex-1">
                                搜罗散落在民间的珍本、善本，上传至易知藏经阁。对 OCR 识别内容进行逐字校对，确保“一字之师”的严谨。
                            </p>
                            <div className="flex gap-2 text-xs font-mono text-stone-400">
                                <span className="bg-stone-100 px-2 py-1 rounded">#古籍上传</span>
                                <span className="bg-stone-100 px-2 py-1 rounded">#文本校对</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Wiki */}
                    <Card className="glass-card border-none rounded-2xl group cursor-pointer h-full">
                        <CardContent className="p-8 flex flex-col h-full">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Network className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-3">知识图谱构建</h3>
                            <p className="text-stone-500 text-sm leading-relaxed mb-6 flex-1">
                                为术语撰写清晰、无歧义的现代汉语解释，剥离迷信色彩。建立知识点关联，帮助初学者和 AI 建立完整的逻辑树。
                            </p>
                            <div className="flex gap-2 text-xs font-mono text-stone-400">
                                <span className="bg-stone-100 px-2 py-1 rounded">#Wiki定义</span>
                                <span className="bg-stone-100 px-2 py-1 rounded">#脉络连接</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Cases */}
                    <Card className="glass-card border-none rounded-2xl group cursor-pointer h-full">
                        <CardContent className="p-8 flex flex-col h-full">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Database className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-3">实证案例宝库</h3>
                            <p className="text-stone-500 text-sm leading-relaxed mb-6 flex-1">
                                分享亲历的、有明确反馈的真实案例。清洗无效噪音，提炼核心断语，为 AI 进行强化学习 (RLHF) 提供黄金燃料。
                            </p>
                            <div className="flex gap-2 text-xs font-mono text-stone-400">
                                <span className="bg-stone-100 px-2 py-1 rounded">#贡献实占</span>
                                <span className="bg-stone-100 px-2 py-1 rounded">#RLHF数据</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 4: Community */}
                    <Card className="glass-card border-none rounded-2xl group cursor-pointer h-full">
                        <CardContent className="p-8 flex flex-col h-full">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-3">社区良性生态</h3>
                            <p className="text-stone-500 text-sm leading-relaxed mb-6 flex-1">
                                倡导“以理服人”，提供基于古籍和逻辑的解答。协助清理封建迷信内容，共同维护一方净土。
                            </p>
                            <div className="flex gap-2 text-xs font-mono text-stone-400">
                                <span className="bg-stone-100 px-2 py-1 rounded">#理性论道</span>
                                <span className="bg-stone-100 px-2 py-1 rounded">#去伪存真</span>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </section>

        {/* --- 3. Privileges Section (Dark Mode) --- */}
        <section className="mt-20 py-24 bg-[#1c1917] relative overflow-hidden text-white">
            {/* 装饰背景 */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C82E31]/20 rounded-full blur-[100px] opacity-30" />

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-serif font-bold text-white mb-4">共建者权益</h2>
                    <p className="text-stone-400">这不仅是奖励，更是身份的象征</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    
                    {/* Benefit 1 */}
                    <div className="dark-glass-card rounded-xl p-6 text-center group">
                        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-yellow-100 to-yellow-500 flex items-center justify-center mb-4 badge-shine shadow-lg">
                            <Crown className="w-7 h-7 text-yellow-900" />
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-yellow-100">创世共建者徽章</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                            点亮独一无二的 Genesis 动态徽章，永久记录于鸣谢碑林。
                        </p>
                    </div>

                    {/* Benefit 2 */}
                    <div className="dark-glass-card rounded-xl p-6 text-center group">
                        <div className="w-14 h-14 mx-auto rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center mb-4 group-hover:bg-stone-700 transition-colors">
                            <Bot className="w-7 h-7 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">AI 算力无限权</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                            解除每日限制，优先体验 Model v2.0 及后续微调模型内测资格。
                        </p>
                    </div>

                    {/* Benefit 3 */}
                    <div className="dark-glass-card rounded-xl p-6 text-center group">
                        <div className="w-14 h-14 mx-auto rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center mb-4 group-hover:bg-stone-700 transition-colors">
                            <BookOpen className="w-7 h-7 text-sky-400" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">藏经阁守书人</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                            获得珍稀古籍的高级阅览权限，拥有对书籍的“批注权”。
                        </p>
                    </div>

                    {/* Benefit 4 */}
                    <div className="dark-glass-card rounded-xl p-6 text-center group">
                        <div className="w-14 h-14 mx-auto rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center mb-4 group-hover:bg-stone-700 transition-colors">
                            <Feather className="w-7 h-7 text-rose-400" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">社区治理权</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">
                            受邀参与内测会议，直接影响产品走向，拥有更高投票权。
                        </p>
                    </div>

                </div>
            </div>
        </section>

        {/* --- 4. CTA Section --- */}
        <section className="py-32 px-6 text-center relative z-10">
            <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-8 leading-tight">
                易学是先贤对世界的洞察<br/>
                绝非陈旧的迷信
            </h2>
            <p className="text-lg text-stone-600 mb-12 font-serif leading-relaxed">
                我们怀着敬畏之心，试图用现代技术去梳理那些晦涩的脉络。<br/>
                不是为了炫技，只是想把这份珍贵的文化遗产，完完整整地翻译给这个时代。
            </p>
                
                <div className="flex flex-col items-center gap-4">
                    <Button 
                        size="lg" 
                        className="h-14 px-12 rounded-full bg-[#C82E31] hover:bg-[#a61b1f] text-white text-lg font-bold shadow-xl shadow-red-900/20 hover:scale-105 transition-transform badge-shine"
                    >
                        <UserPlus className="w-5 h-5 mr-2" />
                        申请加入共建计划
                    </Button>
                    <p className="text-xs text-stone-400 mt-2">
                        * 审核通过后，将通过邮件发放内测邀请码
                    </p>
                </div>
            </div>
        </section>

      </div>
    </>
  )
}