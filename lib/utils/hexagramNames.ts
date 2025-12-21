const TRIGRAMS: Record<string, { name: string; element: string }> = {
  '111': { name: '乾', element: '天' },
  '000': { name: '坤', element: '地' },
  '100': { name: '震', element: '雷' },
  '010': { name: '坎', element: '水' },
  '001': { name: '艮', element: '山' },
  '110': { name: '巽', element: '风' },
  '011': { name: '离', element: '火' },
  '101': { name: '兑', element: '泽' },
}

function getTrigrams(binary: string): { upper: string; lower: string } {
  if (binary.length !== 6) {
    return { upper: '000', lower: '000' }
  }
  
  const lower = binary.slice(3, 6)
  const upper = binary.slice(0, 3)
  
  return { upper, lower }
}

export function getFullHexagramName(binary: string, hexagramName: string): string {
  const { upper, lower } = getTrigrams(binary)
  
  const upperTrigram = TRIGRAMS[upper]
  const lowerTrigram = TRIGRAMS[lower]
  
  if (!upperTrigram || !lowerTrigram) {
    return hexagramName
  }
  
  return `${upperTrigram.element}${lowerTrigram.element}${hexagramName}(${upperTrigram.name})`
}

