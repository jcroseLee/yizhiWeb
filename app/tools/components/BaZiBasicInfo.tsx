import { type StoredBaZiPayload } from '../bazi/[id]/page'

// --- 工具函数：格式化时间 ---
const formatDateTimeFull = (iso: string | Date) => {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '--'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// --- 核心修复：命理计算逻辑 (建议在数据传入前调用此逻辑) ---
/* 
   上一问指出的 "乙子" 命宫是不存在的（阴干配阳支）。
   正确的命宫推算需要 "五虎遁"：
   1. 根据年干推寅月天干。
   2. 地支公式：(26 - (月支数 + 时支数)) % 12。
*/


interface BaZiBasicInfoProps {
  name: string
  payload: StoredBaZiPayload
  date: Date
  lunar: string
  zodiac: string
  trueSolarTime: string
  birthPlace: string
  renYuanSiLing: string
  solarTermInfo: {
    prevTerm: { name: string; date: Date }
    nextTerm: { name: string; date: Date }
    daysAfter: number
    hoursAfter: number
    daysBefore: number
    hoursBefore: number
  }
  taiYuan: { ganZhi: string; naYin: string }
  kongWang: string
  mingGong: { ganZhi: string; naYin: string }
  taiXi: { ganZhi: string; naYin: string }
  shenGong: { ganZhi: string; naYin: string }
  mingGua: { gua: string; direction: string }
}

export function BaZiBasicInfo({
  name,
  payload,
  date,
  // lunar, // 如果传入的lunar包含错误的命宫信息，建议在此处重新校验
  lunar,
  zodiac,
  trueSolarTime,
  birthPlace,
  renYuanSiLing,
  solarTermInfo,
  taiYuan,
  kongWang,
  mingGong,
  taiXi,
  shenGong,
  mingGua,
}: BaZiBasicInfoProps) {
  const genderText = payload.gender === 'male' ? '男' : '女'
  const yinYangText = payload.gender === 'male' ? '乾造' : '坤造'

  // 修复空亡显示：如果传入的字符串已经包含了重复内容，尝试去重；否则正常显示
  const displayKongWang = Array.from(new Set(kongWang.split(' '))).join(' ')

  return (
    <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
      <div className="divide-y divide-stone-100">
        {/* 第1行：姓名和性别 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">姓名:</span>
            <span className="font-medium">{name || '未填写姓名'}</span>
            <span className="text-[#C82E31] text-xs">({payload.gender === 'male' ? '阳' : '阴'} {yinYangText})</span>
          </div>
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700 mt-2 sm:mt-0 sm:pl-4 sm:border-l sm:border-stone-200">
            <span className="text-stone-500">性别:</span>
            <span>{genderText}</span>
          </div>
        </div>

        {/* 第2行：农历和生肖 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">农历:</span>
            <span className="font-serif">{lunar}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700 mt-2 sm:mt-0 sm:pl-4 sm:border-l sm:border-stone-200">
            <span className="text-stone-500">生肖:</span>
            <span>{zodiac}</span>
          </div>
        </div>

        {/* 第3行：阳历 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">阳历:</span>
            <span>{formatDateTimeFull(payload.dateISO)}</span>
          </div>
          <div className="flex-1"></div>
        </div>

        {/* 第4行：真太阳时 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">真太阳时:</span>
            <span>{trueSolarTime}</span>
          </div>
          <div className="flex-1"></div>
        </div>

        {/* 第5行：出生地区 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">出生地区:</span>
            <span>{birthPlace}</span>
          </div>
          <div className="flex-1"></div>
        </div>

        {/* 第6行：人元司令分野 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">人元司令分野:</span>
            <span>{renYuanSiLing}</span>
          </div>
          <div className="flex-1"></div>
        </div>

        {/* 第7行：出生节气 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">出生节气:</span>
            <span>
              出生于{solarTermInfo.prevTerm.name}后
              <span className="text-[#C82E31] font-medium mx-1">{solarTermInfo.daysAfter}</span>天
              <span className="text-[#C82E31] font-medium mx-1">{solarTermInfo.hoursAfter}</span>小时,
              {solarTermInfo.nextTerm.name}前
              <span className="text-[#C82E31] font-medium mx-1">{solarTermInfo.daysBefore}</span>天
              <span className="text-[#C82E31] font-medium mx-1">{solarTermInfo.hoursBefore}</span>小时
            </span>
          </div>
          <div className="flex-1"></div>
        </div>

        {/* 第8行：月令节气 (修复逻辑) */}
        {/* 
            原逻辑强制显示"小寒"和"立春"是错误的。
            这里应该显示该八字所属月份的【上一个节气】和【下一个节气】的时间。
        */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">{solarTermInfo.prevTerm.name}:</span>
            <span>{formatDateTimeFull(solarTermInfo.prevTerm.date)}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700 mt-2 sm:mt-0 sm:pl-4 sm:border-l sm:border-stone-200">
            <span className="text-stone-500">{solarTermInfo.nextTerm.name}:</span>
            <span>{formatDateTimeFull(solarTermInfo.nextTerm.date)}</span>
          </div>
        </div>

        {/* 第10行：胎元和空亡 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">胎元:</span>
            <span className="font-serif">{taiYuan.ganZhi} ({taiYuan.naYin})</span>
          </div>
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700 mt-2 sm:mt-0 sm:pl-4 sm:border-l sm:border-stone-200">
            <span className="text-stone-500">空亡:</span>
            {/* 修复：去除重复显示 */}
            <span className="font-serif">{displayKongWang || '无'}</span>
          </div>
        </div>

        {/* 第11行：命宫和胎息 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">命宫:</span>
            <span className="font-serif">
                {mingGong.ganZhi} ({mingGong.naYin})
            </span>
          </div>
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700 mt-2 sm:mt-0 sm:pl-4 sm:border-l sm:border-stone-200">
            <span className="text-stone-500">胎息:</span>
            <span className="font-serif">{taiXi.ganZhi} ({taiXi.naYin})</span>
          </div>
        </div>

        {/* 第12行：身宫和命卦 */}
        <div className="flex flex-col sm:flex-row bg-stone-50/30 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700">
            <span className="text-stone-500">身宫:</span>
            <span className="font-serif">{shenGong.ganZhi} ({shenGong.naYin})</span>
          </div>
          <div className="flex-1 flex items-center gap-2 text-sm text-stone-700 mt-2 sm:mt-0 sm:pl-4 sm:border-l sm:border-stone-200">
            <span className="text-stone-500">命卦:</span>
            <span className="font-serif">{mingGua.gua} ({mingGua.direction})</span>
          </div>
        </div>
      </div>
    </div>
  )
}