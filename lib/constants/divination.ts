import { HexagramResult } from './hexagrams';

export const LINE_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'] as const;
export type LineLabel = typeof LINE_LABELS[number];

export const DIVINATION_METHODS = ['手动摇卦', '自动摇卦', '手工起卦'] as const;
export type DivinationMethod = typeof DIVINATION_METHODS[number];

export const RESULT_STORAGE_KEY = 'latestDivinationResult';
export const RESULTS_LIST_STORAGE_KEY = 'divinationResultsList';

export interface StoredResultWithId extends StoredDivinationPayload {
  id: string;
  createdAt: string;
}

export interface DivinationResult {
  originalKey: string;
  changedKey: string;
  original: HexagramResult;
  changed: HexagramResult;
  changingLines: number[];
}

export interface NoteItem {
  id: string;
  content: string;
  created_at: string;
  images?: string[];
}

export interface StoredDivinationPayload {
  _id?: any;
  question: string;
  divinationTimeISO: string;
  divinationMethod: number;
  lines: string[];
  changingFlags: boolean[];
  result: DivinationResult;
  isSaved?: boolean;
  notes?: NoteItem[];
  note?: string;
}

