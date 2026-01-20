import { createSupabaseAdmin } from '@/lib/api/supabase-admin';
import { type BaZiPillar, type BaZiResult } from '@/lib/utils/bazi';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// 1. 配置 DeepSeek Provider
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '') + '/v1';

const deepseek = createOpenAI({
  apiKey: apiKey || 'dummy-key',
  baseURL: baseURL,
  fetch: async (url, options) => {
    console.log('DeepSeek Fetch URL:', url.toString());
    if (options && options.body) {
        console.log('DeepSeek Fetch Body:', options.body);
    }
    
    let finalUrl = url.toString();
    if (finalUrl.includes('/responses')) {
        finalUrl = finalUrl.replace('/responses', '/chat/completions');
        console.log('Redirecting /responses to:', finalUrl);
    } 
    
    return fetch(finalUrl, options);
  }
});

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. 验证配置
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), { status: 500 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = !authError ? authData.user : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }
  const { name, gender, dateISO, result, idempotencyKey, mode } = body;
  const analysisMode = mode === 'preview' || mode === 'full' ? mode : mode == null ? 'full' : null;
  if (!analysisMode) {
    return new Response(JSON.stringify({ error: 'Invalid mode' }), { status: 400 });
  }

  if (!result || !result.pillars || !Array.isArray(result.pillars)) {
    return new Response(JSON.stringify({ error: 'Invalid BaZi data: missing pillars' }), { status: 400 });
  }

  // 3. 扣费逻辑
  let requestId: string | null = null;
  let isReplay = false;

  const skipAiPayment = process.env.SKIP_AI_PAYMENT === 'false';

  if (analysisMode === 'full' && !skipAiPayment && user && supabase) {
    const COST = 50;
    const key = idempotencyKey || `auto-${Date.now()}-${Math.random()}`;

    const { data: transactionResult, error: transactionError } = await supabase.rpc('consume_yi_coins_idempotent', {
         p_user_id: user.id,
         p_amount: COST,
         p_idempotency_key: key,
         p_description: `AI 八字详批：${name || '未知姓名'}`
    });

    if (transactionError) {
         console.error('Payment RPC Error:', transactionError);
         return new Response(JSON.stringify({ error: '支付系统错误，请联系客服' }), { status: 500 });
    }

    if (!transactionResult.success) {
         const msg = transactionResult.message === 'Insufficient balance' ? '余额不足，请先充值' : transactionResult.message;
         return new Response(JSON.stringify({ error: msg }), { status: 402 });
    }

    requestId = transactionResult.request_id;
    isReplay = transactionResult.is_replay;
    
    if (isReplay) {
        if (requestId && supabase) {
            const { data: existingRequest } = await supabase
                .from('ai_analysis_requests')
                .select('result_payload, status')
                .eq('id', requestId)
                .single();
            
            if (existingRequest?.result_payload?.content) {
                return new Response(existingRequest.result_payload.content, {
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                });
            }
            
            if (existingRequest?.status === 'processing') {
                 return new Response(JSON.stringify({ error: 'AI 正在分析中，请稍候...' }), { status: 429 });
            } else {
                 return new Response(JSON.stringify({ error: '请求已提交，请查看历史记录或稍后重试' }), { status: 409 });
            }
        }
    }
  }

  // 4. 执行 AI 分析
  try {
    const promptContext = constructBaZiPrompt(name, gender, dateISO, result);

    console.log('Calling DeepSeek API for BaZi analysis...');

    const result_stream = await streamText({
      model: deepseek.chat('deepseek-chat'),
      messages: [
        {
          role: 'system',
          content:
            analysisMode === 'preview'
              ? `你是一位精通《三命通会》、《穷通宝鉴》与《滴天髓》的八字命理研究者。
分析风格：
1. **严谨客观**：依据五行生克、十神关系、格局旺衰推导。
2. **结构清晰**：按【命局分析->五行旺衰->十神格局->大运流年->性格特征->事业财运->感情婚姻->健康建议】步骤。
3. **格式要求**：使用 Markdown，重点加粗，分段落清晰。
4. **实证导向**：结合具体干支组合，避免空泛套话。
5. 不要写“由 DeepSeek 生成”等字样。
输出要求：
1. 仅输出“预览版”，内容尽量精炼。
2. 总长度控制在约 20% 的详批量级（建议 400-600 字）。`
              : `你是一位精通《三命通会》、《穷通宝鉴》与《滴天髓》的八字命理研究者。
分析风格：
1. **严谨客观**：依据五行生克、十神关系、格局旺衰推导。
2. **结构清晰**：按【命局分析->五行旺衰->十神格局->大运流年->性格特征->事业财运->感情婚姻->健康建议】步骤。
3. **格式要求**：使用 Markdown，重点加粗，分段落清晰。
4. **实证导向**：结合具体干支组合，避免空泛套话。
5. 不要写“由 DeepSeek 生成”等字样。`
        },
        { role: 'user', content: promptContext }
      ],
      temperature: 0.3,
      maxOutputTokens: analysisMode === 'preview' ? 1000 : undefined,
       onFinish: async ({ text }) => {
         if (analysisMode === 'full' && requestId && supabase) {
             await supabase.from('ai_analysis_requests').update({
                 status: 'completed',
                 result_payload: { content: text },
                 updated_at: new Date().toISOString()
             }).eq('id', requestId);
         }
       }
    });

    console.log('StreamText Result Keys:', Object.keys(result_stream));
    
    return result_stream.toTextStreamResponse();

  } catch (error) {
    console.error('AI BaZi Analysis Error:', error);

    if (analysisMode === 'full') {
      if (requestId && supabase) {
        await supabase.rpc('refund_ai_analysis', {
          p_request_id: requestId,
          p_reason: error instanceof Error ? error.message : String(error),
        });
      } else if (supabase && user && !requestId) {
        const COST = 50;
        const { data: profile } = await supabase
          .from('profiles')
          .select('yi_coins')
          .eq('id', user.id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ yi_coins: (profile.yi_coins || 0) + COST })
            .eq('id', user.id);

          await supabase.from('coin_transactions').insert({
            user_id: user.id,
            amount: COST,
            type: 'refund',
            description: `AI BaZi Analysis Refund: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    }

    return new Response(JSON.stringify({ 
      error: 'AI 服务暂时繁忙，请重试',
      details: error instanceof Error ? error.message : String(error)
    }), { status: 500 });
  }
}

function constructBaZiPrompt(name: string | undefined, gender: string, dateISO: string, result: BaZiResult) {
  if (!result || !result.pillars || result.pillars.length !== 4) {
    return `用户未提供完整的八字排盘数据。姓名：${name || '未知'}，性别：${gender}，日期：${dateISO}`;
  }

  const basic = result.basic || {};
  const pillars = result.pillars;

  // 构建四柱信息
  let pillarsDesc = '';
  pillars.forEach((pillar: BaZiPillar) => {
    const gan = pillar.gan.char;
    const zhi = pillar.zhi.char;
    const ganWuxing = pillar.gan.wuxing;
    const zhiWuxing = pillar.zhi.wuxing;
    const zhuXing = pillar.zhuXing || '';
    const naYin = pillar.naYin || '';
    const shenSha = pillar.shenSha && pillar.shenSha.length > 0 ? pillar.shenSha.join('、') : '无';
    const xingYun = pillar.xingYun || '';
    const ziZuo = pillar.ziZuo || '';
    const kongWang = pillar.kongWang || '';
    
    // 藏干信息
    let cangGanDesc = '';
    if (pillar.cangGan && pillar.cangGan.length > 0) {
      cangGanDesc = pillar.cangGan.map(cg => `${cg.char}(${cg.wuxing})`).join('、');
    }
    
    pillarsDesc += `**${pillar.label}**：${gan}(${ganWuxing}) ${zhi}(${zhiWuxing})
  - 十神：${zhuXing}
  - 纳音：${naYin}
  - 神煞：${shenSha}
  - 行运：${xingYun}
  - 自坐：${ziZuo}
  ${cangGanDesc ? `- 藏干：${cangGanDesc}` : ''}
  ${kongWang ? `- 空亡：${kongWang}` : ''}
`;
  });

  // 日主信息（日柱天干）
  const dayGan = pillars[2]?.gan.char || '';
  const dayGanWuxing = pillars[2]?.gan.wuxing || '';
  const dayZhi = pillars[2]?.zhi.char || '';
  const dayZhiWuxing = pillars[2]?.zhi.wuxing || '';

  // 分析五行分布
  const wuxingCount: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  pillars.forEach(pillar => {
    wuxingCount[pillar.gan.wuxing] = (wuxingCount[pillar.gan.wuxing] || 0) + 1;
    wuxingCount[pillar.zhi.wuxing] = (wuxingCount[pillar.zhi.wuxing] || 0) + 1;
    if (pillar.cangGan) {
      pillar.cangGan.forEach(cg => {
        wuxingCount[cg.wuxing] = (wuxingCount[cg.wuxing] || 0) + 1;
      });
    }
  });

  const wuxingDesc = Object.entries(wuxingCount)
    .map(([wuxing, count]) => {
      const names: Record<string, string> = {
        wood: '木',
        fire: '火',
        earth: '土',
        metal: '金',
        water: '水'
      };
      return `${names[wuxing]}${count}个`;
    })
    .join('、');

  return `请根据以下八字排盘信息，进行详细的命理分析。

【基本信息】
姓名：${name || '未知'}
性别：${gender === 'male' ? '男' : '女'}
阳历：${basic.solarDate || dateISO}
${basic.trueSolarDate ? `真太阳时：${basic.trueSolarDate}` : ''}
${basic.lunarDate ? `农历：${basic.lunarDate}` : ''}
${basic.place ? `出生地：${basic.place}` : ''}
${basic.solarTerm ? `节气：${basic.solarTerm}` : ''}
${basic.zodiac ? `生肖：${basic.zodiac}` : ''}
${basic.mingGong ? `命宫：${basic.mingGong}` : ''}

【四柱八字】
${pillarsDesc}

【命局要点】
- 日主：${dayGan}(${dayGanWuxing})，坐${dayZhi}(${dayZhiWuxing})
- 五行分布：${wuxingDesc}

【分析要求】
1. **命局分析**：分析日主${dayGan}的旺衰，判断命局是身强还是身弱，以及喜用神和忌神。
2. **五行旺衰**：分析五行分布是否均衡，哪些五行过旺或过弱，对命局的影响。
3. **十神格局**：分析四柱中的十神配置，判断格局类型（如正官格、偏财格等），以及格局的优劣。
4. **性格特征**：根据日主五行、十神配置、神煞等，分析性格特点、优缺点。
5. **事业财运**：分析适合的职业方向、财运走势、事业发展建议。
6. **感情婚姻**：分析感情运势、婚姻状况、配偶特征。
7. **健康建议**：根据五行偏颇，提出健康养生建议。
8. **大运流年**：简要说明大运流年的影响规律和注意事项。

请用专业、客观、实证的语言进行分析，避免空泛的套话，要结合具体的干支组合和五行生克关系进行推导。`;
}
