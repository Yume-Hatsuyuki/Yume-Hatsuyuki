// book.js — 书本页面通用逻辑（PageFlip + Markdown 渲染）
// 由 book-template.html 提取，所有书本 HTML 共用此文件

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
     Markdown 渲染工具
     两种用法（可混用）：
       A) 内联：<div class="page-text" data-md>...markdown...</div>
       B) 外链：<div class="page-text" data-md-src="md/p1.md"></div>
     外链方式需要本地服务器：python -m http.server 8080
  ══════════════════════════════════════════════════════════════════ */
  function processMarkdownHTML(html) {
    html = html.replace(
      /<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/g,
      function (_, inner) {
        var isGreen = /^\{green\}\s*/i.test(inner);
        var body    = inner.replace(/^\{green\}\s*/i, '').trim();
        var label   = '';
        body = body.replace(/^<strong>(.*?)<\/strong>[:：]?\s*/,
          function (_, t) { label = t.replace(/[:：]\s*$/, ''); return ''; });
        var cls = isGreen ? 'callout-box green' : 'callout-box';
        var lbl = label ? '<div class="callout-label">' + label + '：</div>' : '';
        return '<div class="' + cls + '">' + lbl + '<p>' + body + '</p></div>';
      }
    );
    html = html.replace(/<hr\s*\/?>/g, '<div class="ornament-divider">— ✧ —</div>');
    html = html.replace(/<h[123]>(.*?)<\/h[123]>/g, '<div class="section-title">$1</div>');
    return html;
  }

  function renderInlineMarkdown() {
    if (typeof marked === 'undefined') return;
    marked.use({ breaks: false, gfm: true });
    document.querySelectorAll('#book .page-text[data-md]').forEach(function (el) {
      var raw = el.innerHTML
        .replace(/&amp;/g,'&').replace(/&lt;/g,'<')
        .replace(/&gt;/g,'>').replace(/&quot;/g,'"').trim();
      el.innerHTML = processMarkdownHTML(marked.parse(raw));
    });
  }

  function renderExternalMarkdown() {
    if (typeof marked === 'undefined') return Promise.resolve();
    marked.use({ breaks: false, gfm: true });
    var tasks = Array.from(document.querySelectorAll('#book .page-text[data-md-src]'))
      .map(function (el) {
        var src = el.getAttribute('data-md-src');
        return fetch(src)
          .then(function (r) { if (!r.ok) throw new Error(src + ' → HTTP ' + r.status); return r.text(); })
          .then(function (md) { el.innerHTML = processMarkdownHTML(marked.parse(md)); })
          .catch(function (err) {
            el.innerHTML =
              '<div class="callout-box" style="border-left-color:#8b3a2a">'
            + '<div class="callout-label">⚠ 无法加载</div>'
            + '<p style="color:#5a2010">' + err.message + '<br>'
            + '请通过本地服务器访问，而非直接双击打开 HTML。<br>'
            + '<code>python -m http.server 8080</code></p></div>';
          });
      });
    return Promise.all(tasks);
  }

  /* ══════════════════════════════════════════════════════════════════
     ① 先渲染所有 Markdown（内联同步，外链异步）
     ② Markdown 就绪后同时初始化两套 UI
        · 手机卡片列表：始终构建，CSS 控制在 ≤620px 时显示
        · 桌面 PageFlip：始终初始化，CSS 控制在 >620px 时显示
     这样 CSS 媒体查询是唯一的切换开关，JS 不做任何宽度判断
  ══════════════════════════════════════════════════════════════════ */
  renderInlineMarkdown();
  renderExternalMarkdown().then(function () {

    /* ── ① 手机卡片列表 ───────────────────────────────────────────── */
    var pageEls   = document.querySelectorAll('#book .page');
    var mobileList = document.createElement('div');
    mobileList.id = 'mobile-pages';

    Array.from(pageEls).forEach(function (page) {
      var card = document.createElement('div');
      card.className = 'mobile-card';
      if (page.classList.contains('cover-page')) card.classList.add('is-cover');
      if (page.classList.contains('back-cover')) card.classList.add('is-back-cover');
      var inner = page.querySelector('.page-inner');
      if (inner) card.appendChild(inner.cloneNode(true));
      mobileList.appendChild(card);
    });

    /* 插在书名题头之后 */
    var titleArea = document.getElementById('book-title-area');
    titleArea.parentNode.insertBefore(mobileList, titleArea.nextSibling);

    /* ── ② 桌面 PageFlip ─────────────────────────────────────────── */
    var totalPages = pageEls.length;
    var pageW = pageEls[0].offsetWidth;
    var pageH = pageEls[0].offsetHeight;

    var bookEl = document.getElementById('book');
    bookEl.style.width  = (pageW * 2) + 'px';
    bookEl.style.height = pageH + 'px';

    var pageFlip = new St.PageFlip(bookEl, {
      width:               pageW,
      height:              pageH,
      size:                'fixed',
      drawShadow:          true,
      flippingTime:        700,
      usePortrait:         false,
      showCover:           true,
      startZIndex:         10,
      maxShadowOpacity:    0.6,
      showPageCorners:     false,
      mobileScrollSupport: false,
      clickEventForward:   true,
      swipeDistance:       9999,
    });

    pageFlip.loadFromHTML(pageEls);

    var contentPageCount = Array.from(pageEls).filter(function (p, i) {
      return i !== 0 && !p.classList.contains('back-cover');
    }).length;

    function updateControls() {
      var cur = pageFlip.getCurrentPageIndex();
      var el  = pageEls[cur];
      var label;
      if (el && el.classList.contains('cover-page') && cur === 0) label = '— 封面 —';
      else if (el && el.classList.contains('back-cover'))          label = '— 封底 —';
      else                                                          label = '第 ' + cur + ' / ' + contentPageCount + ' 页';
      document.getElementById('page-info').textContent = label;
      document.getElementById('btn-prev').disabled = (cur <= 0);
      document.getElementById('btn-next').disabled = (cur >= totalPages - 1);
    }

    pageFlip.on('flip', function (e) {
      history.replaceState(null, '', '#' + (e.data <= 1 ? e.data : e.data - 1));
    });
    pageFlip.on('changeState', updateControls);

    document.getElementById('btn-prev').addEventListener('click', function () { pageFlip.flipPrev(); });
    document.getElementById('btn-next').addEventListener('click', function () { pageFlip.flipNext(); });

    /* 禁用书本区域鼠标拖拽（避免与 PageFlip 事件冲突） */
    ['mousedown','mousemove','mouseup','click'].forEach(function (ev) {
      bookEl.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); }, true);
    });

    /* 触摸左右滑动翻页 */
    var touchStartX = null;
    bookEl.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
    }, { passive: true });
    bookEl.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 40) return;
      dx < 0 ? pageFlip.flipNext() : pageFlip.flipPrev();
    }, { passive: true });
    bookEl.addEventListener('touchcancel', function () { touchStartX = null; }, { passive: true });

    /* URL Hash 导航 */
    function navigateByHash() {
      var h = window.location.hash;
      if (!h || h === '#') return;
      var n = parseInt(h.slice(1), 10);
      if (isNaN(n)) return;
      var idx = Math.max(0, Math.min(n <= 1 ? n : n + 1, totalPages - 1));
      pageFlip.flip(idx);
    }

    pageFlip.on('init', function () {
      updateControls();
      if (window.location.hash) setTimeout(navigateByHash, 150);
    });
    window.addEventListener('hashchange', navigateByHash);

  }); /* end renderExternalMarkdown().then */

})();
