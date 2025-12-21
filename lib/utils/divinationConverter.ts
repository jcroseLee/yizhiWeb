import { getHexagramResult } from '@/lib/constants/hexagrams'
import type { DivinationInfo, Gua, GuaLine } from '@/lib/components/GuaPanel'

/**
 * 将排盘记录转换为 GuaPanel 组件需要的格式
 */
export function convertDivinationRecordToGuaPanel(record: any): {
  info: DivinationInfo
  gua: Gua
} | null {
  if (!record) return null

  try {
    // 解析 JSON 数据
    let originalJson = record.original_json
    let changedJson = record.changed_json

    if (typeof originalJson === 'string') {
      try {
        originalJson = JSON.parse(originalJson)
      } catch (e) {
        console.warn('Failed to parse original_json:', e)
        originalJson = {}
      }
    }
    if (typeof changedJson === 'string') {
      try {
        changedJson = JSON.parse(changedJson)
      } catch (e) {
        console.warn('Failed to parse changed_json:', e)
        changedJson = {}
      }
    }

    // 调试：输出数据结构（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('Divination record data:', {
        original_json: originalJson,
        changed_json: changedJson,
        original_key: record.original_key,
        changing_flags: record.changing_flags
      })
    }

    // 获取卦名
    const originalKey = String(record.original_key || '').replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
    const hexagram = getHexagramResult(originalKey)
    const guaName = hexagram?.name || '未知卦'

    // 格式化日期时间
    const divinationTime = new Date(record.divination_time)
    const year = divinationTime.getFullYear()
    const month = divinationTime.getMonth() + 1
    const day = divinationTime.getDate()
    const hour = divinationTime.getHours()

    // 获取方法名称
    const methodMap: Record<number, string> = {
      1: '金钱课',
      2: '时间起卦',
      3: '报数起卦',
      4: '意念起卦',
    }
    const methodName = methodMap[record.method] || '未知方法'

    // 构建日期字符串（简化版，实际应该转换为农历）
    const dateStr = `${year}年 ${month}月 ${day}日`
    
    // 构建时间字符串（简化版，实际应该转换为时辰）
    const timeStr = `${hour.toString().padStart(2, '0')}:${divinationTime.getMinutes().toString().padStart(2, '0')}`

    // 获取空亡（从 original_json 中提取，如果有）
    const kongWang = originalJson?.kongWang || originalJson?.kongwang || ''

    // 构建 DivinationInfo
    const info: DivinationInfo = {
      date: dateStr,
      time: timeStr,
      method: methodName,
      kongWang: kongWang,
    }

    // 构建卦象数据
    const changingFlags = Array.isArray(record.changing_flags) ? record.changing_flags : []
    const lines: GuaLine[] = []

    // 从 original_json 中提取爻线信息
    // 支持多种数据结构格式
    let linesData: any[] = []
    
    if (originalJson?.lines && Array.isArray(originalJson.lines)) {
      // 格式1: originalJson.lines 是数组
      linesData = originalJson.lines
    } else if (originalJson?.lineData && Array.isArray(originalJson.lineData)) {
      // 格式2: originalJson.lineData 是数组
      linesData = originalJson.lineData
    } else if (originalJson?.data && Array.isArray(originalJson.data)) {
      // 格式3: originalJson.data 是数组
      linesData = originalJson.data
    }

    if (linesData.length > 0 && linesData.length === 6) {
      // 有详细的爻线数据
      // 注意：lines 数组的顺序通常是从下到上（初爻到上爻），即 index 0 = 初爻，index 5 = 上爻
      linesData.forEach((line: any, index: number) => {
        // position: 1=初爻, 2=二爻, ..., 6=上爻
        // index: 0=初爻, 1=二爻, ..., 5=上爻
        const position = index + 1 // 从下往上：初爻=1，上爻=6
        const isActive = changingFlags[index] || false
        
        // 提取六亲、干支、六兽等信息（支持多种字段名）
        const liuqin = line.liuqin || line.liuQin || line.liu_qin || line.sixRelative || ''
        const ganzhi = line.ganzhi || line.ganZhi || line.gan_zhi || line.stemBranch || ''
        const liushou = line.liushou || line.liuShou || line.liu_shou || line.sixBeast || line.beast || ''
        const wuxing = line.wuxing || line.wuXing || line.wu_xing || line.fiveElement || ''
        
        // 判断阴阳（支持多种格式）
        let yinYang: 'yin' | 'yang' = 'yang'
        if (line.yinYang === 'yin' || line.yin_yang === 'yin') {
          yinYang = 'yin'
        } else if (line.yinYang === 'yang' || line.yin_yang === 'yang') {
          yinYang = 'yang'
        } else if (line.yang === false || line.isYang === false) {
          yinYang = 'yin'
        } else if (line.yang === true || line.isYang === true) {
          yinYang = 'yang'
        } else {
          // 从 original_key 推断（original_key 通常是从下往上：第0位是初爻，第5位是上爻）
          yinYang = originalKey[index] === '1' ? 'yang' : 'yin'
        }
        
        // 世应标记（支持多种字段名）
        const subject = line.subject || line.shi || line.shiYao || line.shi_yao || false
        const object = line.object || line.ying || line.yingYao || line.ying_yao || false

        // 如果有变爻，提取变爻信息
        let change: { liuqin: string; ganzhi: string } | undefined
        if (isActive && changedJson) {
          let changedLine: any = null
          if (changedJson.lines && Array.isArray(changedJson.lines) && changedJson.lines[index]) {
            changedLine = changedJson.lines[index]
          } else if (changedJson.lineData && Array.isArray(changedJson.lineData) && changedJson.lineData[index]) {
            changedLine = changedJson.lineData[index]
          } else if (changedJson.data && Array.isArray(changedJson.data) && changedJson.data[index]) {
            changedLine = changedJson.data[index]
          }
          
          if (changedLine) {
            change = {
              liuqin: changedLine.liuqin || changedLine.liuQin || changedLine.liu_qin || changedLine.sixRelative || '',
              ganzhi: changedLine.ganzhi || changedLine.ganZhi || changedLine.gan_zhi || changedLine.stemBranch || '',
            }
          }
        }

        lines.push({
          position,
          yinYang,
          liuqin,
          ganzhi,
          liushou,
          active: isActive,
          subject: !!subject,
          object: !!object,
          change,
        })
      })
    } else {
      // 如果没有详细的 lines 数据，使用基本数据构建
      // 从 original_key 和 changing_flags 构建基本卦象
      // original_key 是从下往上：第0位是初爻，第5位是上爻
      const originalKeyStr = originalKey
      for (let i = 0; i < 6; i++) {
        const position = i + 1 // 从下往上：初爻=1，上爻=6
        const isYang = originalKeyStr[i] === '1'
        const isActive = changingFlags[i] || false

        lines.push({
          position,
          yinYang: isYang ? 'yang' : 'yin',
          liuqin: '',
          ganzhi: '',
          liushou: '',
          active: isActive,
          subject: false,
          object: false,
        })
      }
    }

    // 获取卦类型（从 original_json 中提取）
    const guaType = originalJson?.guaType || originalJson?.type || ''

    const gua: Gua = {
      name: guaName,
      type: guaType,
      // lines 已经是正确的顺序（从下往上：初爻=1，上爻=6），但 GuaPanel 可能需要从上往下显示
      // 根据 GuaPanel 的显示需求，可能需要反转
      lines: lines.reverse(), // 反转顺序，从上爻到初爻（GuaPanel 从上往下显示）
    }

    return { info, gua }
  } catch (error) {
    console.error('Error converting divination record:', error)
    return null
  }
}

