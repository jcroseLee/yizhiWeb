import { createSupabaseAdmin } from '@/lib/api/supabase-admin';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// 1. 配置 DeepSeek Provider
// 强制使用 /v1 结尾的 URL，这是最稳妥的
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
    // Fix: Redirect /responses to /chat/completions
    // Some versions of AI SDK might default to /responses for certain configurations
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
  const { question, background, guaData, idempotencyKey, mode } = body;
  const analysisMode = mode === 'preview' || mode === 'full' ? mode : mode == null ? 'full' : null;
  if (!analysisMode) {
    return new Response(JSON.stringify({ error: 'Invalid mode' }), { status: 400 });
  }

  // 3. 扣费逻辑
  let requestId: string | null = null;
  let isReplay = false;

  const skipAiPayment = process.env.SKIP_AI_PAYMENT === 'false';

  if (analysisMode === 'full' && !skipAiPayment && user && supabase) {
    const COST = 50;
    // 使用 RPC 进行幂等扣费
    const key = idempotencyKey || `auto-${Date.now()}-${Math.random()}`; // Fallback key

    const { data: transactionResult, error: transactionError } = await supabase.rpc('consume_yi_coins_idempotent', {
         p_user_id: user.id,
         p_amount: COST,
         p_idempotency_key: key,
         p_description: `AI 详批：${question ? question.substring(0, 10) + '...' : '未知问题'}`
    });

    if (transactionError) {
         console.error('Payment RPC Error:', transactionError);
         return new Response(JSON.stringify({ error: '支付系统错误，请联系客服' }), { status: 500 });
    }

    if (!transactionResult.success) {
         // 如果是重复请求且状态为 failed/refunded，RPC 返回 false
         // 或者余额不足
         const msg = transactionResult.message === 'Insufficient balance' ? '余额不足，请先充值' : transactionResult.message;
         return new Response(JSON.stringify({ error: msg }), { status: 402 });
    }

    requestId = transactionResult.request_id;
    isReplay = transactionResult.is_replay;
    
    if (isReplay) {
        // 如果是重放请求，尝试获取已有的结果
        if (requestId && supabase) {
            const { data: existingRequest } = await supabase
                .from('ai_analysis_requests')
                .select('result_payload, status')
                .eq('id', requestId)
                .single();
            
            // 如果已经有结果，直接返回缓存的结果
            if (existingRequest?.result_payload?.content) {
                return new Response(existingRequest.result_payload.content, {
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                });
            }
            
            // 如果还在处理中，或者没有结果，阻止重复调用 AI
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
    const promptContext = constructPrompt(question, background, guaData);

    console.log('Calling DeepSeek API...');

    // 使用 streamText
    const result = await streamText({
      model: deepseek.chat('deepseek-chat'), // 强制使用 chat 模式
      messages: [
        {
          role: 'system',
          content:
            analysisMode === 'preview'
              ? `你是一位精通《增删卜易》与《卜筮正宗》的易学研究者。
分析风格：
1. **严谨客观**：依据五行生克、旺衰、动变推导。
2. **结构清晰**：按【用神->旺衰->动变->吉凶->建议】步骤。
3. **格式要求**：使用 Markdown，重点加粗。
输出要求：
1. 仅输出“预览版”，内容尽量精炼。
2. 总长度控制在约 20% 的详批量级（建议 400-600 字）。`
              : `你是一位精通《增删卜易》与《卜筮正宗》的易学研究者。
            分析风格：
            1. **严谨客观**：依据五行生克、旺衰、动变推导。
            2. **结构清晰**：按【用神->旺衰->动变->吉凶->建议】步骤。
            3. **格式要求**：使用 Markdown，重点加粗。`
        },
        { role: 'user', content: promptContext }
      ],
      temperature: 0.3,
      maxOutputTokens: analysisMode === 'preview' ? 900 : undefined,
       onFinish: async ({ text }) => {
         if (analysisMode === 'full' && requestId && supabase) {
             // 保存结果并标记完成
             await supabase.from('ai_analysis_requests').update({
                 status: 'completed',
                 result_payload: { content: text },
                 updated_at: new Date().toISOString()
             }).eq('id', requestId);
         }
       }
    });

    console.log('StreamText Result Keys:', Object.keys(result));
    
    // 返回流式响应
    return result.toTextStreamResponse();

  } catch (error) {
    console.error('AI Analysis Error:', error);

    // 失败退款逻辑
    // 只要有 requestId，且 AI 分析失败，就尝试退款。
    // 即使是重放请求 (isReplay=true)，如果本次尝试失败了，说明用户最终没有得到结果。
    // 为了防止"白扣"（扣了钱没给结果），我们执行退款。
    // RPC `refund_ai_analysis` 内部有状态检查，防止重复退款。
    // 虽然存在极端竞态（原请求成功但连接断开，重试请求失败导致退款），
    // 但优先保障用户资金安全是首要原则。
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
            description: `AI Analysis Refund: ${error instanceof Error ? error.message : String(error)}`,
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

interface LineDetail {
  animalShort?: string;
  relationShort?: string;
  stem?: string;
  branch?: string;
  element?: string;
  isShi?: boolean;
  isYing?: boolean;
  [key: string]: unknown;
}

interface GuaData {
  date?: string | number | Date;
  stems?: { char: string }[];
  branches?: { char: string }[];
  kongWang?: string | unknown;
  originalFullInfo?: { name: string };
  originalNature?: { nature: string };
  changedFullInfo?: { name: string };
  lineDetails?: LineDetail[];
  hasMovingLines?: boolean;
  changedLineDetails?: LineDetail[];
  [key: string]: unknown;
}

function constructPrompt(question: string, background: string, data: GuaData) {
  if (!data) return `用户未提供排盘数据。问题：${question}`;

  const date = data.date ? new Date(data.date).toLocaleString('zh-CN') : '未知';
  const stems = data.stems || [];
  const branches = data.branches || [];
  
  const yearStem = (stems[0]?.char || '') + (branches[0]?.char || '');
  const monthStem = (stems[1]?.char || '') + (branches[1]?.char || '');
  const dayStem = (stems[2]?.char || '') + (branches[2]?.char || '');
  const timeStem = (stems[3]?.char || '') + (branches[3]?.char || '');
  
  const kongWang = typeof data.kongWang === 'string' ? data.kongWang : JSON.stringify(data.kongWang);
  
  const originalName = data.originalFullInfo?.name || '未知';
  const originalNature = data.originalNature?.nature || '';
  const changedName = data.changedFullInfo?.name || '无变卦';
  
  let linesDesc = '';
  if (data.lineDetails && Array.isArray(data.lineDetails)) {
      data.lineDetails.forEach((line: LineDetail, index: number) => {
          const position = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][index];
          const animal = line.animalShort || '';
          const relation = line.relationShort || '';
          const ganzhi = (line.stem || '') + (line.branch || '') + (line.element || '');
          const statusParts = [];
          if (line.isShi) statusParts.push('世');
          if (line.isYing) statusParts.push('应');
          const status = statusParts.length > 0 ? `[${statusParts.join('')}]` : '';
          
          let changing = '';
          if (data.hasMovingLines && data.changedLineDetails && data.changedLineDetails[index]) {
              const cl = data.changedLineDetails[index];
              if (cl) {
                 changing = `动化 ${cl.relationShort} (${cl.stem}${cl.branch}${cl.element})`;
              }
          } else {
             changing = '静';
          }
          
          linesDesc += `- ${position}: ${animal} ${relation} ${ganzhi} ${status} ${changing}\n`;
      });
  }

  return `请根据以下排盘信息，分析用户的问题。

【用户求测】
问题：${question}
背景：${background || '无详细背景'}

【天时参数】
排盘时间：${date}
干支：${yearStem}年 ${monthStem}月 ${dayStem}日 ${timeStem ? timeStem + '时' : ''}
月建：${monthStem}，日辰：${dayStem}
旬空：${kongWang}

【卦象结构】
本卦：${originalName} (${originalNature})
变卦：${changedName}
六爻详情：
${linesDesc}

【分析要求】
1. **定用神**：根据问题“${question}”，判断应该取哪个六亲为用神？
2. **判旺衰**：分析用神在月建、日辰下的旺衰状态（如月破、日冲、长生等）。
3. **看动变**：分析动爻对用神是生、克、冲、合？有无回头克、回头生？
4. **断吉凶**：综合以上给出吉凶趋势（百分比概率）。
5. **给建议**：基于卦象给出理性的行动建议。
`;
}
