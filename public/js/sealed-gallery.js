/* ============================================================
   sealed-gallery.js — 封印之间（画廊内的加密图片区）
   梦初雪 (Yume Hatsuyuki) 角色档案卷轴
   ============================================================
   · 图片列表由构建脚本（build.js）在编译时从 sealed.json 读取并
     静态注入 HTML（<!-- SEALED_IMAGES -->），运行时直接从 DOM 读取，
     无需 fetch。容器带 hidden 属性，破封前图片不加载也不渲染。
   · 每次点击：扭曲加深（SVG 滤镜）、长出一道裂纹、按钮轻微抖动。
     点击次数达到 data-clicks：碎裂飞散 → 闪光 → 图片依次淡入。
   · 无障碍：按钮本身可键盘操作；开启“减少动态效果”时跳过抖动与碎裂。
   · 图片地址只接受站内相对路径 images/...（构建时过滤，与 CSP img-src 'self' 一致）。
   · 解封后图片可点击放大查看，弹窗与画廊共用 zoom.js / .carousel-zoom-modal。
   ============================================================ */

import { imageZoom } from './zoom.js';

const HINTS = [
    '100%',
    '90%',
    '80%',
    '70%',
    '60%',
    '50%',
    '40%',
    '30%',
    '20%',
    '10%',
    '1%',
];
const BREAK_HINT    = '0%';
const UNLOCKED_HINT = '你不该看到这个的...';
const EMPTY_HINT    = '警告...损坏...';
const SHARD_COLS    = 6;
const SHARD_ROWS    = 4;
const SVG_NS        = 'http://www.w3.org/2000/svg';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function initializeSealedGallery() {
    const root = document.getElementById('sealedGallery');
    if (!root) return;

    const cover  = root.querySelector('.sealed-cover');
    const stage  = root.querySelector('.sealed-stage');
    const cracks = root.querySelector('.sealed-cracks');
    const hint   = root.querySelector('.sealed-hint');
    const reveal = root.querySelector('.sealed-reveal');
    const turb   = document.getElementById('sealedTurb');
    const disp   = document.getElementById('sealedDisp');

    if (!cover || !stage || !cracks || !hint || !reveal || !turb || !disp) {
        console.warn('[sealed] 封印结构不完整，已跳过初始化');
        return;
    }

    const clicksToBreak = Math.min(12, Math.max(1, parseInt(root.dataset.clicks, 10) || 5));
    const reduceMotion  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let clicks        = 0;
    let broken        = false;

    cover.addEventListener('click', onPress);

    // ── 点击：逐级损坏 ───────────────────────────────────────
    function onPress() {
        if (broken) return;
        clicks += 1;

        const progress = clicks / clicksToBreak;                              // 0 → 1
        disp.setAttribute('scale', String(Math.round(progress * 36)));        // 扭曲加深
        turb.setAttribute('seed', String(Math.floor(Math.random() * 100)));   // 噪声换种子
        addCrack(progress);
        if (!reduceMotion) jolt();

        if (clicks >= clicksToBreak) {
            breakSeal();
        } else {
            setHint(HINTS[Math.min(clicks, HINTS.length - 1)]);
        }
    }

    // ── 破封：碎裂 → 展示 ────────────────────────────────────
    async function breakSeal() {
        broken = true;
        setHint(BREAK_HINT);
        cover.disabled = true;
        cover.classList.add('is-breaking');

        // 碎裂动画设超时兜底：标签页在后台、动画被节流时，封印也一定会解开
        if (!reduceMotion) await Promise.race([shatter(), delay(2200)]);

        cover.remove();
        showImages();
    }

    function shatter() {
        flash();

        const animations = [];
        for (let r = 0; r < SHARD_ROWS; r++) {
            for (let c = 0; c < SHARD_COLS; c++) {
                const x0 = (c / SHARD_COLS) * 100;
                const x1 = ((c + 1) / SHARD_COLS) * 100;
                const y0 = (r / SHARD_ROWS) * 100;
                const y1 = ((r + 1) / SHARD_ROWS) * 100;
                // 每个格子拆成两个三角形
                animations.push(fly(`polygon(${x0}% ${y0}%, ${x1}% ${y0}%, ${x0}% ${y1}%)`));
                animations.push(fly(`polygon(${x1}% ${y0}%, ${x1}% ${y1}%, ${x0}% ${y1}%)`));
            }
        }
        return Promise.all(animations);
    }

    function fly(clipPath) {
        const shard = document.createElement('div');
        shard.className = 'sealed-shard';
        shard.style.clipPath = clipPath;
        stage.appendChild(shard);

        if (typeof shard.animate !== 'function') {
            shard.remove();
            return Promise.resolve();
        }

        const dx  = (Math.random() - 0.5) * 320;
        const dy  = 120 + Math.random() * 220;
        const rot = (Math.random() - 0.5) * 140;

        return shard.animate([
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
        ], {
            duration: 900 + Math.random() * 500,
            delay: Math.random() * 120,
            easing: 'cubic-bezier(.3, .6, .4, 1)',
            fill: 'forwards',
        }).finished.then(() => shard.remove());
    }

    function flash() {
        const f = document.createElement('div');
        f.className = 'sealed-flash';
        stage.appendChild(f);
        if (typeof f.animate !== 'function') { f.remove(); return; }
        f.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 800, easing: 'ease-out' })
            .onfinish = () => f.remove();
    }

    // ── 解封后展示图片 ───────────────────────────────────────
    // figure 节点已在构建时静态写入 .sealed-reveal，此处直接复用
    function showImages() {
        const items = Array.from(reveal.querySelectorAll('.sealed-item'));
        if (items.length === 0) {
            setHint(EMPTY_HINT);
            return;
        }

        setHint(UNLOCKED_HINT);
        reveal.hidden = false;

        const srcs = items.map(fig => fig.querySelector('img')?.src || '');

        items.forEach((fig, i) => {
            // 点击放大查看，左右方向键在封印图片间切换
            fig.querySelector('img')?.addEventListener('click', () => {
                let cur = i;
                imageZoom.open(srcs[cur], {
                    onNavigate(dir) {
                        cur = (cur + dir + srcs.length) % srcs.length;
                        return srcs[cur];
                    },
                });
            });

            if (!reduceMotion && typeof fig.animate === 'function') {
                fig.animate([
                    { opacity: 0, transform: 'scale(1.05)', filter: 'blur(12px) brightness(.5) contrast(1.8)' },
                    { opacity: 1, transform: 'scale(1)',    filter: 'none' },
                ], { duration: 900, delay: i * 160, easing: 'ease-out', fill: 'backwards' });
            }
        });

        reveal.focus();
    }

    // ── 视觉反馈 ─────────────────────────────────────────────
    function setHint(text) {
        hint.textContent = text;
    }

    function jolt() {
        if (typeof cover.animate !== 'function') return;
        cover.animate([
            { transform: 'translate(0, 0)' },
            { transform: 'translate(-6px, 2px)' },
            { transform: 'translate(5px, -3px)' },
            { transform: 'translate(-2px, 1px)' },
            { transform: 'translate(0, 0)' },
        ], { duration: 260, easing: 'steps(4)' });
    }

    // 裂纹用像素坐标绘制：每次点击前同步 viewBox，尺寸随窗口变化也正确
    function addCrack(progress) {
        const { width: w, height: h } = cover.getBoundingClientRect();
        cracks.setAttribute('viewBox', `0 0 ${w} ${h}`);

        const unit = Math.min(w, h);
        let x     = w / 2 + (Math.random() - 0.5) * unit * 0.1;
        let y     = h / 2 + (Math.random() - 0.5) * unit * 0.1;
        let angle = Math.random() * Math.PI * 2;
        let d     = `M${x.toFixed(1)} ${y.toFixed(1)}`;

        const steps = 4 + Math.round(progress * 6);
        for (let i = 0; i < steps; i++) {
            angle += (Math.random() - 0.5) * 0.9;
            const len = unit * (0.05 + Math.random() * 0.08);
            x += Math.cos(angle) * len;
            y += Math.sin(angle) * len;
            d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
        }

        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('pathLength', '100');   // 让 dasharray 与 CSS 动画的单位一致
        path.setAttribute('class', 'sealed-crack');
        cracks.appendChild(path);
    }
}
