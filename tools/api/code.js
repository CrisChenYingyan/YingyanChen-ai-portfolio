/* POST /api/code — 开放题逐条归类（AI 建议，需人工复核）
   入参 {answer, codebook} → 出参 {ok, category, confidence} */
const { guard, askClaude, extractJSON } = require('./_claude');

module.exports = async (req, res) => {
  if (guard(req, res)) return;
  try {
    const { answer, codebook } = req.body || {};
    if (!answer || !codebook) return res.status(400).json({ ok: false, note: '缺少 answer 或 codebook' });
    const system =
      '你是内容分析编码员。按给定编码簿把答案归入唯一类目；无法归入时用"其他"。' +
      '只输出 JSON：{"category":"类目名","confidence":0到1的小数,"reason":"一句话依据"}。';
    const user = '编码簿（类目 | 定义 | 例句）：\n' + codebook + '\n\n待编码答案：' + answer;
    const out = await askClaude(system, user, 300);
    const j = extractJSON(out);
    res.status(200).json({ ok: true, category: j.category, confidence: j.confidence, reason: j.reason });
  } catch (e) {
    res.status(502).json({ ok: false, note: '调用失败：' + e.message });
  }
};
