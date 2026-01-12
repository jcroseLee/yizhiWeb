'use client'

import { Alert, AlertDescription, AlertTitle } from '@/lib/components/ui/alert';
import { Button } from '@/lib/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog';
import { ScrollArea } from '@/lib/components/ui/scroll-area';
import { addDivinationNote, getDivinationNotes, updateDivinationNote } from '@/lib/services/profile';
import { getSupabaseClient } from '@/lib/services/supabaseClient';
import { AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface AIResultDialogProps {
  guaData: unknown;
  open: boolean;
  setOpen: (open: boolean) => void;
  question: string;
  recordId?: string | null;
  initialResult?: string;
  forceAnalyze?: boolean;
  onForceAnalyzeConsumed?: () => void;
  onResultSaved?: (result: string) => void;
  canPersistToCloud?: boolean;
}

const AI_NOTE_PREFIX = '【AI详批】';
const AI_RESULT_STORAGE_PREFIX = 'aiResult:';
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

function stripAiPrefix(content: string) {
  return content.replace(/^【AI详批】\n?/, '');
}

export default function AIResultDialog({ guaData, open, setOpen, question, recordId, initialResult, forceAnalyze, onForceAnalyzeConsumed, onResultSaved }: AIResultDialogProps) {
  const [token, setToken] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const savedOnceRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  // 鉴权逻辑
  useEffect(() => {
    const checkAuth = async () => {
      setCheckingAuth(true);
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setToken(data.session.access_token);
        } else {
          setToken(null);
        }
      }
      setCheckingAuth(false);
    };
    
    if (open) {
      checkAuth();
    } else {
      // Reset idempotency key when dialog closes to ensure fresh start on reopen
      idempotencyKeyRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    savedOnceRef.current = false;
    if (forceAnalyze) {
      setCompletion('');
      setError(null);
      setIsLoading(false);
      // Force analyze implies a new attempt, but let's let handleAnalyze manage the key
      // If forceAnalyze is true, we might want to clear key?
      // handleAnalyze checks if key exists.
      // If we want to force NEW analysis, we should clear key.
      idempotencyKeyRef.current = null;
      return;
    }
    if (initialResult) {
      setCompletion(stripAiPrefix(initialResult));
      setError(null);
      setIsLoading(false);
      return;
    }
    if (recordId && typeof window !== 'undefined') {
      const cached = window.localStorage.getItem(`${AI_RESULT_STORAGE_PREFIX}${recordId}`);
      if (cached) {
        setCompletion(cached);
        setError(null);
        setIsLoading(false);
      }
    }
  }, [open, initialResult, recordId, forceAnalyze]);

  const persistResult = async (result: string) => {
    if (!result.trim()) return;
    if (savedOnceRef.current) return;
    savedOnceRef.current = true;

    if (recordId && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(`${AI_RESULT_STORAGE_PREFIX}${recordId}`, result);
      } catch {
      }
    }

    if (recordId && token && isUUID(recordId)) {
      try {
        const notes = await getDivinationNotes(recordId);
        const aiNote = notes.find((n) => n.content.startsWith(AI_NOTE_PREFIX));
        if (aiNote) {
          await updateDivinationNote(aiNote.id, `${AI_NOTE_PREFIX}\n${result}`);
        } else {
          await addDivinationNote(recordId, `${AI_NOTE_PREFIX}\n${result}`);
        }
      } catch {
      }
    }

    onResultSaved?.(result);
  };

  // Generate UUID for idempotency
  const generateIdempotencyKey = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 开始分析
  const handleAnalyze = () => {
    if (!token && process.env.NODE_ENV !== 'development') return; // 开发环境允许无token
    if (!guaData) {
        console.warn('Cannot analyze: guaData is missing');
        return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    savedOnceRef.current = false;
    setCompletion('');
    setError(null);
    setIsLoading(true);

    // Generate idempotency key if not exists
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch('/api/ai/analyze', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question,
        background: '',
        guaData,
        idempotencyKey: idempotencyKeyRef.current,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          
          // Check if it's a handled error (JSON)
          let isHandledError = false;
          let errorMessage = text;
          try {
             const json = JSON.parse(text);
             if (json.error) {
               isHandledError = true;
               errorMessage = json.error;
             }
          } catch {}

          // If handled error (e.g. 402, 500 with refund), clear key to allow fresh retry
          if (isHandledError) {
             idempotencyKeyRef.current = null;
          }
          // If unhandled error (e.g. 502, 504), keep key for idempotency

          throw new Error(errorMessage || `HTTP ${response.status}`);
        }
        if (!response.body) throw new Error('Empty response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            if (chunk) {
              fullText += chunk;
              setCompletion((prev) => prev + chunk);
            }
          }
        }

        setIsLoading(false);
        await persistResult(fullText);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsLoading(false);
        setError(err instanceof Error ? err : new Error(String(err)));
      });
  };

  // 自动触发逻辑
  useEffect(() => {
    // 只要打开了弹窗，且不在加载中，且没有内容，就开始分析
    // 这里的逻辑稍微放松一点：如果是开发环境或者有token，都可以开始
    const canStart = (token || process.env.NODE_ENV === 'development') && !checkingAuth;
    
    if (open && canStart && !completion && !isLoading && !error && guaData && !initialResult && !forceAnalyze) {
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token, checkingAuth, guaData]); // 依赖项精简，handleAnalyze 会在每次渲染时重新创建

  useEffect(() => {
    const canStart = (token || process.env.NODE_ENV === 'development') && !checkingAuth;
    if (open && forceAnalyze && canStart && !isLoading && guaData) {
      handleAnalyze();
      onForceAnalyzeConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, forceAnalyze, token, checkingAuth, guaData, isLoading]);

  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  const handleLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
  };

  const getErrorMessage = (error: Error) => {
    try {
      const parsed = JSON.parse(error.message);
      return parsed.error || error.message;
    } catch {
      return error.message;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col paper-texture bg-[#FAF9F6]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[#C82E31]">
            <Sparkles className="w-5 h-5" /> AI 智能详批 
            {token && <span className="text-xs font-normal text-stone-500 ml-2">(消耗 50 易币/次)</span>}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4 border border-stone-200 rounded-lg bg-white/80">
          {checkingAuth ? (
             <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
               <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
               <p className="text-stone-500 text-sm">正在验证身份...</p>
             </div>
          ) : (!token && process.env.NODE_ENV !== 'development') ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Alert variant="destructive" className="max-w-md bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800 font-bold">需要登录</AlertTitle>
                <AlertDescription className="text-orange-700 text-xs">
                  使用 AI 智能详批功能需要先登录账户。
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleLogin} 
                className="gap-2 bg-[#C82E31] hover:bg-[#A61B1E] text-white"
              >
                前往登录
              </Button>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Alert variant="destructive" className="max-w-md bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-[#C82E31]" />
                <AlertTitle className="text-[#C82E31] font-bold">分析失败</AlertTitle>
                <AlertDescription className="text-stone-600 text-xs">
                  {getErrorMessage(error)}
                </AlertDescription>
              </Alert>
              <Button 
                variant="outline" 
                onClick={handleAnalyze} 
                className="gap-2 text-[#C82E31] border-[#C82E31]/30 hover:bg-red-50"
              >
                <RefreshCw className="w-4 h-4" /> 重试
              </Button>
            </div>
          ) : isLoading && !completion ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#C82E31]" />
              <p className="text-stone-500 text-sm animate-pulse font-serif">正在推演卦气旺衰...</p>
              {token && <p className="text-stone-400 text-xs">将扣除 50 易币</p>}
            </div>
          ) : (
            <div className="prose prose-stone max-w-none font-serif text-stone-800 prose-headings:text-[#C82E31] prose-strong:text-[#C82E31]">
              <ReactMarkdown>{completion}</ReactMarkdown>
            </div>
          )}
        </ScrollArea>
        <div className="flex justify-end pt-2 text-xs text-stone-400">
           AI 分析结果仅供参考，请相信科学，理性生活。
        </div>
      </DialogContent>
    </Dialog>
  );
}
