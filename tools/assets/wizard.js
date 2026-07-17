/* ============================================================
   wizard.js — 通用分步向导引擎（4 个工具共用）
   用法：new Wizard(config).mount('#app')
   config = {
     key:'prd', title:'', subtitle:'', apiBase:'',
     steps:[ { title, intro, fields:[ field ] } ],
     buildPreview(state) -> markdown string
   }
   field = { name, label, hint, type:'text|textarea|select|radio|checks|lines|static',
             options:[...], html:'', check(value,state)->{level,msg}|null }
   ============================================================ */
(function (global) {
  'use strict';

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
    this.root = document.querySelector(sel);
    this.root.innerHTML =
      '<div class="steps" id="wz-steps"></div>' +
      '<div class="wizard">' +
      '  <div class="panel" id="wz-panel"></div>' +
      '  <div class="preview"><div class="box"><div class="bar">实时预览 <span><button class="btn ghost sm" id="wz-ai">✨ AI 润色</button> <button class="btn ghost sm" id="wz-export">导出 .md</button></span></div><div class="body" id="wz-preview"></div></div></div>' +
      '</div>';
    var self = this;
    this.root.querySelector('#wz-export').onclick = function () { self.exportMd(); };
    var aiBtn = this.root.querySelector('#wz-ai');
    if (!this.cfg.apiBase) { aiBtn.disabled = true; aiBtn.title = '部署 API 后在 config.apiBase 填接口地址即可启用（见 tools/api/README.md）'; }
    aiBtn.onclick = function () { self.aiPolish(aiBtn); };
    this.render();
  };

  Wizard.prototype.render = function () {
    var self = this, cfg = this.cfg, step = cfg.steps[this.i];
    // 进度条
    var st = this.root.querySelector('#wz-steps'); st.innerHTML = '';
    cfg.steps.forEach(function (s, idx) {
      var cls = 's' + (idx === self.i ? ' active' : (idx < self.i ? ' done' : ''));
      var d = el('div', { class: cls }, '<span class="n">' + (idx < self.i ? '✓' : (idx + 1)) + '</span>' + s.title);
      d.onclick = function () { self.i = idx; self.render(); };
      st.appendChild(d);
    });
    // 面板
    var p = this.root.querySelector('#wz-panel'); p.innerHTML = '';
    p.appendChild(el('h2', null, (this.i + 1) + '. ' + step.title));
    if (step.intro) p.appendChild(el('div', { class: 'intro' }, step.intro));
    (step.fields || []).forEach(function (f) { p.appendChild(self.renderField(f)); });
    // 导航
    var nav = el('div', { class: 'navbtns' });
    var prev = el('button', { class: 'btn ghost' }, '← 上一步'); prev.disabled = this.i === 0;
    prev.onclick = function () { if (self.i > 0) { self.i--; self.render(); } };
    var next = el('button', { class: 'btn' }, this.i === cfg.steps.length - 1 ? '完成 ✓' : '下一步 →');
    next.onclick = function () { if (self.i < cfg.steps.length - 1) { self.i++; self.render(); } else { self.exportMd(); } };
    nav.appendChild(prev); nav.appendChild(next); p.appendChild(nav);
    this.updatePreview();
  };

  Wizard.prototype.renderField = function (f) {
    var self = this, wrap = el('div', { class: 'field' });
    if (f.type === 'static') { wrap.innerHTML = f.html || ''; return wrap; }
    var lab = el('label', null, f.label + (f.hint ? '<span class="hint">' + f.hint + '</span>' : ''));
    wrap.appendChild(lab);
    var val = this.state[f.name];
    var input;
    if (f.type === 'textarea' || f.type === 'lines') {
      input = el('textarea'); input.value = val || ''; if (f.placeholder) input.placeholder = f.placeholder;
    } else if (f.type === 'select') {
      input = el('select');
      (f.options || []).forEach(function (o) { var op = el('option', { value: o }, o); if (o === val) op.selected = true; input.appendChild(op); });
    } else if (f.type === 'radio') {
      input = el('div');
      (f.options || []).forEach(function (o) {
        var id = f.name + '_' + o, r = el('label', { class: 'opt' });
        r.innerHTML = '<input type="radio" name="' + f.name + '" value="' + o + '"' + (o === val ? ' checked' : '') + '> ' + o;
        input.appendChild(r);
      });
    } else if (f.type === 'checks') {
      input = el('div'); var arr = val || [];
      (f.options || []).forEach(function (o) {
        var r = el('label', { class: 'opt' });
        r.innerHTML = '<input type="checkbox" value="' + o + '"' + (arr.indexOf(o) >= 0 ? ' checked' : '') + '> ' + o;
        input.appendChild(r);
      });
    } else { input = el('input', { type: 'text' }); input.value = val || ''; if (f.placeholder) input.placeholder = f.placeholder; }
    wrap.appendChild(input);
    var msg = el('div', { class: 'msg' }); wrap.appendChild(msg);

    function collect() {
      if (f.type === 'checks') { self.state[f.name] = Array.prototype.slice.call(input.querySelectorAll('input:checked')).map(function (c) { return c.value; }); }
      else if (f.type === 'radio') { var c = input.querySelector('input:checked'); self.state[f.name] = c ? c.value : ''; }
      else { self.state[f.name] = input.value; }
      self.save();
      if (f.check) { var r = f.check(self.state[f.name], self.state); msg.className = 'msg' + (r ? ' ' + r.level : ''); msg.textContent = r ? r.msg : ''; }
      self.updatePreview();
    }
    input.addEventListener('input', collect);
    input.addEventListener('change', collect);
    if (f.check && val) { var r = f.check(val, self.state); if (r) { msg.className = 'msg ' + r.level; msg.textContent = r.msg; } }
    return wrap;
  };

  Wizard.prototype.updatePreview = function () {
    var md = ''; try { md = this.cfg.buildPreview(this.state) || ''; } catch (e) { md = '_(填写后此处生成预览)_'; }
    this.root.querySelector('#wz-preview').innerHTML = md2html(md);
  };

  Wizard.prototype.exportMd = function () {
    var md = this.cfg.buildPreview(this.state) || '';
    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: (this.cfg.key || 'output') + '_' + Date.now() + '.md' });
    document.body.appendChild(a); a.click(); a.remove();
  };

  /* AI 润色：把当前预览文档发给 /api/polish，润色稿以 .md 下载（原稿不动） */
  Wizard.prototype.aiPolish = function (btn) {
    var self = this, md = '';
    try { md = this.cfg.buildPreview(this.state) || ''; } catch (e) { }
    if (!md.trim()) { alert('请先填写内容再润色。'); return; }
    var old = btn.textContent; btn.disabled = true; btn.textContent = '润色中…';
    this.callLLM('/api/polish', { text: md, rule: '', style: this.cfg.key }).then(function (r) {
      btn.disabled = false; btn.textContent = old;
      if (!r.ok) { alert(r.note || '润色失败，请稍后重试。'); return; }
      var blob = new Blob([r.text], { type: 'text/markdown;charset=utf-8' });
      var a = el('a', { href: URL.createObjectURL(blob), download: (self.cfg.key || 'output') + '_AI润色稿.md' });
      document.body.appendChild(a); a.click(); a.remove();
    });
  };

  // LLM 调用：未配置 apiBase 时返回提示，保证骨架可运行
  Wizard.prototype.callLLM = function (endpoint, payload) {
    var base = this.cfg.apiBase;
    if (!base) return Promise.resolve({ ok: false, note: '（骨架占位）未配置 API：部署时在 config.apiBase 填 serverless 地址，即可启用 AI 润色/生成。' });
    return fetch(base + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); }).catch(function (e) { return { ok: false, note: '调用失败：' + e.message }; });
  };

  global.Wizard = Wizard;
  global.md2html = md2html;
})(window);
