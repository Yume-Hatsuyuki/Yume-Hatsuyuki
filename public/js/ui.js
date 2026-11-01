// ui.js — 滚动指示器、返回顶部、展开/收起、转录按钮、Resize 处理

import ICONS from './icons.mjs';

// ── 公用工具 ────────────────────────────────────────────────
function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── 公用 SVG 片段 ────────────────────────────────────────────
// chevron 图标唯一定义在 js/icons.mjs（build.js 生成静态 HTML 时也是
// 引用同一份），这里不再各写一遍，避免出现三处不同步的副本。
const SVG_CHEVRON_DOWN = ICONS.chevronDown;
const SVG_CHEVRON_UP   = ICONS.chevronUp;
const SVG_LORE_CHEVRON = ICONS.loreChevron;

// ── 展开类按钮内容设置 ──────────────────────────────────────
// 卷轴按钮：文字在前、chevron 在后（文案与图标由 expanded 决定）
function setScrollBtn(btn, expanded) {
    btn.innerHTML = `<span>${expanded ? '收起卷轴' : '展开卷轴'}</span>${expanded ? SVG_CHEVRON_UP : SVG_CHEVRON_DOWN}`;
}

// "查阅更多"按钮：chevron 在前、文字在后；文字用 textContent 设置，
// 避免 category 含特殊字符时注入 innerHTML
function setLoreBtn(btn, label) {
    btn.innerHTML = SVG_LORE_CHEVRON; // chevron 是受控常量
    const span = document.createElement('span');
    span.textContent = label;
    btn.appendChild(span);
}

// ── 滚动指示器（右侧符文柱） ───────────────────────────────
export function initializeScrollIndicator() {
    const scrollIndicator = document.getElementById('scrollIndicator');
    if (!scrollIndicator) return;

    function update() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const pct = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
        scrollIndicator.style.opacity = (pct < 1 || pct > 99) ? '0.1'
                                      : (pct > 5 && pct < 95)  ? '0.5'
                                      : '0.2';
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}

// ── 返回顶部按钮 ───────────────────────────────────────────
export function initializeScrollToTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        btn.classList.toggle('show',
            document.body.scrollTop > 500 || document.documentElement.scrollTop > 500);
    }, { passive: true });

    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── 展开/收起描述文本 ──────────────────────────────────────
export function initializeExpandableDescriptions() {
    function toggleDescription(description) {
        const isExpanded = description.classList.contains('expanded');
        const btn = description.nextElementSibling?.querySelector('.expand-btn');

        description.setAttribute('aria-expanded', String(!isExpanded));
        if (btn) btn.setAttribute('aria-expanded', String(!isExpanded));

        if (isExpanded) {
            // 收起：从当前高度动画到折叠高度
            description.style.maxHeight = `${description.scrollHeight}px`;
            requestAnimationFrame(() => {
                description.classList.remove('expanded');
                description.classList.add('expandable');
                requestAnimationFrame(() => {
                    description.style.maxHeight = 'calc(1.7em * 4)';
                });
                if (btn) setScrollBtn(btn, false);
            });
        } else {
            // 展开：测量折叠高度 → 添加 expanded → 动画到实际高度
            description.classList.add('expandable');
            void description.offsetHeight;
            const foldedH = description.clientHeight;
            description.classList.remove('expandable');
            description.classList.add('expanded');
            description.style.maxHeight = `${foldedH}px`;
            void description.offsetHeight;

            requestAnimationFrame(() => {
                description.style.maxHeight = `${description.scrollHeight}px`;
                if (btn) setScrollBtn(btn, true);
                setTimeout(() => {
                    if (description.classList.contains('expanded')) {
                        description.style.maxHeight = 'none';
                    }
                }, 420);
            });
        }
    }

    document.addEventListener('click', e => {
        // 点击描述文字本身（折叠态）
        if (e.target.classList.contains('spell-description') &&
            e.target.classList.contains('expandable')) {
            toggleDescription(e.target);
            return;
        }

        // 点击展开按钮
        const btn = e.target.closest('.expand-btn');
        if (btn) {
            const desc = btn.closest('.spell-scroll')?.querySelector('.spell-description');
            if (desc) { toggleDescription(desc); e.stopPropagation(); }
        }
    });
}

// ── 窗口 Resize 时修正展开内容高度 ───────────────────────
export function initializeResizeHandler() {
    window.addEventListener('resize', debounce(() => {
        document.querySelectorAll('.spell-description.expanded').forEach(desc => {
            if (desc.style.maxHeight && desc.style.maxHeight !== 'none') {
                desc.style.maxHeight = `${desc.scrollHeight}px`;
            }
        });
    }, 250));
}

// ── 转录卷轴按钮：复制密文 JSON ─────────────────────────
export function initializeTranscribeButton() {
    const btn = document.getElementById('transcribe-btn');
    if (!btn) return;

    const SVG_CHECK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2,9 6,13 14,4"/></svg>';

    btn.addEventListener('click', async function () {
        try {
            const pre = document.getElementById('arcane-data');
            if (!pre) throw new Error('找不到密文卷轴');
            const text = pre.textContent.trim();
            if (!text) throw new Error('卷轴是空的');

            await navigator.clipboard.writeText(text);

            const original = this.innerHTML;
            this.innerHTML = `${SVG_CHECK}<span>已转录!</span>`;
            this.classList.add('copied');
            setTimeout(() => { this.innerHTML = original; this.classList.remove('copied'); }, 2000);
        } catch (err) {
            console.error('[UI] 转录失败:', err);
            alert(`转录失败: ${err.message}`);
        }
    });
}

// ── 动态注入展开按钮 ───────────────────────────────────────
export function injectExpandButtons() {
    document.querySelectorAll('.spell-description').forEach(desc => {
        const scroll = desc.closest('.spell-scroll');
        if (!scroll) return;

        if (!desc.classList.contains('expandable')) desc.classList.add('expandable');

        const maxH     = parseFloat(getComputedStyle(desc).maxHeight);
        const overflow = isNaN(maxH)
            ? desc.scrollHeight > desc.clientHeight
            : desc.scrollHeight > maxH;

        if (overflow) {
            desc.classList.remove('no-fade');
            if (!scroll.querySelector('.expand-btn')) {
                const div = document.createElement('div');
                div.className = 'expand-indicator';
                const btn = document.createElement('button');
                btn.className = 'expand-btn';
                btn.setAttribute('aria-expanded', 'false');
                btn.setAttribute('aria-label', '展开详细描述');
                setScrollBtn(btn, false);
                div.appendChild(btn);
                scroll.appendChild(div);
            }
        } else {
            desc.classList.add('no-fade');
            scroll.querySelector('.expand-indicator')?.remove();
        }
    });
}

// ── 原始档案卷轴展开/收起 ─────────────────────────────────
export function initializeCodexExpand() {
    const pre   = document.getElementById('arcane-data');
    const codex = pre?.closest('.arcane-codex');
    if (!pre || !codex) return;

    const COLLAPSED_LINES = 8;
    const lineHeight = parseFloat(getComputedStyle(pre).lineHeight) || 18;
    const collapsedH = lineHeight * COLLAPSED_LINES;

    if (pre.scrollHeight <= collapsedH + lineHeight) return;

    const content = codex.querySelector('.codex-content');
    content.style.cssText += ';position:relative;max-height:' + (collapsedH + 24) + 'px;overflow:hidden;transition:max-height 0.55s cubic-bezier(0.4,0,0.2,1)';

    const fade = document.createElement('div');
    fade.className = 'codex-fade';
    content.appendChild(fade);

    const expandWrap = document.createElement('div');
    expandWrap.className = 'codex-expand-wrap';
    codex.appendChild(expandWrap);

    const btn = document.createElement('button');
    btn.className = 'codex-expand-btn';
    btn.setAttribute('aria-expanded', 'false');
    setScrollBtn(btn, false);
    expandWrap.appendChild(btn);

    btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        if (!expanded) {
            content.style.maxHeight = (pre.scrollHeight + 48) + 'px';
            fade.style.opacity = '0';
            btn.setAttribute('aria-expanded', 'true');
            setScrollBtn(btn, true);
        } else {
            content.style.maxHeight = (collapsedH + 24) + 'px';
            fade.style.opacity = '1';
            btn.setAttribute('aria-expanded', 'false');
            setScrollBtn(btn, false);
            codex.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

// ── 联系方式 — 邮箱防爬虫 ────────────────────────────────
export function initializeContactFooter() {
    document.querySelectorAll('.contact-item[data-eu]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = `mailto:${btn.dataset.eu}@${btn.dataset.ed}`;
        });
    });
}

// ── 其他典籍 — 栏目折叠/展开 ────────────────────────────
export function initializeLoreExpand() {
    document.querySelectorAll('.lore-more-btn').forEach(btn => {
        const category = btn.dataset.category || '';
        const container = btn.parentElement;
        const hidden = container
            ? Array.from(container.querySelectorAll('.lore-entry--hidden'))
            : [];
        if (!hidden.length) return;

        // 把隐藏条目移入可动画包裹层
        const wrapper = document.createElement('div');
        wrapper.className = 'lore-expand-wrapper';
        hidden[0].parentNode.insertBefore(wrapper, hidden[0]);
        hidden.forEach(el => {
            el.classList.remove('lore-entry--hidden');
            el.style.display = '';
            wrapper.appendChild(el);
        });
        wrapper.style.cssText = 'max-height:0;overflow:hidden;opacity:0';

        setLoreBtn(btn, `查阅更多${category}`);

        let open = false;

        btn.addEventListener('click', () => {
            if (!open) {
                wrapper.style.transition = 'max-height 0.45s cubic-bezier(0.4,0,0.2,1),opacity 0.35s ease';
                wrapper.style.maxHeight  = wrapper.scrollHeight + 'px';
                wrapper.style.opacity    = '1';
                btn.setAttribute('aria-expanded', 'true');
                setLoreBtn(btn, '收起');
                open = true;
                wrapper.addEventListener('transitionend', () => {
                    if (open) wrapper.style.maxHeight = 'none';
                }, { once: true });
            } else {
                wrapper.style.maxHeight  = wrapper.scrollHeight + 'px';
                wrapper.style.transition = '';
                void wrapper.offsetHeight;
                wrapper.style.transition = 'max-height 0.38s cubic-bezier(0.4,0,0.2,1),opacity 0.3s ease';
                wrapper.style.maxHeight  = '0';
                wrapper.style.opacity    = '0';
                btn.setAttribute('aria-expanded', 'false');
                setLoreBtn(btn, `查阅更多${category}`);
                open = false;
                btn.closest('.lore-category')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    });
}

// ── 其他典籍 — iframe 内嵌阅览器 ─────────────────────────
export function initializeLoreViewer() {
    const viewer   = document.getElementById('loreViewer');
    const frame    = document.getElementById('loreViewerFrame');
    const loading  = document.getElementById('loreViewerLoading');
    const closeBtn = document.getElementById('loreViewerClose');
    const openBtn  = document.getElementById('loreViewerOpenBtn');
    const titleEl  = document.getElementById('loreViewerTitle');
    const backdrop = viewer?.querySelector('.lore-viewer-backdrop');

    if (!viewer || !frame) return;

    const BLUR_TARGETS = ['header', 'main', '.lore-nexus', '.contact-nexus', '.scroll-to-top', '.scroll-indicator'];

    function setBlur(on) {
        BLUR_TARGETS.forEach(sel =>
            document.querySelectorAll(sel).forEach(el =>
                el.classList.toggle('lore-viewer-blur', on)));
    }

    function isSafeUrl(url) {
        try {
            const u = new URL(url, location.href);
            return u.protocol === 'https:' || u.protocol === 'http:';
        } catch { return false; }
    }

    function open(url, title) {
        if (!isSafeUrl(url)) return;
        titleEl.textContent  = title || '';
        openBtn.href         = url;
        frame.src            = '';
        loading.style.display = 'flex';
        viewer.hidden        = false;
        requestAnimationFrame(() => requestAnimationFrame(() => viewer.classList.add('active')));
        setBlur(true);
        document.body.style.overflow = 'hidden';
        frame.onload = () => { loading.style.display = 'none'; };
        frame.src = url;
    }

    function close() {
        viewer.classList.remove('active');
        setBlur(false);
        document.body.style.overflow = '';
        viewer.addEventListener('transitionend', () => {
            viewer.hidden         = true;
            frame.src             = '';
            loading.style.display = 'flex';
        }, { once: true });
    }

    document.addEventListener('click', e => {
        const link = e.target.closest('.lore-iframe-link');
        if (!link) return;
        e.preventDefault();
        open(
            link.dataset.iframeUrl || link.getAttribute('href'),
            link.dataset.title     || link.textContent.trim()
        );
    });

    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !viewer.hidden && viewer.classList.contains('active')) close();
    });
}
