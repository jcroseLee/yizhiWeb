"use client";

import { trackEvent } from "@/lib/analytics";
import { Button } from "@/lib/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/lib/components/ui/dialog";
import { useToast } from "@/lib/hooks/use-toast";
import { getCurrentUser } from "@/lib/services/auth";
import { getUserGrowth } from "@/lib/services/growth";
import { cn } from "@/lib/utils/cn";
import { Bot, RotateCcw, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import { IconAISparkle } from "../../../lib/components/IconAISparkle";

export type DivinationType = "bazi" | "liuyao" | "qimen" | "general";

interface AiAnalysisCardProps {
  aiStage: "none" | "preview" | "full";
  isSaved: boolean;
  isAuthor: boolean;
  saving: boolean;
  divinationType?: DivinationType;
  onStartAnalysis: (mode: "preview" | "full") => void;
  onSaveToCloud: (showToast?: boolean) => Promise<string | null>;
  onLoginRedirect: () => void;
  onResetIdempotencyKey?: () => void;
  onScrollToResult?: () => void;
}

const COPY_CONFIG: Record<
  DivinationType,
  { title: string; subtitle: string; desc: string }
> = {
  liuyao: {
    title: "六爻·智断",
    subtitle: "AI 辅助爻象推演",
    desc: "融合《增删卜易》古法与大模型逻辑，精准捕捉动变之机，解析吉凶应期。",
  },
  bazi: {
    title: "四柱·命理",
    subtitle: "AI 深度格局分析",
    desc: "基于《滴天髓》精义，运算五行旺衰平衡，多维推导大运流年之趋势。",
  },
  qimen: {
    title: "奇门·运筹",
    subtitle: "AI 时空能量建模",
    desc: "构建九星八门全息盘面，结合现代算法，为您提供决策参考与运筹建议。",
  },
  general: {
    title: "易知·天机",
    subtitle: "AI 智能研判助手",
    desc: "连接古老智慧与未来算力，为您提供有理有据的深度易学咨询。",
  },
};

// --- 样式补丁 ---
const styles = `
  /* 1. 旋转流光动画 */
  @keyframes border-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-border-spin {
    position: absolute;
    top: -50%; 
    left: -50%; 
    width: 200%; 
    height: 200%;
    /* 核心修改：使用高对比度的红金渐变，确保可见 */
    background: conic-gradient(
      transparent 0deg, 
      transparent 60deg, 
      #C82E31 100deg, 
      #FFD700 120deg, 
      #C82E31 140deg, 
      transparent 180deg,
      transparent 360deg
    );
    animation: border-spin 4s linear infinite;
    /* 增加滤镜使光效更柔和 */
    filter: blur(0.625rem); 
    opacity: 0.8; 
  }

  /* 2. 按钮内部扫光 */
  @keyframes btn-shimmer {
    0% { transform: translateX(-100%) skewX(-15deg); }
    100% { transform: translateX(200%) skewX(-15deg); }
  }
  .anim-btn-shimmer {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.2), transparent);
    animation: btn-shimmer 1.5s infinite;
  }
  
  /* 3. 呼吸光晕 */
  @keyframes pulse-soft {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
  .anim-glow-soft {
    animation: pulse-soft 3s ease-in-out infinite;
  }
`;

export function AiAnalysisCard({
  aiStage,
  isSaved,
  isAuthor,
  saving,
  divinationType = "general",
  onStartAnalysis,
  onSaveToCloud,
  onLoginRedirect,
  onResetIdempotencyKey,
  onScrollToResult,
}: AiAnalysisCardProps) {
  const { toast } = useToast();
  const [showAiSaveConfirm, setShowAiSaveConfirm] = useState(false);
  const [showAiNotOwnerConfirm, setShowAiNotOwnerConfirm] = useState(false);
  const [showAiCostConfirm, setShowAiCostConfirm] = useState(false);
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);
  const [aiBalanceChecking, setAiBalanceChecking] = useState(false);
  const [aiNotOwnerIntent, setAiNotOwnerIntent] = useState<"preview" | "unlock">(
    "preview",
  );
  const [pendingSaveAction, setPendingSaveAction] = useState<
    "ai" | "note" | "title" | null
  >(null);

  const copy = COPY_CONFIG[divinationType] || COPY_CONFIG.general;

  const handleAiAnalyzeClick = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) {
      onLoginRedirect();
      return;
    }
    const growth = await getUserGrowth().catch(() => null)
    trackEvent("ai_analysis_click", {
      source: "result_page",
      divination_type: divinationType,
      user_balance: growth?.yiCoins ?? null,
    });
    if (aiStage !== "none") {
      if (isSaved && !isAuthor)
        toast({
          title: "提示",
          description: "你不是该排盘作者，AI 分析结果不会保存到该排盘记录",
        });
      if (onScrollToResult) onScrollToResult();
      return;
    }
    if (!isSaved) {
      setPendingSaveAction("ai");
      setShowAiSaveConfirm(true);
      return;
    }
    if (!isAuthor) {
      setAiNotOwnerIntent("preview");
      setShowAiNotOwnerConfirm(true);
      return;
    }
    onStartAnalysis("preview");
    if (onScrollToResult) setTimeout(() => onScrollToResult(), 100);
  }, [aiStage, isAuthor, isSaved, toast, onLoginRedirect, onScrollToResult, divinationType, onStartAnalysis]);

  const handleUnlockFullClick = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) {
      onLoginRedirect();
      return;
    }
    const growth = await getUserGrowth().catch(() => null)
    trackEvent("ai_unlock_click", {
      source: "result_page",
      divination_type: divinationType,
      user_balance: growth?.yiCoins ?? null,
    });
    if (!isSaved) {
      setPendingSaveAction("ai");
      setShowAiSaveConfirm(true);
      return;
    }
    if (!isAuthor) {
      setAiNotOwnerIntent("unlock");
      setShowAiNotOwnerConfirm(true);
      return;
    }
    setShowAiCostConfirm(true);
  }, [divinationType, isAuthor, isSaved, onLoginRedirect]);

  const handleConfirmSaveForAi = useCallback(async () => {
    const action = pendingSaveAction;
    setShowAiSaveConfirm(false);
    setPendingSaveAction(null);
    const recordId = await onSaveToCloud(false);
    if (!recordId) {
      toast({ title: "保存失败", variant: "destructive" });
      return;
    }
    if (action === "ai") {
      toast({
        title: "已保存到云端",
        description: "请再次点击 AI 分析开始推演",
      });
      return;
    }
    toast({ title: "已保存到云端" });
  }, [pendingSaveAction, onSaveToCloud, toast]);

  const handleConfirmAiNotOwner = useCallback(() => {
    setShowAiNotOwnerConfirm(false);
    if (aiNotOwnerIntent === "preview") {
      onStartAnalysis("preview");
      if (onScrollToResult) setTimeout(() => onScrollToResult(), 100);
      return;
    }
    setShowAiCostConfirm(true);
  }, [aiNotOwnerIntent, onScrollToResult, onStartAnalysis]);

  const handleCancelAiPay = useCallback(() => {
    setShowAiCostConfirm(false);
    trackEvent("ai_pay_cancel", {
      reason: "user_cancel",
      cost: 50,
      divination_type: divinationType,
    });
  }, [divinationType]);

  const handleConfirmAiAnalyze = useCallback(async () => {
    setAiBalanceChecking(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setShowAiCostConfirm(false);
        onLoginRedirect();
        return;
      }
      if (!isSaved) {
        setShowAiCostConfirm(false);
        setPendingSaveAction("ai");
        setShowAiSaveConfirm(true);
        trackEvent("ai_pay_cancel", {
          reason: "not_saved",
          cost: 50,
          divination_type: divinationType,
        });
        return;
      }
      const growth = await getUserGrowth();
      const balance = growth?.yiCoins;
      if (typeof balance !== "number") {
        toast({
          title: "无法使用 AI 分析",
          description: "无法获取易币余额",
          variant: "destructive",
        });
        trackEvent("ai_pay_cancel", {
          reason: "balance_unknown",
          cost: 50,
          divination_type: divinationType,
        });
        return;
      }
      if (balance < 50) {
        setShowAiCostConfirm(false);
        toast({
          title: "易币余额不足",
          description: "当前易币不足 50",
          variant: "destructive",
        });
        trackEvent("ai_pay_cancel", {
          reason: "balance_insufficient",
          cost: 50,
          user_balance: balance,
          divination_type: divinationType,
        });
        return;
      }
      setShowAiCostConfirm(false);
      trackEvent("ai_pay_confirm", {
        cost: 50,
        is_reanalyze: false,
        user_balance: balance,
        divination_type: divinationType,
      });
      if (onResetIdempotencyKey) onResetIdempotencyKey();
      onStartAnalysis("full");
      if (onScrollToResult) setTimeout(() => onScrollToResult(), 100);
    } finally {
      setAiBalanceChecking(false);
    }
  }, [isSaved, onLoginRedirect, onResetIdempotencyKey, onScrollToResult, toast, divinationType, onStartAnalysis]);

  const handleConfirmReanalyze = useCallback(() => {
    setShowReanalyzeConfirm(false);
    if (onResetIdempotencyKey) onResetIdempotencyKey();
    trackEvent("ai_pay_confirm", {
      cost: 50,
      is_reanalyze: true,
      divination_type: divinationType,
    });
    onStartAnalysis("full");
    if (onScrollToResult) setTimeout(() => onScrollToResult(), 100);
  }, [onResetIdempotencyKey, onStartAnalysis, onScrollToResult, divinationType]);

  const handleReanalyzeClick = useCallback(() => {
    setShowReanalyzeConfirm(true);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* --- 外层容器 (裁剪溢出) --- */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-xl group cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 isolate">
        {/* 1. 动态边框层 (放在底层) */}
        {/* 这个 div 旋转产生流光效果 */}
        <div className="animate-border-spin z-0" />

        {/* 2. 背景遮罩层 (inset-[0.0938rem] 露出边框) */}
        {/* 使用深色渐变背景，遮住中间的流光，只留下边缘 */}
        <div className="absolute inset-[0.0938rem] rounded-[0.625rem] bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#2b0a0a] z-10" />

        {/* 3. 内容层 (位于最上层) */}
        <div className="relative z-20 p-6 h-full flex flex-col">
          {/* 内部纹理装饰 */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none rounded-[0.625rem]" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#C82E31] rounded-full blur-[3.75rem] opacity-20 group-hover:opacity-40 transition-opacity anim-glow-soft" />

          {/* 头部：图标与标题 */}
          <div className="flex items-start justify-between mb-5 relative">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner group-hover:bg-[#C82E31] group-hover:text-white transition-all duration-500">
                <Bot className="w-6 h-6 text-white/90" />
              </div>
              <div>
                <h3 className="text-white font-serif font-bold text-xl tracking-wide leading-none mb-1.5">
                  {copy.title}
                </h3>
                <p className="text-[0.625rem] text-white/50 font-mono tracking-wider uppercase bg-white/5 px-2 py-0.5 rounded inline-block">
                  {copy.subtitle}
                </p>
              </div>
            </div>
            {/* 状态指示灯 */}
            <div className="flex gap-1 pt-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
            </div>
          </div>

          {/* 描述文案 */}
          <p className="text-stone-300 text-xs mb-6 leading-relaxed font-light min-h-[3em] relative">
            {copy.desc}
          </p>

          {/* 按钮 */}
          <Button
            onClick={
              aiStage === "full"
                ? handleReanalyzeClick
                : aiStage === "preview"
                  ? handleUnlockFullClick
                  : handleAiAnalyzeClick
            }
            className="w-full relative overflow-hidden bg-white hover:bg-stone-100 text-[#1c1917] border-none font-bold shadow-[0_0_15px_rgba(255,255,255,0.15)] h-10 text-xs tracking-wide group/btn transition-all active:scale-95"
          >
            {/* 按钮内部流光 */}
            <div className="anim-btn-shimmer opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />

            <div className="relative flex items-center justify-center gap-2 z-10">
              {aiStage === "full" ? (
                <RotateCcwIcon />
              ) : (
                <IconAISparkle className="w-8 h-8 text-[#C82E31]" />
              )}
              {aiStage === "full"
                ? "重新推演 (50易币)"
                : aiStage === "preview"
                  ? "解锁完整内容 (50易币)"
                  : "开始智能推演"}
            </div>
          </Button>
        </div>
      </div>

      {/* --- Dialogs (保持原样) --- */}
      <Dialog open={showAiSaveConfirm} onOpenChange={setShowAiSaveConfirm}>
        <DialogContent className="bg-white rounded-xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>需要先保存到云端</DialogTitle>
            <DialogDescription>
              使用该功能前，需要先将本次排盘保存到云端。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAiSaveConfirm(false)}
              disabled={saving}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmSaveForAi}
              className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full"
              disabled={saving}
            >
              保存到云端
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showAiNotOwnerConfirm}
        onOpenChange={setShowAiNotOwnerConfirm}
      >
        <DialogContent className="bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle>非作者提示</DialogTitle>
            <DialogDescription>
              你不是该排盘作者，AI 分析结果将仅在当前设备临时显示。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAiNotOwnerConfirm(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmAiNotOwner}
              className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full"
            >
              继续分析
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showAiCostConfirm} onOpenChange={setShowAiCostConfirm}>
        <DialogContent className="bg-white rounded-xl">
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-orange-500 fill-current" />
            </div>
            <DialogTitle className="mb-2">解锁完整内容</DialogTitle>
            <DialogDescription>
              本次操作将扣除{" "}
              <span className="font-bold text-[#C82E31] text-base">50</span>{" "}
              易币
              <br />
              以查看完整 AI 分析内容。
            </DialogDescription>
          </div>
          <DialogFooter className="mt-4 sm:justify-center">
            <Button
              variant="outline"
              onClick={handleCancelAiPay}
              disabled={aiBalanceChecking}
              className="rounded-full w-full sm:w-auto px-8"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmAiAnalyze}
              className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full w-full sm:w-auto px-8"
              disabled={aiBalanceChecking}
            >
              {aiBalanceChecking ? "查询余额..." : "确认支付"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showReanalyzeConfirm}
        onOpenChange={setShowReanalyzeConfirm}
      >
        <DialogContent className="bg-white rounded-xl">
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6 text-stone-600" />
            </div>
            <DialogTitle className="mb-2">确认重新分析？</DialogTitle>
            <DialogDescription>
              将再次扣除 <span className="font-bold text-[#C82E31]">50</span>{" "}
              易币。
              <br />
              新结果将<span className="font-bold text-stone-800">覆盖</span>
              之前的 AI 分析记录。
            </DialogDescription>
          </div>
          <DialogFooter className="mt-4 sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setShowReanalyzeConfirm(false)}
              className="rounded-full w-full sm:w-auto px-8"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmReanalyze}
              className="bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full w-full sm:w-auto px-8"
            >
              确认覆盖
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 简单的 SVG 图标组件
const RotateCcwIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-3.5 h-3.5", className)}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
