/* ============================================================
   _claude.js — 5 个接口共用的辅助函数（Anthropic Messages API + CORS）
   文件名以 _ 开头：Vercel 不会把它暴露成接口，仅供其他函数 require。
   依赖：Node 18+（Vercel 默认运行时，自带 fetch），无需 npm install。
   ============================================================ */
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.MODEL || 'claude-sonnet-5'; // 可在 Vercel 环境变量里改

/** CORS + 方法校验 + key 检查。返回 true 表示请求已被处理（直接 return）。 */
function guard(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, note: '仅支持 POST' }); return true; }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ ok: false, note: '服务端未配置 ANTHROPIC_API_KEY（在 Vercel 项目 Settings → Environment Variables 添加）' });
    return true;
  }
  return false;
}

/** 调用 Claude，返回纯文本回复。 */
async function askClaude(system, user, maxTokens) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens || 1500,
      system: system,
      messages: [{ role: 'user', content: user }]
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || ('Anthropic API HTTP ' + r.status));
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

/** 从模型回复中稳妥地抠出 JSON（模型偶尔会包 ```json ... ``` 或加说明文字）。 */
function extractJSON(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/);
  const raw = m ? m[1] : text;
  const s = raw.indexOf('{') >= 0 && (raw.indexOf('{') < raw.indexOf('[') || raw.indexOf('[') < 0)
    ? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    : raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
  return JSON.parse(s);
}

module.exports = { guard, askClaude, extractJSON };
