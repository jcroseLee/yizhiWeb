import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { DivinationResult, StoredDivinationPayload } from '@/lib/constants/divination'

interface DivinationState {
  // 当前排盘数据
  question: string
  divinationTime: Date | string // 支持 Date 和 ISO 字符串
  divinationMethod: number
  lines: string[]
  changingFlags: boolean[]
  result: DivinationResult | null
  
  // 历史记录
  history: StoredDivinationPayload[]
  
  // Actions
  setQuestion: (question: string) => void
  setDivinationTime: (time: Date | string) => void
  setDivinationMethod: (method: number) => void
  setLines: (lines: string[]) => void
  setChangingFlags: (flags: boolean[]) => void
  setResult: (result: DivinationResult) => void
  addToHistory: (payload: StoredDivinationPayload) => void
  clearCurrent: () => void
  clearHistory: () => void
}

const initialState = {
  question: '',
  divinationTime: new Date(),
  divinationMethod: 0,
  lines: [],
  changingFlags: [],
  result: null,
  history: [],
}

export const useDivinationStore = create<DivinationState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setQuestion: (question) => set({ question }),
      setDivinationTime: (time) => set({ 
        divinationTime: time instanceof Date ? time.toISOString() : time 
      }),
      setDivinationMethod: (method) => set({ divinationMethod: method }),
      setLines: (lines) => set({ lines }),
      setChangingFlags: (flags) => set({ changingFlags: flags }),
      setResult: (result) => set({ result }),
      
      addToHistory: (payload) =>
        set((state) => ({
          history: [payload, ...state.history].slice(0, 50), // 最多保存50条
        })),
      
      clearCurrent: () => set(initialState),
      
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'divination-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        history: state.history,
      }),
    }
  )
)

