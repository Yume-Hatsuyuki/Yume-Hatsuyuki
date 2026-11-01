#!/usr/bin/env node
// build.js — 跨平台构建脚本。
// 用法：node build.js
// 产物：index.html（与之前两个脚本产出完全一致的占位符替换逻辑）

'use strict';

const fs   = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT          = __dirname;
const TEMPLATE_PATH = path.join(ROOT, 'index.template.html');
const OUTPUT_PATH   = path.join(ROOT, 'index.html');
const JSON_FILE      = path.join(ROOT, 'Yume_Hatsuyuki.json');
const GALLERY_JSON   = path.join(ROOT, 'gallery.json');
const SEALED_JSON    = path.join(ROOT, 'sealed.json');
const LINKS_JSON     = path.join(ROOT, 'links.json');
const CONTACTS_JSON  = path.join(ROOT, 'contacts.json');
const ICONS_MODULE   = path.join(ROOT, 'js', 'icons.mjs');

// ── 公用小工具 ──────────────────────────────────────────────
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 在已转义的文本上，把白名单行内标签还原回来（不接受任何属性，杜绝 XSS）
function allowInlineTags(escapedHtml) {
    return escapedHtml.replace(
        /&lt;(\/?)(del|s|strong|em|b|i|br|small|sup|sub)&gt;/g,
        '<$1$2>'
    );
}

// 把描述文字里出现的 #RRGGBB 颜色码，前面插入一个色块预览
function colorize(str) {
    return String(str ?? '').replace(
        /(#[0-9A-Fa-f]{6})/g,
        '<span class="pigment-sample" style="background:$1" title="$1"></span>$1'
    );
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ── 基础信息 / 形态信息 ──────────────────────────────────────
function generateInfoTable(obj) {
    const rows = Object.entries(obj)
        .map(([key, value]) => {
            const k = escapeHtml(key);
            const v = colorize(escapeHtml(value));
            return `<tr><th>${k}</th><td>${v}</td></tr>`;
        })
        .join('\n');
    return `<table class="profile-table"><tbody>${rows}</tbody></table>`;
}

// ── 叙事 / 权能 / 能力卡片 ───────────────────────────────────
const CARD_STYLES = {
    narrative: { border: 'var(--ink-blood)',        bright: 'var(--flow-blood-end)',  badge: '叙事', class: 'narrative' },
    power:     { border: 'var(--ink-gold)',         bright: 'var(--flow-gold-end)',   badge: '权能', class: 'power' },
    ability:   { border: 'var(--ink-royal-purple)', bright: 'var(--flow-purple-end)', badge: '能力', class: 'ability' },
};

function generateCards(items, type, nameKey, descKey, ICONS) {
    const c = CARD_STYLES[type];
    return items.map((item) => {
        const name = escapeHtml(item[nameKey]);
        const desc = allowInlineTags(escapeHtml(item[descKey]));
        const lineCount = String(item[descKey] ?? '').split('\n').length;

        const expandBtn = lineCount > 4 ? `
        <div class="expand-indicator">
          <button class="expand-btn" aria-expanded="false" aria-label="展开详细描述">
            <span>展开卷轴</span>${ICONS.chevronDown}
          </button>
        </div>` : '';

        return `<div class="spell-scroll ${c.class}" style="--accent:${c.border}; --accent-bright:${c.bright};">
  <div class="spell-header">
    <h3 class="spell-name">${name}</h3>
    <span class="spell-type">${c.badge}</span>
  </div>
  <div class="spell-divider"></div>
  <div class="spell-description expandable" aria-expanded="false">${desc}</div>
  ${expandBtn}
</div>`;
    }).join('\n');
}

// ── 画廊缩略图预渲染 ─────────────────────────────────────────
function generateGallery(items) {
    return items.map((item, idx) => {
        const src   = escapeHtml(item.src);
        const label = escapeHtml(item.label);
        const alt   = escapeHtml(item.alt || item.label);
        const labelHtml = label ? `\n  <div class="carousel-thumb-label">${label}</div>` : '';
        return `<div class="carousel-thumb-item" data-index="${idx}" title="${label}">
  <img src="${src}" alt="${alt}" loading="lazy">${labelHtml}
</div>`;
    }).join('\n');
}

// ── 封印之间静态编译 ─────────────────────────────────────────
// 与 gallery 一致：构建时把 sealed.json 注入 HTML，运行时不再 fetch。
// 容器带 hidden 属性，破封前图片不加载也不渲染。
function generateSealed(items) {
    return items.map((item) => {
        const src     = escapeHtml(item.src);
        const alt     = escapeHtml(item.alt || item.caption || '');
        const caption = item.caption
            ? `\n  <figcaption>${escapeHtml(item.caption)}</figcaption>`
            : '';
        return `<figure class="sealed-item">
  <img src="${src}" alt="${alt}" loading="lazy" decoding="async">${caption}
</figure>`;
    }).join('\n');
}

// 只接受站内 images/ 下的相对路径，拒绝 .. 与外部地址
function isSafeSealedItem(item) {
    return Boolean(item)
        && typeof item.src === 'string'
        && item.src.startsWith('images/')
        && !item.src.includes('..');
}

// ── "其他典籍" 链接分类 ──────────────────────────────────────
function generateLinks(categories, ICONS) {
    return categories
        .filter(cat => cat && cat.category) // 跳过 links.json 里的 _comment/_icons 说明字段
        .map(cat => {
            const catName = escapeHtml(cat.category);
            // 未指定 icon 时回退到 link（与原 build.sh/build.ps1 行为一致）
            const svg     = ICONS.getLoreIcon(cat.icon || 'link');
            const entries = cat.entries || [];

            const entriesHtml = entries.map((entry, i) => {
                const title = escapeHtml(entry.title);
                const url   = escapeHtml(entry.url);
                const desc  = escapeHtml(entry.description);
                const badge = entry.badge ? escapeHtml(entry.badge) : '';
                const entryClass = i >= 3 ? 'lore-entry lore-entry--hidden' : 'lore-entry';
                const badgeHtml = badge ? `\n        <span class="lore-entry-badge">${badge}</span>` : '';

                return `    <div class="${entryClass}">
      <div class="lore-entry-head">
        <h4 class="lore-entry-title"><a href="${url}" class="lore-iframe-link" data-iframe-url="${url}" data-title="${title}">${title}</a></h4>${badgeHtml}
      </div>
      <p class="lore-entry-desc">${desc}</p>
    </div>`;
            }).join('\n');

            let moreBtn = '';
            if (entries.length > 3) {
                const remaining = entries.length - 3;
                moreBtn = `\n  <button class="lore-more-btn" aria-expanded="false" data-category="${catName}">
    ${ICONS.loreChevron}
    查阅更多...${catName}（${remaining}）
  </button>`;
            }

            return `<div class="lore-category">
  <div class="lore-category-header">
    ${svg}
    <h3 class="lore-category-name">${catName}</h3>
  </div>
  <div class="lore-entries">
${entriesHtml}
  </div>${moreBtn}
</div>`;
        })
        .join('\n');
}

// ── 联系方式一栏 ─────────────────────────────────────────────
function resolveContactIcon(item, ICONS) {
    if (item.platform === 'email') return ICONS.contactEmail;
    const icon = item.icon;
    if (!icon) return ICONS.contactDefault;
    // 白名单：仅接受含标准 SVG 命名空间的内联 SVG
    if (/^<svg\s[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(icon)) return icon;
    // 白名单：仅接受 HTTPS 图片
    if (/^https:\/\//.test(icon)) return `<img src="${escapeHtml(icon)}" width="14" height="14" alt="" aria-hidden="true">`;
    return ICONS.contactDefault;
}

function generateContacts(items, ICONS) {
    const parts = [];
    items
        .filter(item => item && item.platform) // 跳过 contacts.json 里的 _comment 说明字段
        .forEach((item, i) => {
            const label = escapeHtml(item.label || '');
            const iconHtml = resolveContactIcon(item, ICONS);

            if (i > 0) parts.push('<span class="contact-sep" aria-hidden="true"></span>');

            if (item.platform === 'email') {
                const user   = escapeHtml(item.user);
                const domain = escapeHtml(item.domain);
                parts.push(`<button class="contact-item" data-eu="${user}" data-ed="${domain}" aria-label="发送邮件">${iconHtml}<span>${label}</span></button>`);
            } else {
                // 白名单：仅允许 https:// 链接
                if (!/^https:\/\//.test(item.url || '')) return;
                const url = escapeHtml(item.url);
                parts.push(`<a class="contact-item" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${iconHtml}<span>${label}</span></a>`);
            }
        });
    return parts.join('\n');
}

// ── 占位符替换（用 <!-- XXX --> 精确匹配整行，同名占位符可多处注入）──
function replacePlaceholder(html, placeholder, content) {
    const re = new RegExp(`[ \\t]*<!--\\s*${placeholder}\\s*-->[ \\t]*\\r?\\n?`, 'g');
    if (!re.test(html)) {
        console.warn(`⚠️  未找到占位符 <!-- ${placeholder} -->，请检查模板`);
        return html;
    }
    return html.replace(re, () => content + '\n');
}

// ── 主流程 ───────────────────────────────────────────────────
async function main() {
    // Windows 下绝对路径形如 X:\...\icons.mjs，动态 import() 要求标准
    // file:// URL，直接传盘符路径会报 ERR_UNSUPPORTED_ESM_URL_SCHEME，
    // 用 pathToFileURL 转换后 macOS/Linux/Windows 都能正常加载。
    const { default: ICONS } = await import(pathToFileURL(ICONS_MODULE).href);

    const data      = readJson(JSON_FILE);
    const galleryRaw = readJson(GALLERY_JSON);
    const gallery    = Array.isArray(galleryRaw) ? galleryRaw : (galleryRaw.images || []);
    const sealedRaw  = readJson(SEALED_JSON);
    const sealed     = (Array.isArray(sealedRaw) ? sealedRaw : (sealedRaw.images || []))
        .filter(isSafeSealedItem);
    const linksData  = readJson(LINKS_JSON).links || [];
    const contacts   = readJson(CONTACTS_JSON);

    const basicHtml      = generateInfoTable(data['基础信息'][0]);
    const morphHtml       = generateInfoTable(data['形态信息'][0]);
    const narrativesHtml = generateCards(data['叙事'], 'narrative', '名称', '描述', ICONS);
    const powersHtml      = generateCards(data['权能'], 'power', '名称', '描述', ICONS);
    const abilitiesHtml  = generateCards(data['能力'], 'ability', '名称', '描述', ICONS);
    const galleryHtml    = generateGallery(gallery);
    const sealedHtml     = generateSealed(sealed);
    const linksHtml       = generateLinks(linksData, ICONS);
    const contactsHtml   = generateContacts(contacts, ICONS);
    const rawJson         = JSON.stringify(data, null, 1);

    let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    html = replacePlaceholder(html, 'BASIC_INFO_TABLE', basicHtml);
    html = replacePlaceholder(html, 'MORPHOLOGY_TABLE', morphHtml);
    html = replacePlaceholder(html, 'NARRATIVES', narrativesHtml);
    html = replacePlaceholder(html, 'POWERS', powersHtml);
    html = replacePlaceholder(html, 'ABILITIES', abilitiesHtml);
    html = replacePlaceholder(html, 'GALLERY_IMAGES', galleryHtml);
    html = replacePlaceholder(html, 'SEALED_IMAGES', sealedHtml);
    html = replacePlaceholder(html, 'LORE_LINKS', linksHtml);
    html = replacePlaceholder(html, 'CONTACT_LINKS', contactsHtml);
    html = replacePlaceholder(html, 'RAW_JSON', rawJson);
    // 典籍区标题两侧的装饰花纹（right 为 CSS 镜像，模板里同名占位符出现多次）
    html = replacePlaceholder(html, 'LORE_ORNAMENT_LEFT',  ICONS.loreOrnament.replace('{side}', 'left'));
    html = replacePlaceholder(html, 'LORE_ORNAMENT_RIGHT', ICONS.loreOrnament.replace('{side}', 'right'));

    // 构建时间戳（UTC+8），格式与原脚本一致：YYYY-MM-DD HH:MM:SS
    const buildTime = new Date(Date.now() + 8 * 3600 * 1000)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19);
    html = html.replace('<!-- BUILD_TIMESTAMP -->', `<!-- Build time: ${buildTime} +0800 -->`);

    fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
    console.log(`✅ 构建完成: ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main().catch(err => {
    console.error('❌ 构建失败:', err);
    process.exit(1);
});
