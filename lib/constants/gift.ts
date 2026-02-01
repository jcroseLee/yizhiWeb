export enum GiftType {
  SALUTE = 'SALUTE',
  TEA = 'TEA',
  FLAG = 'FLAG',
  OFFERING = 'OFFERING',
}

export const GIFT_PRICES: Record<GiftType, number> = {
  [GiftType.SALUTE]: 0,
  [GiftType.TEA]: 10,
  [GiftType.FLAG]: 50,
  [GiftType.OFFERING]: 100,
};

export const GIFT_NAMES: Record<GiftType, string> = {
  [GiftType.SALUTE]: '抱拳',
  [GiftType.TEA]: '清茶',
  [GiftType.FLAG]: '锦旗',
  [GiftType.OFFERING]: '供养',
};
