/**
 * Editor Core Functions
 *
 * Critical data serialization/deserialization functions extracted from editor.html
 * for testing and maintainability.
 */

/**
 * Converts compiler inline node format back to editor-editable HTML
 * @param {Array} nodes - Array of inline nodes from compiler format
 * @returns {string} HTML string with proper escaping
 */
export function inlineNodesToHtml(nodes) {
  if (!nodes || !Array.isArray(nodes)) return '';
  return nodes.map(node => {
    switch (node.type) {
      case 'text':
        // Escape HTML entities
        return node.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      case 'linebreak':
        return '<br>';
      case 'bold':
        return `<b>${inlineNodesToHtml(node.children)}</b>`;
      case 'italic':
        return `<i>${inlineNodesToHtml(node.children)}</i>`;
      case 'underline':
        return `<u>${inlineNodesToHtml(node.children)}</u>`;
      case 'strikethrough':
        return `<s>${inlineNodesToHtml(node.children)}</s>`;
      case 'code':
        return `<code>${inlineNodesToHtml(node.children)}</code>`;
      case 'link':
        return `<a href="${node.href}">${inlineNodesToHtml(node.children)}</a>`;
      default:
        return inlineNodesToHtml(node.children);
    }
  }).join('');
}

/**
 * Parses HTML DOM elements into compiler inline node format
 * Recursively processes text nodes and formatting elements (bold, italic, links, etc.)
 * @param {HTMLElement} element - DOM element to parse
 * @returns {Array} Array of inline nodes in compiler format
 */
export function parseInlineNodes(element) {
  const nodes = [];

  function processNodeInto(node, targetArray) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) {
        targetArray.push({ type: 'text', text });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const children = [];
      for (const child of node.childNodes) {
        processNodeInto(child, children);
      }

      if (tag === 'br') {
        targetArray.push({ type: 'linebreak' });
      } else if (tag === 'b' || tag === 'strong') {
        targetArray.push({ type: 'bold', children });
      } else if (tag === 'i' || tag === 'em') {
        targetArray.push({ type: 'italic', children });
      } else if (tag === 'u') {
        targetArray.push({ type: 'underline', children });
      } else if (tag === 's' || tag === 'strike') {
        targetArray.push({ type: 'strikethrough', children });
      } else if (tag === 'code') {
        targetArray.push({ type: 'code', children });
      } else if (tag === 'a') {
        const href = node.getAttribute('href') || '';
        // Only include link if href is valid (same pattern as compiler)
        const hrefPattern = /^(\/[a-z0-9._/-]*|#[a-z0-9-]*|[a-z0-9-]+\.html|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+)$/i;
        if (href && hrefPattern.test(href)) {
          targetArray.push({ type: 'link', href, children });
        } else {
          // Invalid or empty href - just include children without link
          targetArray.push(...children);
        }
      } else {
        targetArray.push(...children);
      }
    }
  }

  for (const child of element.childNodes) {
    processNodeInto(child, nodes);
  }

  if (nodes.length === 0) {
    nodes.push({ type: 'text', text: '' });
  }

  return nodes;
}

/**
 * Extracts CSS selector from block source data
 * Priority: explicit selector > id > className
 * @param {Object} block - Block source data
 * @returns {string} CSS selector string
 */
export function selectorFromSourceBlock(block) {
  if (typeof block?.selector === 'string') {
    return block.selector.trim();
  }
  if (typeof block?.id === 'string' && block.id.trim()) {
    return `#${block.id.trim()}`;
  }
  if (typeof block?.className === 'string' && block.className.trim()) {
    return block.className
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(cls => `.${cls}`)
      .join('');
  }
  return '';
}

/**
 * Serializes a block DOM element to compiler-compatible JSON format
 * Handles all block types including nested structures (sections, layouts)
 * @param {HTMLElement} block - Block DOM element with dataset attributes
 * @returns {Object} Block in compiler source format
 */
export function serializeBlock(block) {
  const type = block.dataset.type;
  const selector = block.dataset.selector ? block.dataset.selector.trim() : '';

  function withSelector(blockData) {
    if (selector) {
      blockData.selector = selector;
    }
    return blockData;
  }

  if (type === 'section') {
    const sectionBlocks = block.querySelector('.section-blocks');
    const children = [];
    for (const childBlock of sectionBlocks.querySelectorAll(':scope > .block-item')) {
      children.push(serializeBlock(childBlock));
    }
    return withSelector({
      type: 'section',
      background: block.dataset.background,
      color: block.dataset.color,
      pattern: block.dataset.pattern || null,
      patternColor: block.dataset.patternColor || null,
      patternOpacity: block.dataset.patternOpacity || null,
      width: block.dataset.width || null,
      padding: block.dataset.padding || null,
      align: block.dataset.align || null,
      children
    });
  }

  if (type === 'layout') {
    const cellsGrid = block.querySelector('.layout-cells-grid');
    const cells = [];
    for (const cell of cellsGrid.querySelectorAll('.layout-cell')) {
      const cellBlocks = cell.querySelector('.layout-cell-blocks');
      const children = [];
      for (const childBlock of cellBlocks.querySelectorAll(':scope > .block-item')) {
        children.push(serializeBlock(childBlock));
      }
      cells.push({
        children,
        textAlign: cell.dataset.textAlign || null,
        padding: cell.dataset.padding || null,
        margin: cell.dataset.margin || null
      });
    }
    return withSelector({
      type: 'layout',
      columns: parseInt(block.dataset.columns || '2'),
      cells
    });
  }

  if (type === 'bloglist') {
    return withSelector({ type: 'bloglist' });
  }
  if (type === 'divider') {
    return withSelector({ type: 'divider' });
  }
  if (type === 'spacer') {
    return withSelector({
      type: 'spacer',
      height: block.dataset.height || '1rem'
    });
  }
  if (type === 'codeblock') {
    const contentEl = block.querySelector('.block-content');
    return withSelector({
      type: 'codeblock',
      content: contentEl.textContent || ''
    });
  }
  if (type === 'list' || type === 'unordered-list' || type === 'ordered-list') {
    const listEl = block.querySelector('.editable-list');
    const items = [];
    for (const li of listEl.querySelectorAll('li')) {
      items.push({
        children: parseInlineNodes(li)
      });
    }
    const listType = block.dataset.listType || (type === 'ordered-list' ? 'ordered' : 'unordered');
    return withSelector({
      type: listType === 'ordered' ? 'ordered-list' : 'unordered-list',
      items
    });
  }

  const contentEl = block.querySelector('.block-content');
  const children = parseInlineNodes(contentEl);

  if (type === 'heading') {
    return withSelector({
      type: 'heading',
      level: parseInt(block.dataset.level, 10),
      children
    });
  }
  if (type === 'blockquote') {
    return withSelector({ type: 'blockquote', children });
  }
  return withSelector({ type: 'paragraph', children });
}
