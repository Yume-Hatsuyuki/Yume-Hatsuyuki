/**
 * fontLoader.js — 字体加载状态管理
 * 梦初雪 (Yume Hatsuyuki) 角色档案卷轴
 *
 * 等 document.fonts.ready 完成后给 body 加 .fonts-loaded（切换部分元素到
 * 日文字体），并 resolve 放行依赖字体测量的初始化（展开按钮高度计算）。
 * 3 秒超时兜底：无论成功与否都继续，避免阻塞首屏。
 */

const FONT_LOAD_TIMEOUT = 3000; // 3 秒超时回退

/**
 * 等待所有字体加载完成，完成后给 body 加 .fonts-loaded
 */
export function loadFonts() {
    return new Promise(resolve => {
        let settled = false;

        const finish = (source) => {
            if (settled) return;
            settled = true;
            document.body.classList.add('fonts-loaded');
            console.log(`[FontLoader] 完成（${source}）`);
            resolve();
        };

        const timer = setTimeout(() => {
            console.warn('[FontLoader] 超时，使用回退字体');
            finish('timeout');
        }, FONT_LOAD_TIMEOUT);

        document.fonts.ready.then(() => {
            clearTimeout(timer);
            finish('fonts.ready');
        }).catch(() => {
            clearTimeout(timer);
            finish('fonts.ready error');
        });
    });
}
