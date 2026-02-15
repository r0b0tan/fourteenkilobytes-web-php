/**
 * Block Content Builders Module
 *
 * Creates content areas for different block types.
 */

/**
 * Creates bloglist placeholder content
 * @returns {HTMLElement} Bloglist content element
 */
export function createBloglistContent() {
  const content = document.createElement('div');
  content.contentEditable = 'false';
  content.className = 'block-content block-bloglist';
  content.innerHTML = `
    <div class="bloglist-config">
      <div class="bloglist-info">
        <em style="color: #999;" data-i18n="editor.bloglistPlaceholder">Blog posts will be listed here automatically</em>
      </div>
      <div class="bloglist-settings-link">
        <a href="settings.html#bloglist" style="color: var(--text-secondary); font-size: 12px;" data-i18n="editor.bloglistSettingsLink">Configure in Settings → Bloglist</a>
      </div>
    </div>
  `;
  return content;
}

/**
 * Creates list content with editable items
 * @param {Object} config - Configuration
 * @param {string} config.listType - 'ordered' or 'unordered'
 * @param {string} config.initialHtml - Initial HTML content
 * @param {Function} config.setupListKeyHandlers - Function to setup keyboard handlers
 * @returns {HTMLElement} List content element
 */
export function createListContent(config) {
  const { listType, initialHtml = '', setupListKeyHandlers } = config;

  const content = document.createElement('div');
  content.className = 'block-content block-list';

  const listEl = document.createElement(listType === 'ordered' ? 'ol' : 'ul');
  listEl.className = 'editable-list';

  // Check if initialHtml contains a list (for restoring saved data)
  if (initialHtml && (initialHtml.includes('<li>') || initialHtml.includes('<li '))) {
    // Parse the saved HTML to extract list items
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = initialHtml;
    const existingList = tempDiv.querySelector('ul, ol');
    const existingItems = existingList ? existingList.querySelectorAll('li') : tempDiv.querySelectorAll('li');

    if (existingItems.length > 0) {
      existingItems.forEach(existingLi => {
        const li = document.createElement('li');
        li.contentEditable = 'true';
        li.dataset.placeholder = 'List item...';
        li.innerHTML = existingLi.innerHTML;
        listEl.appendChild(li);
      });
    } else {
      // Fallback: create empty item
      const li = document.createElement('li');
      li.contentEditable = 'true';
      li.dataset.placeholder = 'List item...';
      listEl.appendChild(li);
    }
  } else {
    // New list: create single empty item
    const li = document.createElement('li');
    li.contentEditable = 'true';
    li.dataset.placeholder = 'List item...';
    li.innerHTML = initialHtml || '';
    listEl.appendChild(li);
  }

  if (setupListKeyHandlers) {
    setupListKeyHandlers(listEl);
  }

  content.appendChild(listEl);
  return content;
}

/**
 * Creates divider content
 * @returns {HTMLElement} Divider content element
 */
export function createDividerContent() {
  const content = document.createElement('div');
  content.contentEditable = 'false';
  content.className = 'block-content block-divider';
  content.innerHTML = '<hr>';
  return content;
}

/**
 * Creates spacer content with height control
 * @param {Object} config - Configuration
 * @param {string} config.height - Initial height value
 * @param {HTMLElement} config.block - Block element (to update dataset.height)
 * @param {Function} config.onChange - Called when height changes
 * @returns {HTMLElement} Spacer content element
 */
export function createSpacerContent(config) {
  const { height = '1rem', block, onChange } = config;

  const content = document.createElement('div');
  content.contentEditable = 'false';
  content.className = 'block-content block-spacer';

  const spacerPreview = document.createElement('div');
  spacerPreview.className = 'spacer-preview';
  spacerPreview.style.height = height;

  const spacerControls = document.createElement('div');
  spacerControls.className = 'spacer-controls';

  const spacerLabel = document.createElement('label');
  spacerLabel.setAttribute('data-i18n', 'editor.spacerHeight');
  spacerLabel.textContent = 'Height';

  const spacerInput = document.createElement('input');
  spacerInput.type = 'text';
  spacerInput.className = 'spacer-height-input';
  spacerInput.placeholder = '1rem';
  spacerInput.value = height;

  spacerInput.addEventListener('input', () => {
    const value = spacerInput.value.trim() || '1rem';
    if (block) block.dataset.height = value;
    spacerPreview.style.height = value;
    if (onChange) onChange();
  });

  spacerLabel.appendChild(spacerInput);
  spacerControls.appendChild(spacerLabel);
  spacerPreview.appendChild(spacerControls);
  content.appendChild(spacerPreview);

  return content;
}

/**
 * Creates codeblock content
 * @param {string} initialHtml - Initial code content
 * @returns {HTMLElement} Codeblock content element
 */
export function createCodeblockContent(initialHtml = '') {
  const content = document.createElement('div');
  content.contentEditable = 'true';
  content.className = 'block-content block-codeblock';
  content.dataset.placeholder = 'Code...';
  content.textContent = initialHtml;
  return content;
}

/**
 * Creates blockquote content
 * @param {string} initialHtml - Initial quote content
 * @returns {HTMLElement} Blockquote content element
 */
export function createBlockquoteContent(initialHtml = '') {
  const content = document.createElement('div');
  content.contentEditable = 'true';
  content.className = 'block-content';
  content.dataset.placeholder = 'Quote...';
  content.innerHTML = initialHtml;
  return content;
}

/**
 * Creates paragraph content
 * @param {string} initialHtml - Initial paragraph content
 * @returns {HTMLElement} Paragraph content element
 */
export function createParagraphContent(initialHtml = '') {
  const content = document.createElement('div');
  content.contentEditable = 'true';
  content.className = 'block-content';
  content.dataset.placeholder = 'Enter text...';
  content.innerHTML = initialHtml;
  return content;
}

/**
 * Creates heading content
 * @param {string} initialHtml - Initial heading content
 * @returns {HTMLElement} Heading content element
 */
export function createHeadingContent(initialHtml = '') {
  const content = document.createElement('div');
  content.contentEditable = 'true';
  content.className = 'block-content';
  content.dataset.placeholder = 'Heading...';
  content.innerHTML = initialHtml;
  return content;
}
