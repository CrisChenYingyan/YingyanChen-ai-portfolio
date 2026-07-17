/* ============================================================
   wizard.js — 通用分步向导引擎（4 个工具共用）· 中英双语版
   用法：new Wizard(config).mount('#app')
   config = {
     key:'prd', apiBase:'',
     steps:[ { title, intro, fields:[ field ] } ],
     buildPreview(state, lang) -> markdown string
   }
   field = { name, label, hint, type:'text|textarea|select|radio|checks|lines|static',
             options:[...], html:'', check(value,state)->{level,msg}|null }
   ★ 双语：任何面向用户的字符串都可写成 {zh:'中文', en:'English'}；引擎用当前语言渲染。
     options 每项可写成 {v:'稳定键', zh:'中文', en:'English'}（v 用于存储与逻辑，label 随语言变）；
     也兼容纯字符串（此时 值=标签，中英一致）。
   ============================================================ */
(function (global) {
  'use strict';

  function curLang() { return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'zh'; }
  // L：字符串原样返回；{zh,en} 按当前语言取
  function L(s) {
    if (s && typeof s === 'object' && !Array.isArray(s) && (s.zh != null || s.en != null)) {
      var v = s[curLang()]; return v != null ? v : s.zh;
    }
    return s;
  }
  function optVal(o) { return (o && typeof o === 'object') ? o.v : o; }
  function optLabel(o) { if (o && typeof o === 'object') { var v = o[curLang()]; return v != null ? v : o.zh; } return o; }

  // 引擎内置 UI 文案（按钮/标签）
  var UI = {
    zh: { prev: '← 上一步', next: '下一步 →', done: '完成 ✓', preview: '实时预览', exportMd: '导出 .md', ai: '✨ AI 润色', aiing: '润色中…', fillFirst: '请先填写内容再润色。', aiFail: '润色失败，请稍后重试。', previewPh: '_(填写后此处生成预览)_' },
    en: { prev: '← Back', next: 'Next →', done: 'Done ✓', preview: 'Live preview', exportMd: 'Export .md', ai: '✨ AI polish', aiing: 'Polishing…', fillFirst: 'Please fill in some content first.', aiFail: 'Polishing failed, please try again later.', previewPh: '_(preview appears here once you fill in the fields)_' }
  };
  function ui(k) { return UI[curLang()][k]; }

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }

  // 极简 Markdown → HTML（够预览用：# 标题 / - 列表 / **粗** / `码` / ``` 块 / 表格 | | ）
  function md2html(md) {
    var lines = (md || '').split('\n'), out = [], inCode = false, inList = false, tbl = null;
    function closeList() { if (inList) { out.push('</ul>'); inList = false; } }
    function closeTbl() { if (tbl) { out.push(renderTbl(tbl)); tbl = null; } }
    function inline(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    }
    function renderTbl(rows) {
      var h = '<table><thead><tr>' + rows[0].map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      for (var i = 2; i < rows.length; i++) h += '<tr>' + rows[i].map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
      return h + '</tbody></table>';
    }
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (/^```/.test(ln)) { closeList(); closeTbl(); if (!inCode) { out.push('<pre>'); inCode = true; } else { out.push('</pre>'); inCode = false; } continue; }
      if (inCode) { out.push(ln.replace(/&/g, '&amp;').replace(/</g, '&lt;')); continue; }
      if (/^\|(.+)\|/.test(ln)) { closeList(); var cells = ln.replace(/^\||\|$/g, '').split('|').map(function (s) { return s.trim(); }); if (/^[-\s|:]+$/.test(ln.replace(/\|/g, ''))) { continue; } (tbl = tbl || []).push(cells); continue; }
      closeTbl();
      if (/^#{1,3}\s/.test(ln)) { closeList(); var lv = ln.match(/^#+/)[0].length; out.push('<h' + lv + '>' + inline(ln.replace(/^#+\s/, '')) + '</h' + lv + '>'); continue; }
      if (/^[-•]\s/.test(ln)) { if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + inline(ln.replace(/^[-•]\s/, '')) + '</li>'); continue; }
      closeList();
      if (ln.trim() === '') { out.push(''); } else { out.push('<p>' + inline(ln) + '</p>'); }
    }
    closeList(); closeTbl(); if (inCode) out.push('</pre>');
    return out.join('\n');
  }

  function Wizard(cfg) {
    this.cfg = cfg;
    this.state = {};
    this.i = 0;
    this.LS = 'tool_' + cfg.key;
    try { var s = localStorage.getItem(this.LS); if (s) this.state = JSON.parse(s); } catch (e) { }
  }

  Wizard.prototype.save = function () { try { localStorage.setItem(this.LS, JSON.stringify(this.state)); } catch (e) { } };

  Wizard.prototype.mount = function (sel) {
    this._sel = sel;
    this.root = document.querySelector(sel);
    this.root.innerHTML =
      '<div class="steps" id="wz-steps"></div>' +
      '<div class="wizard">' +
      '  <div class="panel" id="wz-panel"></div>' +
      '  <div class="preview"><div class="box"><div class="bar">' + ui('preview') + ' <span><button class="btn ghost sm" id="wz-ai">' + ui('ai') + '</button> <button class="btn ghost sm" id="wz-export">' + ui('exportMd') + '</button></span></div><div class="body" id="wz-preview"></div></div></div>' +
      '</div>';
    var self = this;
    this.root.querySelector('#wz-export').onclick = function () { self.exportMd(); };
    var aiBtn = this.root.querySelector('#wz-ai');
    if (!this.cfg.apiBase) { aiBtn.disabled = true; aiBtn.title = curLang() === 'en' ? 'Enable by filling config.apiBase with your serverless endpoint after deploy (see tools/api/README.md)' : '部署 API 后在 config.apiBase 填接口地址即可启用（见 tools/api/README.md）'; }
    aiBtn.onclick = function () { self.aiPolish(aiBtn); };
    global.__wizInstance = this;
    this.render();
  };

  Wizard.prototype.render = function () {
    var self = this, cfg = this.cfg, step = cfg.steps[this.i];
    // 进度条
    var st = this.root.querySelector('#wz-steps'); st.innerHTML = '';
    cfg.steps.forEach(function (s, idx) {
      var cls = 's' + (idx === self.i ? ' active' : (idx < self.i ? ' done' : ''));
      var d = el('div', { class: cls }, '<span class="n">' + (idx < self.i ? '✓' : (idx + 1)) + '</span>' + L(s.title));
      d.onclick = function () { self.i = idx; self.render(); };
      st.appendChild(d);
    });
    // 面板
    var p = this.root.querySelector('#wz-panel'); p.innerHTML = '';
    p.appendChild(el('h2', null, (this.i + 1) + '. ' + L(step.title)));
    if (step.intro) p.appendChild(el('div', { class: 'intro' }, L(step.intro)));
    (step.fields || []).forEach(function (f) { p.appendChild(self.renderField(f)); });
    // 导航
    var nav = el('div', { class: 'navbtns' });
    var prev = el('button', { class: 'btn ghost' }, ui('prev')); prev.disabled = this.i === 0;
    prev.onclick = function () { if (self.i > 0) { self.i--; self.render(); } };
    var next = el('button', { class: 'btn' }, this.i === cfg.steps.length - 1 ? ui('done') : ui('next'));
    next.onclick = function () { if (self.i < cfg.steps.length - 1) { self.i++; self.render(); } else { self.exportMd(); } };
    nav.appendChild(prev); nav.appendChild(next); p.appendChild(nav);
    this.updatePreview();
  };

  Wizard.prototype.renderField = function (f) {
    var self = this, wrap = el('div', { class: 'field' });
    if (f.type === 'static') { wrap.innerHTML = L(f.html) || ''; return wrap; }
    var lab = el('label', null, L(f.label) + (f.hint ? '<span class="hint">' + L(f.hint) + '</span>' : ''));
    wrap.appendChild(lab);
    var val = this.state[f.name];
    var ph = f.placeholder ? L(f.placeholder) : '';
    var input;
    if (f.type === 'textarea' || f.type === 'lines') {
      input = el('textarea'); input.value = val || ''; if (ph) input.placeholder = ph;
    } else if (f.type === 'select') {
      input = el('select');
      (f.options || []).forEach(function (o) { var op = el('option', { value: optVal(o) }, optLabel(o)); if (optVal(o) === val) op.selected = true; input.appendChild(op); });
    } else if (f.type === 'radio') {
      input = el('div');
      (f.options || []).forEach(function (o) {
        var r = el('label', { class: 'opt' });
        r.innerHTML = '<input type="radio" name="' + f.name + '" value="' + optVal(o) + '"' + (optVal(o) === val ? ' checked' : '') + '> ' + optLabel(o);
        input.appendChild(r);
      });
    } else if (f.type === 'checks') {
      input = el('div'); var arr = val || [];
      (f.options || []).forEach(function (o) {
        var r = el('label', { class: 'opt' });
        r.innerHTML = '<input type="checkbox" value="' + optVal(o) + '"' + (arr.indexOf(optVal(o)) >= 0 ? ' checked' : '') + '> ' + optLabel(o);
        input.appendChild(r);
      });
    } else { input = el('input', { type: 'text' }); input.value = val || ''; if (ph) input.placeholder = ph; }
    wrap.appendChild(input);
    var msg = el('div', { class: 'msg' }); wrap.appendChild(msg);

    function collect() {
      if (f.type === 'checks') { self.state[f.name] = Array.prototype.slice.call(input.querySelectorAll('input:checked')).map(function (c) { return c.value; }); }
      else if (f.type === 'radio') { var c = input.querySelector('input:checked'); self.state[f.name] = c ? c.value : ''; }
      else { self.state[f.name] = input.value; }
      self.save();
      if (f.check) { var r = f.check(self.state[f.name], self.state); msg.className = 'msg' + (r ? ' ' + r.level : ''); msg.textContent = r ? L(r.msg) : ''; }
      self.updatePreview();
    }
    input.addEventListener('input', collect);
    input.addEventListener('change', collect);
    if (f.check && val) { var r = f.check(val, self.state); if (r) { msg.className = 'msg ' + r.level; msg.textContent = L(r.msg); } }
    return wrap;
  };

  Wizard.prototype.updatePreview = function () {
    var md = ''; try { md = this.cfg.buildPreview(this.state, curLang()) || ''; } catch (e) { md = ui('previewPh'); }
    this.root.querySelector('#wz-preview').innerHTML = md2html(md);
  };

  Wizard.prototype.exportMd = function () {
    var md = this.cfg.buildPreview(this.state, curLang()) || '';
    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: (this.cfg.key || 'output') + '_' + Date.now() + '.md' });
    document.body.appendChild(a); a.click(); a.remove();
  };

  /* AI 润色：把当前预览文档发给 /api/polish，润色稿以 .md 下载（原稿不动） */
  Wizard.prototype.aiPolish = function (btn) {
    var self = this, md = '';
    try { md = this.cfg.buildPreview(this.state, curLang()) || ''; } catch (e) { }
    if (!md.trim()) { alert(ui('fillFirst')); return; }
    var old = btn.textContent; btn.disabled = true; btn.textContent = ui('aiing');
    this.callLLM('/api/polish', { text: md, rule: '', style: this.cfg.key }).then(function (r) {
      btn.disabled = false; btn.textContent = old;
      if (!r.ok) { alert(r.note || ui('aiFail')); return; }
      var blob = new Blob([r.text], { type: 'text/markdown;charset=utf-8' });
      var a = el('a', { href: URL.createObjectURL(blob), download: (self.cfg.key || 'output') + (curLang() === 'en' ? '_AI-polished.md' : '_AI润色稿.md') });
      document.body.appendChild(a); a.click(); a.remove();
    });
  };

  // LLM 调用：未配置 apiBase 时返回提示，保证骨架可运行
  Wizard.prototype.callLLM = function (endpoint, payload) {
    var base = this.cfg.apiBase;
    if (!base) return Promise.resolve({ ok: false, note: curLang() === 'en' ? '(skeleton placeholder) API not configured: fill config.apiBase with your serverless endpoint on deploy to enable AI polish/generation.' : '（骨架占位）未配置 API：部署时在 config.apiBase 填 serverless 地址，即可启用 AI 润色/生成。' });
    return fetch(base + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); }).catch(function (e) { return { ok: false, note: (curLang() === 'en' ? 'Call failed: ' : '调用失败：') + e.message }; });
  };

  // 供 i18n.js 在切换语言后调用，整块按新语言重渲染（state 与当前步保留）
  global.wizardRelang = function () { if (global.__wizInstance) { global.__wizInstance.mount(global.__wizInstance._sel); } };

  global.Wizard = Wizard;
  global.md2html = md2html;
  global.wizI18n = { curLang: curLang, L: L };
})(window);
