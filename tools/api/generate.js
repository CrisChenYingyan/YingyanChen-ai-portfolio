/* POST /api/generate — 据研究问题批量出题（草稿，需人工核）
   入参 {question, dims} → 出参 {ok, items:[{dim, type, text, options?}]} */
const { guard, askClaude, extractJSON } = require('./_claude');

module.exports = async (req, res) => {
  if (guard(req, res)) return;
  try {
    const { question, dims } = req.body || {};
    if (!question) return res.status(400).json({ ok: false, note: '缺少 question' });
    const system =
      '你是问卷与访谈设计专家（遵循 Schwarz 1999 措辞规范、Tourangeau 应答四阶段）。' +
      '根据研究问题与维度生成题目草稿。要求：单一命题、无诱导词、无双重否定、选项互斥穷尽。' +
      '只输出 JSON 数组，每项 {"dim":"所属维度","type":"单选|多选|量表|开放","text":"题干","options":["…"]}（开放题无 options）。';
    const user = '研究问题：' + question + (dims ? ('\n维度：' + (Array.isArray(dims) ? dims.join('、') : dims)) : '');
    const out = await askClaude(system, user, 3000);
    res.status(200).json({ ok: true, items: extractJSON(out) });
  } catch (e) {
    res.status(502).json({ ok: false, note: '调用失败：' + e.message });
  }
};
