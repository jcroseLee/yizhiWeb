import { LineLabel } from '../constants/divination';

export type LineBarType = 'yin' | 'yang';

export interface LineDisplay {
  position: string;
  status: string;
  barType: LineBarType;
  isChanging: boolean;
}

export const interpretLineValue = (lineValue: string | null) => {
  if (!lineValue) {
    return null;
  }

  switch (lineValue) {
    case '---O---':
      return {
        status: '老阳',
        barType: 'yang' as LineBarType,
        isChanging: true
      };
    case '-- --':
      return {
        status: '少阳',
        barType: 'yang' as LineBarType,
        isChanging: false
      };
    case '---X---':
      return {
        status: '老阴',
        barType: 'yin' as LineBarType,
        isChanging: true
      };
    case '-----':
    default:
      return {
        status: '少阴',
        barType: 'yin' as LineBarType,
        isChanging: false
      };
  }
};

export const buildLineDisplay = (
  values: string[],
  lineLabels: ReadonlyArray<LineLabel>,
  changeFlags: boolean[] = []
): LineDisplay[] => {
  if (!values.length) {
    return [];
  }

  return values
    .map((value, index) => {
      const info = interpretLineValue(value);
      if (!info) {
        return null;
      }

      const isChanging = changeFlags[index] ?? info.isChanging;

      return {
        position: lineLabels[index] ?? '',
        status: info.status,
        barType: info.barType,
        isChanging
      };
    })
    .filter(Boolean) as LineDisplay[];
};

