export interface HexagramResult {
  name: string;
  interpretation: string;
}

export const hexagrams: Record<string, HexagramResult> = {
  "111111": { name: "乾", interpretation: "元亨利贞。" },
  "000000": { name: "坤", interpretation: "元亨，利牝马之贞。" },
  "100010": { name: "屯", interpretation: "元亨利贞，勿用有攸往，利建侯。" },
  "010001": { name: "蒙", interpretation: "亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。" },
  "111010": { name: "需", interpretation: "有孚，光亨，贞吉。利涉大川。" },
  "010111": { name: "讼", interpretation: "有孚，窒惕，中吉。终凶。利见大人，不利涉大川。" },
  "000010": { name: "师", interpretation: "贞，丈人吉，无咎。" },
  "010000": { name: "比", interpretation: "吉。原筮，元永贞，无咎。不宁方来，后夫凶。" },
  "111011": { name: "小畜", interpretation: "亨。密云不雨，自我西郊。" },
  "110111": { name: "履", interpretation: "履虎尾，不咥人，亨。" },
  "111000": { name: "泰", interpretation: "小往大来，吉亨。" },
  "000111": { name: "否", interpretation: "否之匪人，不利君子贞，大往小来。" },
  "111101": { name: "同人", interpretation: "同人于野，亨。利涉大川，利君子贞。" },
  "101111": { name: "大有", interpretation: "元亨。" },
  "001000": { name: "谦", interpretation: "亨，君子有终。" },
  "000100": { name: "豫", interpretation: "利建侯行师。" },
  "100110": { name: "随", interpretation: "元亨利贞，无咎。" },
  "011001": { name: "蛊", interpretation: "元亨，利涉大川。先甲三日，后甲三日。" },
  "110000": { name: "临", interpretation: "元亨利贞。至于八月有凶。" },
  "000011": { name: "观", interpretation: "盥而不荐，有孚颙若。" },
  "101001": { name: "噬嗑", interpretation: "亨。利用狱。" },
  "100101": { name: "贲", interpretation: "亨。小利有攸往。" },
  "000001": { name: "剥", interpretation: "不利有攸往。" },
  "100000": { name: "复", interpretation: "亨。出入无疾，朋来无咎。反复其道，七日来复，利有攸往。" },
  "111001": { name: "无妄", interpretation: "元亨利贞。其匪正有眚，不利有攸往。" },
  "100111": { name: "大畜", interpretation: "利贞，不家食吉，利涉大川。" },
  "100001": { name: "颐", interpretation: "贞吉。观颐，自求口实。" },
  "011110": { name: "大过", interpretation: "栋桡，利有攸往，亨。" },
  "010010": { name: "坎", interpretation: "习坎，有孚，维心亨，行有尚。" },
  "101101": { name: "离", interpretation: "利贞，亨。畜牝牛，吉。" },
  "011100": { name: "咸", interpretation: "亨，利贞。取女吉。" },
  "001110": { name: "恒", interpretation: "亨，无咎，利贞。利有攸往。" },
  "111100": { name: "遁", interpretation: "亨。小利贞。" },
  "001111": { name: "大壮", interpretation: "利贞。" },
  "100011": { name: "晋", interpretation: "康侯用锡马蕃庶，昼日三接。" },
  "000101": { name: "明夷", interpretation: "利艰贞。" },
  "101011": { name: "家人", interpretation: "利女贞。" },
  "110101": { name: "睽", interpretation: "小事吉。" },
  "010100": { name: "蹇", interpretation: "利西南，不利东北。利见大人，贞吉。" },
  "001010": { name: "解", interpretation: "利西南。无所往，其来复吉。有攸往，夙吉。" },
  "110001": { name: "损", interpretation: "有孚，元吉，无咎，可贞。利有攸往。" },
  "001011": { name: "益", interpretation: "利有攸往，利涉大川。" },
  "111110": { name: "夬", interpretation: "扬于王庭，孚号，有厉。告自邑，不利即戎，利有攸往。" },
  "011111": { name: "姤", interpretation: "女壮，勿用取女。" },
  "010110": { name: "困", interpretation: "亨，贞，大人吉，无咎。有言不信。" },
  "011010": { name: "井", interpretation: "改邑不改井，无丧无得，往来井井。" },
  "001001": { name: "震", interpretation: "亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。" },
  "100100": { name: "艮", interpretation: "艮其背，不获其身，行其庭，不见其人，无咎。" },
  "011011": { name: "渐", interpretation: "女归吉，利贞。" },
  "110110": { name: "归妹", interpretation: "征凶，无攸利。" },
  "101100": { name: "丰", interpretation: "亨，王假之，勿忧，宜日中。" },
  "001101": { name: "旅", interpretation: "小亨，旅贞吉。" },
  "110010": { name: "中孚", interpretation: "豚鱼吉，利涉大川，利贞。" },
  "010011": { name: "小过", interpretation: "亨，利贞。可小事，不可大事。飞鸟遗之音，不宜上，宜下，大吉。" },
  "101010": { name: "既济", interpretation: "亨，小利贞。初吉终乱。" },
  "010101": { name: "未济", interpretation: "亨。小狐汔济，濡其尾，无攸利。" }
};

export const getHexagramResult = (binary: string): HexagramResult => {
  return hexagrams[binary] ?? {
    name: '未知',
    interpretation: '暂无解读，请检查卦象数据。'
  };
};

