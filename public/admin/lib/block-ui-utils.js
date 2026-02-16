/**
 * Block UI Utilities Module
 *
 * Reusable UI components for block editor.
 * Uses callback pattern to decouple from specific DOM side-effects.
 */

/**
 * Creates a CSS selector control input
 * @param {Object} config - Configuration object
 * @param {string} config.initialValue - Initial selector value
 * @param {Function} config.onChange - Callback when selector changes (receives new value)
 * @returns {HTMLInputElement} Selector input element
 */
export function createBlockSelectorControl(config) {
  const { initialValue = '', onChange } = config;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'block-selector-input';
  input.placeholder = '.your-css-class';
  input.title = 'CSS selector';
  input.value = initialValue;

  input.addEventListener('input', () => {
    const value = input.value.trim();
    if (onChange) onChange(value);
  });

  return input;
}

/**
 * Creates block action buttons (up, down, copy, delete)
 * @param {Object} callbacks - Callback functions for actions
 * @param {Function} callbacks.onMoveUp - Called when up button clicked
 * @param {Function} callbacks.onMoveDown - Called when down button clicked
 * @param {Function} callbacks.onDuplicate - Called when duplicate button clicked
 * @param {Function} callbacks.onDelete - Called when delete button clicked
 * @param {Object} options - Options
 * @param {boolean} options.includeSelector - Whether to include selector control (default: true)
 * @param {string} options.selectorValue - Initial selector value
 * @returns {HTMLElement} Actions container element
 */
export function createBlockActions(callbacks, options = {}) {
  const {
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onDelete
  } = callbacks;

  const {
    includeSelector = true,
    selectorValue = ''
  } = options;

  const actions = document.createElement('div');
  actions.className = 'block-item-actions';

  // Selector control (optional)
  if (includeSelector) {
    const selectorControl = createBlockSelectorControl({
      initialValue: selectorValue,
      onChange: callbacks.onSelectorChange
    });
    actions.appendChild(selectorControl);
  }

  // Up button
  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.textContent = '↑';
  upBtn.title = 'Move up';
  upBtn.addEventListener('click', () => {
    if (onMoveUp) onMoveUp();
  });
  actions.appendChild(upBtn);

  // Down button
  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.textContent = '↓';
  downBtn.title = 'Move down';
  downBtn.addEventListener('click', () => {
    if (onMoveDown) onMoveDown();
  });
  actions.appendChild(downBtn);

  // Duplicate button
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.innerHTML = '⧉';
  copyBtn.title = 'Duplicate';
  copyBtn.addEventListener('click', () => {
    if (onDuplicate) onDuplicate();
  });
  actions.appendChild(copyBtn);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.textContent = '×';
  deleteBtn.title = 'Delete';
  deleteBtn.addEventListener('click', () => {
    if (onDelete) onDelete();
  });
  actions.appendChild(deleteBtn);

  return actions;
}

/**
 * Creates a block header with label and actions
 * @param {Object} config - Configuration object
 * @param {string} config.label - Block type label
 * @param {string} config.i18nKey - i18n key for label
 * @param {Object} config.callbacks - Action callbacks
 * @param {Object} config.options - Options for actions
 * @param {HTMLElement} config.extraControl - Optional extra control element (e.g., type selector)
 * @returns {HTMLElement} Header element
 */
export function createBlockHeader(config) {
  const {
    label,
    i18nKey,
    callbacks,
    options = {},
    extraControl = null
  } = config;

  const header = document.createElement('div');
  header.className = 'block-header';

  const labelEl = document.createElement('span');
  labelEl.className = 'block-type-label';
  if (i18nKey) labelEl.setAttribute('data-i18n', i18nKey);
  labelEl.textContent = label;
  header.appendChild(labelEl);

  // Extra control (type selector, etc.)
  if (extraControl) {
    header.appendChild(extraControl);
  }

  // Actions
  const actions = createBlockActions(callbacks, options);
  header.appendChild(actions);

  return header;
}

/**
 * Creates an "Add Block" dropdown for nested blocks (sections/layouts)
 * @param {Object} config - Configuration object
 * @param {Function} config.onBlockAdd - Called when a block type is selected (receives type, level, listType, spacerHeight)
 * @param {Array<Object>} config.blockTypes - Available block types
 * @param {string} config.buttonLabel - Label for add button (default: '+ Add Block')
 * @param {string} config.buttonI18nKey - i18n key for button
 * @returns {HTMLElement} Add block row element
 */
export function createInnerAddBlock(config) {
  const {
    onBlockAdd,
    blockTypes = [
      { type: 'paragraph', i18n: 'editor.blockParagraph', label: 'Paragraph' },
      { type: 'heading', i18n: 'editor.blockHeading', label: 'Heading', level: '2' },
      { type: 'list', i18n: 'editor.blockList', label: 'List', listType: 'unordered' },
      { type: 'divider', i18n: 'editor.blockDivider', label: 'Divider' },
      { type: 'spacer', i18n: 'editor.blockSpacer', label: 'Spacer' },
      { type: 'bloglist', i18n: 'editor.blockBloglist', label: 'Bloglist' },
      { type: 'layout', i18n: 'editor.blockLayout', label: 'Layout' }
    ],
    buttonLabel = '+ Add Block',
    buttonI18nKey = 'editor.sectionAddBlock'
  } = config;

  const row = document.createElement('div');
  row.className = 'section-add-row';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-secondary section-add-block';
  btn.setAttribute('data-i18n', buttonI18nKey);
  btn.textContent = buttonLabel;

  const dropdown = document.createElement('div');
  dropdown.className = 'add-block-dropdown hidden';

  blockTypes.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t.label;
    b.setAttribute('data-i18n', t.i18n);
    b.dataset.type = t.type;
    if (t.level) b.dataset.level = t.level;
    if (t.listType) b.dataset.listType = t.listType;
    if (t.spacerHeight) b.dataset.spacerHeight = t.spacerHeight;
    dropdown.appendChild(b);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  dropdown.addEventListener('click', (e) => {
    const clicked = e.target.closest('button');
    if (!clicked) return;

    const blockConfig = {
      type: clicked.dataset.type,
      level: clicked.dataset.level,
      listType: clicked.dataset.listType,
      spacerHeight: clicked.dataset.spacerHeight
    };

    if (onBlockAdd) onBlockAdd(blockConfig);
    dropdown.classList.add('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.section-add-row')) {
      dropdown.classList.add('hidden');
    }
  });

  row.appendChild(btn);
  row.appendChild(dropdown);
  return row;
}

/**
 * Creates a byte indicator element
 * @param {string} initialText - Initial text (default: '0 B')
 * @returns {HTMLElement} Byte indicator element
 */
export function createByteIndicator(initialText = '0 B') {
  const byteIndicator = document.createElement('div');
  byteIndicator.className = 'block-byte-indicator';
  byteIndicator.textContent = initialText;
  return byteIndicator;
}
