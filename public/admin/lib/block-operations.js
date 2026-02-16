/**
 * Block Operations Module
 *
 * Provides operations for manipulating blocks in the editor (move, insert, style).
 */

/**
 * Updates the styling of a block based on its type and level
 * @param {HTMLElement} block - Block element
 */
export function updateBlockStyling(block) {
  const content = block.querySelector('.block-content');
  if (!content) return;

  const type = block.dataset.type;
  const level = block.dataset.level;

  // Reset styles
  content.style.fontSize = '';
  content.style.fontWeight = '';
  content.style.fontStyle = '';
  content.style.borderLeft = '';
  content.style.paddingLeft = '';

  if (type === 'heading') {
    content.style.fontWeight = 'bold';
    const sizes = { 1: '2rem', 2: '1.5rem', 3: '1.25rem', 4: '1.1rem', 5: '1rem', 6: '0.875rem' };
    content.style.fontSize = sizes[level] || '1rem';
    content.dataset.placeholder = 'Heading...';
  } else if (type === 'blockquote') {
    content.style.fontStyle = 'italic';
    content.style.borderLeft = '3px solid var(--border)';
    content.style.paddingLeft = '12px';
    content.dataset.placeholder = 'Quote...';
  } else if (type === 'codeblock') {
    content.dataset.placeholder = 'Code...';
  } else if (type !== 'bloglist' && type !== 'divider' && type !== 'list' && type !== 'spacer' && type !== 'author') {
    content.dataset.placeholder = 'Enter text...';
  }
}

/**
 * Inserts a block directly below a reference block
 * @param {HTMLElement} referenceBlock - Reference block
 * @param {HTMLElement} newBlock - Block to insert
 */
export function insertBlockBelow(referenceBlock, newBlock) {
  const parent = referenceBlock?.parentElement;
  if (!parent || !newBlock) return;

  const blockSiblings = Array.from(parent.children).filter(el => el.classList?.contains('block-item'));
  const index = blockSiblings.indexOf(referenceBlock);

  if (index === -1) {
    parent.appendChild(newBlock);
    return;
  }

  const nextBlock = blockSiblings[index + 1] || null;
  if (nextBlock) {
    parent.insertBefore(newBlock, nextBlock);
  } else {
    parent.appendChild(newBlock);
  }
}

/**
 * Moves a block up or down
 * @param {HTMLElement} block - Block to move
 * @param {number} direction - Direction (-1 for up, 1 for down)
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onChange - Called after move
 */
export function moveBlock(block, direction, callbacks = {}) {
  const parent = block?.parentElement;
  if (!parent) return;

  const blocks = Array.from(parent.children).filter(el => el.classList?.contains('block-item'));
  const index = blocks.indexOf(block);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= blocks.length) return;

  if (direction < 0) {
    parent.insertBefore(block, blocks[newIndex]);
  } else {
    parent.insertBefore(block, blocks[newIndex].nextSibling);
  }

  if (callbacks.onChange) callbacks.onChange();
}

/**
 * Wraps the current selection with a tag, or unwraps if already wrapped
 * @param {string} tagName - Tag name (e.g., 'code', 'strong')
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onChange - Called after wrapping
 */
export function toggleSelectionWrap(tagName, callbacks = {}) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return;

  const range = sel.getRangeAt(0);

  // Check if already wrapped in this tag
  const parentTag = sel.anchorNode.parentElement.closest(tagName);
  if (parentTag) {
    // Unwrap: replace tag with its contents
    const parent = parentTag.parentNode;
    while (parentTag.firstChild) {
      parent.insertBefore(parentTag.firstChild, parentTag);
    }
    parent.removeChild(parentTag);
  } else {
    // Wrap selection
    const wrapper = document.createElement(tagName);
    try {
      range.surroundContents(wrapper);
    } catch (err) {
      // surroundContents can fail if selection spans multiple elements
      // In that case, just wrap the text content
      console.warn('Could not wrap selection:', err);
    }
  }

  if (callbacks.onChange) callbacks.onChange();
}
