/**
 * Block Type Selectors Module
 *
 * Creates type selector dropdowns for different block types.
 */

/**
 * Creates a type selector for paragraph/blockquote/codeblock blocks
 * @param {string} currentType - Current block type
 * @param {Function} onChange - Called when type changes (receives newType)
 * @returns {HTMLSelectElement} Type selector element
 */
export function createTextBlockTypeSelector(currentType, onChange) {
  const typeSelect = document.createElement('select');
  typeSelect.className = 'block-type-select';
  typeSelect.innerHTML = `
    <option value="paragraph">Paragraph</option>
    <option value="blockquote">Blockquote</option>
    <option value="codeblock">Code Block</option>
  `;
  typeSelect.value = currentType;

  if (onChange) {
    typeSelect.addEventListener('change', () => {
      onChange(typeSelect.value);
    });
  }

  return typeSelect;
}

/**
 * Creates a heading level selector
 * @param {string|number} currentLevel - Current heading level (1-6)
 * @param {Function} onChange - Called when level changes (receives newLevel)
 * @returns {HTMLSelectElement} Level selector element
 */
export function createHeadingLevelSelector(currentLevel, onChange) {
  const typeSelect = document.createElement('select');
  typeSelect.className = 'block-type-select';
  typeSelect.innerHTML = `
    <option value="1">H1</option>
    <option value="2">H2</option>
    <option value="3">H3</option>
    <option value="4">H4</option>
    <option value="5">H5</option>
    <option value="6">H6</option>
  `;
  typeSelect.value = currentLevel || '2';

  if (onChange) {
    typeSelect.addEventListener('change', () => {
      onChange(typeSelect.value);
    });
  }

  return typeSelect;
}

/**
 * Creates a list type selector
 * @param {string} currentListType - Current list type ('ordered' or 'unordered')
 * @param {Function} onChange - Called when type changes (receives newListType)
 * @returns {HTMLSelectElement} List type selector element
 */
export function createListTypeSelector(currentListType, onChange) {
  const typeSelect = document.createElement('select');
  typeSelect.className = 'block-type-select';
  typeSelect.innerHTML = `
    <option value="unordered">Unordered List</option>
    <option value="ordered">Ordered List</option>
  `;
  typeSelect.value = currentListType;

  if (onChange) {
    typeSelect.addEventListener('change', () => {
      onChange(typeSelect.value);
    });
  }

  return typeSelect;
}

/**
 * Creates a simple label for non-editable block types
 * @param {string} type - Block type ('bloglist', 'divider', or 'spacer')
 * @returns {HTMLSpanElement} Label element
 */
export function createBlockTypeLabel(type) {
  const label = document.createElement('span');
  label.className = 'block-type-label';

  if (type === 'divider') {
    label.setAttribute('data-i18n', 'editor.blockDivider');
    label.textContent = 'Divider';
  } else if (type === 'spacer') {
    label.setAttribute('data-i18n', 'editor.blockSpacer');
    label.textContent = 'Spacer';
  } else if (type === 'bloglist') {
    label.setAttribute('data-i18n', 'editor.blockBloglist');
    label.textContent = 'Bloglist';
  } else if (type === 'author') {
    label.setAttribute('data-i18n', 'editor.blockAuthor');
    label.textContent = 'Author';
  }

  return label;
}

/**
 * Creates format buttons for rich text blocks
 * @param {Function} onFormatClick - Called when format button clicked (receives cmd, block)
 * @param {HTMLElement} block - The block element (passed to onFormatClick)
 * @returns {HTMLElement} Format buttons container
 */
export function createFormatButtons(onFormatClick, block) {
  const formatBtns = document.createElement('div');
  formatBtns.className = 'block-format-buttons';

  const formats = [
    { cmd: 'bold', label: 'B', title: 'Bold', style: 'font-weight:bold' },
    { cmd: 'italic', label: 'I', title: 'Italic', style: 'font-style:italic' },
    { cmd: 'underline', label: 'U', title: 'Underline', style: 'text-decoration:underline' },
    { cmd: 'strikethrough', label: 'S', title: 'Strikethrough', style: 'text-decoration:line-through' },
    { cmd: 'code', label: '<>', title: 'Code', style: 'font-family:monospace;font-size:11px' },
    { cmd: 'link', label: '🔗', title: 'Link', style: '' }
  ];

  formats.forEach(fmt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `<span style="${fmt.style}">${fmt.label}</span>`;
    btn.title = fmt.title;
    btn.dataset.cmd = fmt.cmd;
    btn.addEventListener('click', () => {
      if (onFormatClick) onFormatClick(fmt.cmd, block);
    });
    formatBtns.appendChild(btn);
  });

  return formatBtns;
}
