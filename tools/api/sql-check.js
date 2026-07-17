/* POST /api/sql-check — 校验用户写的 SQL 是否能回答问题
   入参 {schema, question, sql} → 出参 {ok, pass, advice} */
const { guard, askClaude, extractJSON } = require('./_claude');

module.exports = async (req, res) => {
  if (guard(req, res)) return;
  try {
    const { schema, question, sql } = req.body || {};
    if (!schema || !question || !sql) return res.status(400).json({ ok: false, note: '缺少 schema / question / sql' });
    const system =
      '你是 SQL 面试官。判断学生的 SQL（SQLite 方言）能否正确回答问题：' +
      '检查语法、表/列名、逻辑（分组、去重、边界、NULL 处理）。' +
      '只输出 JSON：{"pass":true或false,"advice":"一段中文点评：错在哪/怎么改/更优写法"}。';
    const user = '表结构：' + schema + '\n问题：' + question + '\n学生 SQL：\n' + sql;
    const out = await askClaude(system, user, 800);
    const j = extractJSON(out);
    res.status(200).json({ ok: true, pass: !!j.pass, advice: j.advice });
  } catch (e) {
    res.status(502).json({ ok: false, note: '调用失败：' + e.message });
  }
};
