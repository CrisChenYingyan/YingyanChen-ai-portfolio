/* ============================================================
   i18n.js — 工具页静态文案双语引擎（与作品集主页共用 localStorage 键 site_lang）
   用法：页面先定义  window.I18N_EN = { key: "english html", ... }
        （可选）window.I18N_EN_TITLE = "English <title>"
        再引入本文件（放在 </body> 前、内容之后）。
   机制：中文写在 HTML 元素里 + data-i18n="key"；英文放 I18N_EN 同名 key。
   与 wizard.js 协作：切换后调用 window.wizardRelang()（若存在）让向导整块重渲染。
   ★ 以后改任何工具页文案：中文(HTML) 与英文(I18N_EN) 两处必须同步。
   ============================================================ */
(function () {
  var EN = window.I18N_EN || {};
  var EN_TITLE = window.I18N_EN_TITLE || null;
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-i18n]'));
  var ZH = new Map();
  var ZH_TITLE = document.title;
  els.forEach(function (el) { ZH.set(el, el.innerHTML); });
  var btn = document.getElementById('langBtn');

  function apply(lang) {
    var en = (lang === 'en');
    els.forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (en) { if (EN[k] != null) el.innerHTML = EN[k]; }
      else { el.innerHTML = ZH.get(el); }
    });
    document.documentElement.lang = en ? 'en' : 'zh-CN';
    document.documentElement.setAttribute('data-lang', en ? 'en' : 'zh');
    if (EN_TITLE) document.title = en ? EN_TITLE : ZH_TITLE;
    if (btn) {
      btn.textContent = en ? '中文' : 'EN';
      btn.setAttribute('aria-label', en ? '切换到中文 / Switch to Chinese' : '切换到英文 / Switch to English');
    }
    try { localStorage.setItem('site_lang', en ? 'en' : 'zh'); } catch (e) { }
    if (typeof window.wizardRelang === 'function') window.wizardRelang();
  }

  var saved;
  try { saved = localStorage.getItem('site_lang'); } catch (e) { }
  apply(saved === 'en' ? 'en' : 'zh');   // 默认中文，跟随作品集主页的选择

  if (btn) btn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-lang') || 'zh';
    apply(cur === 'en' ? 'zh' : 'en');
  });
})();
