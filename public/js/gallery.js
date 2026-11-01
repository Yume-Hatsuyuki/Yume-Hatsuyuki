/* ============================================================
   gallery.js — 图片轮播系统
   梦初雪 (Yume Hatsuyuki) 角色档案卷轴
   ============================================================
   图片数据由构建脚本（build.js）在编译时从
   gallery.json 读取并静态注入 HTML（<!-- GALLERY_IMAGES -->），
   运行时直接从 DOM 读取，无需 fetch。
   ============================================================ */

import { imageZoom } from './zoom.js';

export function initializeGallery() {
    const container = document.getElementById('character-gallery');
    if (!container) return;

    // ── 元素引用 ──────────────────────────────────────────────
    const front       = document.getElementById('carouselFront');
    const back        = document.getElementById('carouselBack');
    const mainDisplay = document.getElementById('carouselMainDisplay');
    const prevBtn     = document.getElementById('carouselPrev');
    const nextBtn     = document.getElementById('carouselNext');
    const autoplayEl  = document.getElementById('carouselAutoplay');
    const dot         = document.getElementById('carouselDot');
    const label       = document.getElementById('carouselLabel');
    const track       = document.getElementById('carouselTrack');
    const thumbPrev   = document.getElementById('carouselThumbPrev');
    const thumbNext   = document.getElementById('carouselThumbNext');

    if (!front || !back || !track) return;

    // ── 数据 & 状态 ───────────────────────────────────────────
    let images          = [];
    let currentIndex    = 0;
    let activeLayer     = 'front';  // 'front' | 'back'
    let isTransitioning = false;
    let isAutoplay      = true;
    let autoplayTimer   = null;
    let trackIndex      = 0;        // 三倍复制中的真实轨道位置（从中间组开始）
    const AUTOPLAY_MS   = 3000;
    const WINDOW_SIZE   = 5;

    // ── 从构建时预渲染的 DOM 节点读取图片数据 ─────────────────
    // gallery.json 已在编译阶段由 build.js 静态写入 HTML，
    // 此处直接读取 DOM，不再 fetch。
    const staticItems = Array.from(track.querySelectorAll('.carousel-thumb-item'));
    if (staticItems.length === 0) {
        console.warn('[gallery] 未找到预渲染的缩略图节点，请检查构建脚本');
        return;
    }
    images = staticItems.map(el => {
        const img   = el.querySelector('img');
        const label = el.querySelector('.carousel-thumb-label')?.textContent || '';
        return {
            src:   img?.getAttribute('src') || '',
            alt:   img?.getAttribute('alt') || label,  // alt 缺失时以缩略图标签兜底，只归一化一次
            label
        };
    });
    trackIndex = images.length; // 从三倍复制的中间组开始
    buildThumbnails();
    setImageImmediate(0);
    startAutoplay();
    bindEvents();

    // ── 构建三倍复制缩略图（无缝循环） ───────────────────────
    // 静态节点（来自模板替换）只有一份，这里三倍复制实现无缝滚动。
    function buildThumbnails() {
        // 保存原始一份节点（build 输出的静态 HTML）
        const originals = staticItems.map(el => el.cloneNode(true));
        track.innerHTML = '';
        for (let copy = 0; copy < 3; copy++) {
            originals.forEach((el, i) => {
                const clone = el.cloneNode(true);
                clone.dataset.index = i;
                clone.dataset.track = copy * images.length + i;
                track.appendChild(clone);
            });
        }

        track.querySelectorAll('.carousel-thumb-item').forEach(el => {
            el.addEventListener('click', () => {
                const ri       = parseInt(el.dataset.index);  // 真实图片序号
                const trackPos = parseInt(el.dataset.track);  // 轨道绝对位置
                if (ri !== currentIndex && !isTransitioning) goTo(ri, trackPos);
            });
        });
    }

    // ── 缩略图位移计算 ────────────────────────────────────────
    function getThumbTranslate() {
        const first = track.firstElementChild;
        if (!first) return 0;
        const step = first.offsetWidth + 8; // 8px gap
        const centerOffset = Math.floor(WINDOW_SIZE / 2);
        return -(trackIndex - centerOffset) * step;
    }

    function updateThumbnails(animate = true) {
        track.querySelectorAll('.carousel-thumb-item').forEach(el => el.classList.remove('active'));
        const active = track.children[trackIndex];
        if (active) active.classList.add('active');

        if (!animate) {
            track.style.transition = 'none';
            track.style.transform  = `translateX(${getThumbTranslate()}px)`;
            track.offsetHeight; // force reflow
            track.style.transition = '';
        } else {
            track.style.transform = `translateX(${getThumbTranslate()}px)`;
        }
    }

    // 边界静默重置（无缝循环核心）
    function checkBoundary() {
        requestAnimationFrame(() => {
            if (trackIndex >= images.length * 2) {
                trackIndex -= images.length;
                updateThumbnails(false);
            } else if (trackIndex < images.length) {
                trackIndex += images.length;
                updateThumbnails(false);
            }
        });
    }

    // ── 直接设置（无动画，用于初始化） ───────────────────────
    function setImageImmediate(index) {
        currentIndex        = index;
        front.src           = images[index].src;
        front.alt           = images[index].alt;
        back.src            = '';
        front.style.opacity = '1';
        back.style.opacity  = '0';
        activeLayer         = 'front';
        updateThumbnails(false);
    }

    // ── 切换图片核心逻辑（带淡入淡出） ────────────────────────
    // showImage（±1 切换）与 goTo（点击缩略图跳转）原本各自实现了一遍
    // "取 incoming/outgoing 图层 → 设置 src/alt → 淡入淡出 → checkBoundary"，
    // 这里合并成一个函数，两者只负责算出目标 index / trackIndex 后调用它。
    function transitionTo(index, newTrackIndex) {
        if (isTransitioning) return;
        isTransitioning = true;
        currentIndex    = index;
        trackIndex      = newTrackIndex;

        const incoming   = activeLayer === 'front' ? back  : front;
        const outgoing   = activeLayer === 'front' ? front : back;
        const incomingId = activeLayer === 'front' ? 'back' : 'front';

        incoming.src = images[currentIndex].src;
        incoming.alt = images[currentIndex].alt;

        const apply = () => {
            incoming.style.opacity = '1';
            outgoing.style.opacity = '0';
            activeLayer = incomingId;
            updateThumbnails(true);
            setTimeout(checkBoundary, 350);
            isTransitioning = false;
        };

        if (incoming.complete && incoming.naturalWidth > 0) {
            apply();
        } else {
            incoming.addEventListener('load', apply, { once: true });
            // 图片加载异常卡住时的兜底：700ms 后强制完成过渡
            setTimeout(() => { if (isTransitioning) apply(); }, 700);
        }
    }

    // ── showImage（上一张/下一张，±1 平移轨道） ───────────────
    function showImage(index, direction) {
        const step = direction === 'next' ? 1 : -1;
        transitionTo(index, trackIndex + step);
    }

    // ── goTo（点击缩略图跳转到任意轨道位置） ───────────────────
    function goTo(index, trackPos) {
        if (index === currentIndex) return;
        transitionTo(index, trackPos);
    }

    function prev() {
        if (isTransitioning) return;
        resetAutoplay();
        showImage((currentIndex - 1 + images.length) % images.length, 'prev');
    }

    function next() {
        if (isTransitioning) return;
        resetAutoplay();
        showImage((currentIndex + 1) % images.length, 'next');
    }

    // ── 自动播放 ──────────────────────────────────────────────
    function startAutoplay() {
        stopAutoplay();
        isAutoplay    = true;
        autoplayTimer = setInterval(() => {
            if (!isTransitioning) showImage((currentIndex + 1) % images.length, 'next');
        }, AUTOPLAY_MS);
        updateAutoplayUI();
    }

    function stopAutoplay() {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
    }

    function resetAutoplay() {
        stopAutoplay();
        if (isAutoplay) startAutoplay();
    }

    function toggleAutoplay() {
        if (isAutoplay) {
            stopAutoplay();
            isAutoplay = false;
        } else {
            startAutoplay();
        }
        updateAutoplayUI();
    }

    function updateAutoplayUI() {
        if (!dot || !label || !autoplayEl) return;
        if (isAutoplay) {
            autoplayEl.classList.remove('paused');
            dot.style.background = '';
            label.textContent    = '自动播放中 · 3秒/张';
            autoplayEl.title     = '点击暂停自动播放';
        } else {
            autoplayEl.classList.add('paused');
            dot.style.background = 'var(--ink-blood)';
            label.textContent    = '已暂停';
            autoplayEl.title     = '点击恢复自动播放';
        }
    }

    // 事件落在导航箭头 / 自动播放控件上时不触发图片操作（点击放大、触摸滑动共用）
    const isControlHit = e => e.target.closest('.carousel-nav') || e.target.closest('.carousel-autoplay');

    // ── 放大弹窗（与封印之间共用 zoom.js） ────────────────────
    function openZoom(e) {
        if (e && isControlHit(e)) return;
        imageZoom.open(images[currentIndex].src, {
            onNavigate(dir) {
                dir < 0 ? prev() : next();
                return images[currentIndex].src;
            },
            onClose() { if (isAutoplay) startAutoplay(); },
        });
        stopAutoplay();
    }

    // ── 触摸滑动 ──────────────────────────────────────────────
    let touchX = 0, touchMoved = false;

    mainDisplay.addEventListener('touchstart', e => {
        if (isControlHit(e)) return;
        touchX     = e.touches[0].clientX;
        touchMoved = false;
    }, { passive: true });

    mainDisplay.addEventListener('touchmove', e => {
        if (Math.abs(e.touches[0].clientX - touchX) > 10) touchMoved = true;
    }, { passive: true });

    mainDisplay.addEventListener('touchend', e => {
        if (!touchMoved || isTransitioning) { touchX = 0; touchMoved = false; return; }
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
        touchX = 0; touchMoved = false;
    });

    // ── 绑定所有事件 ──────────────────────────────────────────
    function bindEvents() {
        prevBtn?.addEventListener('click', prev);
        nextBtn?.addEventListener('click', next);
        thumbPrev?.addEventListener('click', prev);
        thumbNext?.addEventListener('click', next);
        autoplayEl?.addEventListener('click', toggleAutoplay);

        mainDisplay.addEventListener('click', openZoom);

        document.addEventListener('keydown', e => {
            // 放大弹窗打开时，Esc / 方向键由 zoom.js 接管
            if (imageZoom.isOpen) return;
            if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
            if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
            // 焦点在按钮 / 链接 / 输入框上时，空格交给它们（否则会抢走按钮的空格激活）
            if (e.key === ' ' && !e.target.closest('button, a, input, textarea, select')) {
                e.preventDefault();
                toggleAutoplay();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stopAutoplay();
            else if (isAutoplay) startAutoplay();
        });

        window.addEventListener('blur',  stopAutoplay);
        window.addEventListener('focus', () => { if (isAutoplay) startAutoplay(); });
    }
}
