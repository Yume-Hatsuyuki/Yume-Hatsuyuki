/* ============================================================
   zoom.js — 图片放大弹窗（画廊与封印之间共用）
   梦初雪 (Yume Hatsuyuki) 角色档案卷轴
   ============================================================
   · DOM 结构与样式类复用 ui.css 的 .carousel-zoom-modal 系列，
     全站只有这一个弹窗实例，首次打开时才创建。
   · open(src, { onNavigate, onClose })：
       onNavigate(dir) — 左右方向键（dir 为 -1 / 1），返回新图片地址则更新；
       onClose()       — 弹窗关闭后的回调（如恢复画廊自动播放）。
   ============================================================ */

let modal      = null;
let img        = null;
let isOpen     = false;
let isZoomedIn = false;
let onNavigate = null;
let onClose    = null;

function build() {
    if (modal) return;
    modal           = document.createElement('div');
    modal.id        = 'carouselZoomModal';
    modal.className = 'carousel-zoom-modal';
    modal.innerHTML = `<span class="carousel-zoom-close" title="关闭（Esc）" aria-label="关闭">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20"
                           fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                           <line x1="4" y1="4" x2="16" y2="16"/>
                           <line x1="16" y1="4" x2="4" y2="16"/>
                         </svg>
                       </span>
                       <img id="carouselZoomImg" src="" alt="放大图片">`;
    document.body.appendChild(modal);

    img = document.getElementById('carouselZoomImg');

    img.addEventListener('click', e => {
        e.stopPropagation();
        isZoomedIn = !isZoomedIn;
        img.classList.toggle('zoomed-in', isZoomedIn);
    });

    modal.querySelector('.carousel-zoom-close').addEventListener('click', e => {
        e.stopPropagation();
        imageZoom.close();
    });

    modal.addEventListener('click', e => {
        if (e.target === modal) imageZoom.close();
    });

    document.addEventListener('keydown', e => {
        if (!isOpen) return;
        if (e.key === 'Escape') { imageZoom.close(); return; }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && onNavigate) {
            const src = onNavigate(e.key === 'ArrowLeft' ? -1 : 1);
            if (typeof src === 'string' && src) img.src = src;
        }
    });
}

export const imageZoom = {
    open(src, opts = {}) {
        build();
        onNavigate = opts.onNavigate || null;
        onClose    = opts.onClose    || null;
        img.src    = src;
        img.classList.remove('zoomed-in');
        isZoomedIn = false;
        modal.classList.add('active');
        isOpen = true;
        document.body.style.overflow = 'hidden';
    },

    close() {
        if (!isOpen) return;
        modal.classList.remove('active');
        img.classList.remove('zoomed-in');
        isZoomedIn = false;
        isOpen     = false;
        document.body.style.overflow = '';
        const cb = onClose;
        onClose = null;
        cb?.();
    },

    get isOpen() { return isOpen; },
};
