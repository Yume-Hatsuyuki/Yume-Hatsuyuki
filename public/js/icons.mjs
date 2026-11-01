// icons.mjs — 全站共用 SVG 图标，唯一定义
//
// 用 .mjs 是为了让同一份文件能被两处安全共用：
//   1) 浏览器运行时 ui.js  → import ICONS from './icons.mjs'
//   2) 构建脚本 build.js（Node，CommonJS）→ 用动态 import() 加载
// 这样图标只需要改一处，不会出现 build.sh / build.ps1 / ui.js
// 三份拷贝不同步的问题。

const ICONS = {
    // ── 卷轴展开/收起箭头 ──────────────────────────────────
    chevronDown:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 9" width="12" height="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1,1 7,7 13,1"/></svg>',
    chevronUp:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 9" width="12" height="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1,7 7,1 13,7"/></svg>',
    // "其他典籍" 栏目查阅更多的箭头，样式相同但带 class
    loreChevron:
        '<svg class="lore-more-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 9" width="11" height="7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1,1 7,7 13,1"/></svg>',

    // ── "其他典籍" 标题两侧的装饰花纹 ─────────────────────
    // right 侧由 CSS transform: scaleX(-1) 镜像生成，只需维护左侧一份；
    // class 里的 {side} 由 build.js 注入时替换为 left / right。
    loreOrnament:
        '<svg class="lore-nexus-ornament {side}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 16" fill="none" aria-hidden="true"><line x1="0" y1="8" x2="28" y2="8" stroke="currentColor" stroke-width="1"/><polygon points="28,8 34,4 36,8 34,12" fill="currentColor" opacity="0.7"/><line x1="36" y1="8" x2="44" y2="8" stroke="currentColor" stroke-width="1"/><circle cx="48" cy="8" r="2.5" fill="currentColor" opacity="0.9"/><line x1="50.5" y1="8" x2="58" y2="8" stroke="currentColor" stroke-width="1"/><polygon points="58,8 64,4 66,8 64,12" fill="currentColor" opacity="0.7"/><line x1="66" y1="8" x2="80" y2="8" stroke="currentColor" stroke-width="1"/></svg>',

    // ── 联系方式默认/邮箱图标 ──────────────────────────────
    contactDefault:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    contactEmail:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>',

    // ── "其他典籍" 分类图标（links.json 里 icon 字段可选 tome/quill/sword/map/link）──
    lore: {
        tome:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4 Q4 2 6 2 L18 2 Q20 2 20 4 L20 20 Q20 22 18 22 L6 22 Q4 22 4 20 Z"/><path d="M4 4 Q2 4 2 7 Q2 10 4 10"/><path d="M4 20 Q2 20 2 17 Q2 14 4 14"/><line x1="8" y1="8" x2="16" y2="8" stroke-width="0.9"/><line x1="8" y1="11.5" x2="16" y2="11.5" stroke-width="0.9"/><line x1="8" y1="15" x2="13" y2="15" stroke-width="0.9"/></svg>',
        quill:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 3 Q22 1 22 3 Q18 7 14 10 L10 20 L8 18 Q11 14 14 10 Q17 6 20 3 Z"/><path d="M8 18 L6 22 L10 20"/><line x1="14" y1="10" x2="10" y2="14" stroke-width="0.8"/></svg>',
        sword:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="7" y1="9" x2="17" y2="9"/><polygon points="12,2 13.5,7 12,5.5 10.5,7" fill="currentColor" stroke="none"/></svg>',
        map:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
        link:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        default:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    },
};

// 分类图标兜底：拿不到对应 key 时退回 default（links.json 里 icon 字段写错也不会报错）
ICONS.getLoreIcon = (name) => ICONS.lore[name] || ICONS.lore.default;

export default ICONS;
