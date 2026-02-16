/**
 * Byte Estimation Module
 *
 * Pure functions for estimating the size of compiled HTML output.
 * Used by the editor to show byte costs in real-time.
 */

import { inlineNodesToHtml } from './editor-core.js';

/**
 * Escapes HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe string
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses a CSS selector string into id and classes
 * @param {string} selector - CSS selector (e.g., "#foo.bar.baz" or ".class1.class2")
 * @returns {{ id: string, classes: string[] }}
 */
export function parseSelector(selector) {
  if (!selector || typeof selector !== 'string') {
    return { id: '', classes: [] };
  }

  const safeToken = token => {
    if (!token) return '';
    const cleaned = token.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    return cleaned;
  };

  const normalized = selector.trim();
  if (!normalized) return { id: '', classes: [] };

  if (normalized.startsWith('#')) {
    const [idToken, ...classTokens] = normalized.slice(1).split('.');
    const id = safeToken(idToken);
    const classes = classTokens.map(safeToken).filter(Boolean);
    return { id, classes };
  }

  const source = normalized.startsWith('.') ? normalized.slice(1) : normalized;
  const classes = source
    .split(/[.\s]+/)
    .map(safeToken)
    .filter(Boolean);
  return { id: '', classes };
}

/**
 * Converts a selector to HTML attributes string
 * @param {string} selector - CSS selector
 * @param {string[]} baseClasses - Additional classes to include
 * @returns {string} HTML attributes (e.g., ' id="foo" class="bar baz"')
 */
export function selectorToAttributes(selector, baseClasses = []) {
  const parsed = parseSelector(selector);
  const classList = [...baseClasses, ...parsed.classes].filter(Boolean);
  const idAttr = parsed.id ? ` id="${parsed.id}"` : '';
  const classAttr = classList.length > 0 ? ` class="${classList.join(' ')}"` : '';
  return `${idAttr}${classAttr}`;
}

/**
 * Renders a block data object to HTML string (for byte estimation)
 * @param {Object} blockData - Serialized block data
 * @returns {string} HTML string
 */
export function renderBlockHtml(blockData) {
  if (!blockData || typeof blockData !== 'object') return '';

  if (blockData.type === 'bloglist') {
    const attrs = selectorToAttributes(blockData.selector);
    return `<div${attrs}><!-- bloglist --></div>`;
  }
  if (blockData.type === 'author') {
    const attrs = selectorToAttributes(blockData.selector);
    const parts = [];
    if (blockData.showPublished !== false) parts.push('Published: 2026-02-16');
    if (blockData.showModified !== false) parts.push('Modified: 2026-02-16');
    if (blockData.showAuthor !== false) parts.push('By Author');
    const tags = Array.isArray(blockData.tags) ? blockData.tags.filter(Boolean) : [];
    if (tags.length > 0) parts.push(`Tags: ${tags.map(tag => escapeHtml(tag)).join(', ')}`);
    return `<p${attrs}>${parts.join(' · ')}</p>`;
  }
  if (blockData.type === 'divider') {
    const attrs = selectorToAttributes(blockData.selector);
    return `<hr${attrs}>`;
  }
  if (blockData.type === 'spacer') {
    const attrs = selectorToAttributes(blockData.selector);
    return `<div${attrs} style="height:${blockData.height || '1rem'}"></div>`;
  }
  if (blockData.type === 'codeblock') {
    const attrs = selectorToAttributes(blockData.selector);
    return `<pre${attrs}><code>${escapeHtml(blockData.content || '')}</code></pre>`;
  }
  if (blockData.type === 'unordered-list' || blockData.type === 'ordered-list') {
    const tag = blockData.type === 'unordered-list' ? 'ul' : 'ol';
    const items = (blockData.items || []).map(item => {
      const inlineHtml = inlineNodesToHtml(item.children || []);
      return `<li>${inlineHtml}</li>`;
    }).join('\n');
    const attrs = selectorToAttributes(blockData.selector);
    return `<${tag}${attrs}>\n${items}\n</${tag}>`;
  }
  if (blockData.type === 'layout') {
    const cellsHtml = (blockData.cells || []).map(cell => {
      const cellContent = (cell.children || []).map(child => renderBlockHtml(child)).join('\n');
      const cellStyles = [];
      if (cell.textAlign && cell.textAlign !== 'left') cellStyles.push(`text-align:${cell.textAlign}`);
      if (cell.padding && cell.padding !== '10px') cellStyles.push(`padding:${cell.padding}`);
      if (cell.margin && cell.margin !== '10px') cellStyles.push(`margin:${cell.margin}`);
      if (cell.width && cell.width !== 'auto') cellStyles.push(`width:${cell.width}`);
      const cellStyle = cellStyles.length ? ` style="${cellStyles.join(';')}"` : '';
      return `<div class="cell"${cellStyle}>${cellContent}</div>`;
    }).join('\n');

    const styles = [];
    styles.push('display:inline-grid');
    styles.push('width:fit-content');
    styles.push('max-width:100%');
    if (blockData.columns !== 1) {
      styles.push(`grid-template-columns:repeat(${blockData.columns},1fr)`);
    }
    if (blockData.rows) {
      styles.push(`grid-template-rows:repeat(${blockData.rows},auto)`);
    }
    const rowGap = blockData.rowGap || '0';
    const colGap = blockData.columnGap || '0';
    if (!(rowGap === '0' && colGap === '0')) {
      if (rowGap === colGap) {
        styles.push(`gap:${rowGap}`);
      } else {
        styles.push(`gap:${rowGap} ${colGap}`);
      }
    }

    const classes = ['layout'];
    if (blockData.className) classes.push(blockData.className);
    const attrs = selectorToAttributes(blockData.selector, classes);
    return `<div${attrs} style="${styles.join(';')}">${cellsHtml}</div>`;
  }
  if (blockData.type === 'section') {
    const childrenHtml = (blockData.children || []).map(child => renderBlockHtml(child)).join('\n');
    const styles = [];
    if (blockData.background && blockData.background !== 'transparent') styles.push(`--sb:${blockData.background}`);
    if (blockData.color && blockData.color !== 'inherit') styles.push(`--sc:${blockData.color}`);
    if (blockData.pattern && blockData.patternColor && blockData.patternOpacity && blockData.patternOpacity !== '0' && blockData.patternOpacity !== 0) {
      const hex = blockData.patternColor;
      const opacity = blockData.patternOpacity;
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      styles.push(`--pc:rgba(${r},${g},${b},${opacity})`);
    }
    if (blockData.width && blockData.width !== '100%') styles.push(`--sw:${blockData.width}`);
    if (blockData.padding && blockData.padding !== '3rem') styles.push(`--sp:${blockData.padding}`);
    if (blockData.align && blockData.align !== 'start') styles.push(`--sa:${blockData.align}`);

    const classes = [];
    if (blockData.pattern === 'dots') classes.push('bg-pattern-dots');
    if (blockData.pattern === 'grid') classes.push('bg-pattern-grid');
    if (blockData.pattern === 'stripes') classes.push('bg-pattern-stripes');
    if (blockData.pattern === 'cross') classes.push('bg-pattern-cross');
    if (blockData.pattern === 'hexagons') classes.push('bg-pattern-hexagons');

    const styleAttr = styles.length > 0 ? ` style="${styles.join(';')}"` : '';
    const attrs = selectorToAttributes(blockData.selector, classes);
    return `<section${attrs}${styleAttr}>${childrenHtml}</section>`;
  }

  const inlineHtml = inlineNodesToHtml(blockData.children || []);
  const attrs = selectorToAttributes(blockData.selector);
  if (blockData.type === 'heading') {
    const level = blockData.level ?? 1;
    return `<h${level}${attrs}>${inlineHtml}</h${level}>`;
  }
  if (blockData.type === 'blockquote') {
    return `<blockquote${attrs}>${inlineHtml}</blockquote>`;
  }
  return `<p${attrs}>${inlineHtml}</p>`;
}

/**
 * Estimates the byte size of a serialized block's HTML
 * @param {Object} blockData - Serialized block data
 * @returns {number} Estimated bytes
 */
export function estimateBlockSize(blockData) {
  const html = renderBlockHtml(blockData);
  const encoder = new TextEncoder();
  return encoder.encode(html).length;
}

/**
 * Estimates the total byte size of multiple blocks
 * @param {Object[]} blocks - Array of serialized block data
 * @returns {number} Total estimated bytes
 */
export function estimateContentSize(blocks) {
  if (!Array.isArray(blocks)) return 0;
  return blocks.reduce((total, block) => {
    return total + estimateBlockSize(block);
  }, 0);
}
