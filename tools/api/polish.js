/* POST /api/polish — 规范表述/润色（问卷、PRD 等）
   入参 {text, rule, style} → 出参 {ok, text} */
const { guard, askClaude } = require('./_claude');

module.exports = async (req, res) => {
  if (guard(req, res)) return;
  try {
    const { text, rule, style } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, note: '缺少 text' });
    const system =
      '你是资深用户研究员兼产品文档专家。任务：润色用户提交的文档，' +
      '修正表述问题（诱导性提问、双重命题、不可量化的目标、缺验收标准等），' +
      '保留原有 Markdown 结构与事实内容，绝不编造数据。只输出润色后的 Markdown 全文，不要任何解释。' +
      (style ? ('\n文档类型/风格：' + style) : '') +
      (rule ? ('\n额外规则：' + rule) : '');
    const out = await askClaude(system, text, 4000);
    res.status(200).json({ ok: true, text: out });
  } catch (e) {
    res.status(502).json({ ok: false, note: '调用失败：' + e.message });
  }
};
