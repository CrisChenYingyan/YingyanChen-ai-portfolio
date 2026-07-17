/* POST /api/sql-gen — 据表结构+自然语言问题生成带注释 SQL
   入参 {schema, question} → 出参 {ok, sql} */
const { guard, askClaude } = require('./_claude');

module.exports = async (req, res) => {
  if (guard(req, res)) return;
  try {
    const { schema, question } = req.body || {};
    if (!schema || !question) return res.status(400).json({ ok: false, note: '缺少 schema 或 question' });
    const system =
      '你是 SQL 专家。目标数据库为 SQLite（sql.js，在浏览器内执行）。' +
      '根据表结构和用户的自然语言问题，写一条可直接执行的 SQL：' +
      '每个关键子句配中文注释（-- 开头）；只用给定表和列；不使用 SQLite 不支持的语法。' +
      '只输出 SQL 语句本身，不要 Markdown 代码块标记，不要解释文字。';
    const user = '表结构：' + schema + '\n\n问题：' + question;
    let out = await askClaude(system, user, 800);
    out = out.replace(/^```sql\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    res.status(200).json({ ok: true, sql: out });
  } catch (e) {
    res.status(502).json({ ok: false, note: '调用失败：' + e.message });
  }
};
