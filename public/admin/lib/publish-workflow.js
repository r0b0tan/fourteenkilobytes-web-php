/**
 * Publish Workflow Module
 *
 * Business logic for publishing pages with pagination handling.
 * Separated from DOM manipulation for better testability.
 */

/**
 * Validates publish data before compilation
 * @param {Object} data - Data to validate
 * @param {string} data.title - Page title
 * @param {number} data.blockCount - Number of blocks
 * @param {Function} t - Translation function
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePublishData(data, t) {
  if (!data.title || !data.title.trim()) {
    return {
      valid: false,
      error: t('editor.titleRequired')
    };
  }

  if (data.blockCount === 0) {
    return {
      valid: false,
      error: t('editor.blockRequired')
    };
  }

  return { valid: true };
}

/**
 * Determines if pagination is needed and gets user consent
 * @param {Object} config - Configuration object
 * @param {Function} config.buildInput - Function to build input (accepts shouldPaginate boolean)
 * @param {Object} config.App - App module with preview method
 * @param {Object} config.Modal - Modal module with confirm/error methods
 * @param {Function} config.t - Translation function
 * @returns {Promise<{ shouldPaginate: boolean, aborted: boolean }>}
 */
export async function determinePaginationStrategy(config) {
  const { buildInput, App, Modal, t } = config;

  // First, check if pagination would be needed
  // Use App.preview() to include global settings (navigation, footer, CSS, etc.)
  const inputPreview = await buildInput(false);
  let shouldPaginate = false;

  // Try compiling without pagination first (with global settings applied)
  const previewResult = await App.preview(inputPreview);

  // Check if size limit exceeded (App.preview returns exceeded: true instead of throwing)
  if (previewResult.exceeded) {
    // Post is too large, try with pagination
    const inputWithPagination = await buildInput(true);
    const paginatedResult = await App.preview(inputWithPagination);

    if (!paginatedResult.exceeded && paginatedResult.measurements && paginatedResult.measurements.length > 1) {
      const estimatedPageCount = paginatedResult.measurements.length;

      // Ask user if they want to split
      const splitConfirmed = await Modal.confirm(
        t('editor.splitConfirm', { bytes: previewResult.bytes, pages: estimatedPageCount })
      );

      if (splitConfirmed) {
        shouldPaginate = true;
      } else {
        // User declined, abort publish
        return { shouldPaginate: false, aborted: true, error: t('editor.tooLarge') };
      }
    } else {
      // Can't be paginated
      return { shouldPaginate: false, aborted: true, error: t('editor.cannotSplit') };
    }
  } else if (previewResult.bytes > 14336) {
    // Compiled successfully but over 14KB - offer to split
    const inputWithPagination = await buildInput(true);
    const paginatedResult = await App.preview(inputWithPagination);

    if (!paginatedResult.exceeded && paginatedResult.measurements && paginatedResult.measurements.length > 1) {
      const estimatedPageCount = paginatedResult.measurements.length;

      // Ask user if they want to split
      const splitConfirmed = await Modal.confirm(
        t('editor.splitConfirm', { bytes: previewResult.bytes, pages: estimatedPageCount })
      );

      if (splitConfirmed) {
        shouldPaginate = true;
      } else {
        // User declined but can still publish without pagination
        return { shouldPaginate: false, aborted: false };
      }
    }
  }

  return { shouldPaginate, aborted: false };
}

/**
 * Executes the publish operation and shows success modal
 * @param {Object} config - Configuration object
 * @param {Object} config.input - Compiled input data
 * @param {Object} config.App - App module with publish method
 * @param {Object} config.Modal - Modal module with success method
 * @param {Function} config.t - Translation function
 * @returns {Promise<Object>} Publish result
 */
export async function executePublish(config) {
  const { input, App, Modal, t } = config;

  const result = await App.publish(input);

  const sizeInfo = result.pageCount && result.pageCount > 1
    ? `${result.pageCount} pages, ${result.totalBytes} bytes`
    : `${result.bytes} bytes`;

  Modal.success(
    `<strong>${t('editor.buildSuccess')}</strong><br>/${result.slug} (${sizeInfo})`,
    [
      { text: t('modal.ok'), class: 'btn-secondary' },
      { text: t('dashboard.view'), class: 'btn-primary', action: () => window.open(`/${result.slug}`, '_blank') }
    ],
    true
  );

  return result;
}

/**
 * Resets editor form to initial state after successful publish
 * @param {Object} elements - DOM elements to reset
 * @param {HTMLInputElement} elements.titleInput - Title input element
 * @param {HTMLInputElement} elements.slugInput - Slug input element
 * @param {HTMLElement} elements.blockEditor - Block editor container
 * @param {HTMLInputElement} elements.titleOverrideEnabled - Title override checkbox
 * @param {HTMLInputElement} elements.titleOverrideInput - Title override input
 * @param {HTMLInputElement} elements.navEnabled - Navigation override checkbox
 * @param {HTMLInputElement} elements.footerEnabled - Footer override checkbox
 * @param {HTMLTextAreaElement} elements.footerText - Footer text area
 * @param {HTMLInputElement} elements.metaEnabled - Meta override checkbox
 * @param {HTMLTextAreaElement} elements.metaDescription - Meta description textarea
 * @param {HTMLInputElement} elements.metaAuthor - Meta author input
 * @param {HTMLInputElement} elements.cssEnabled - CSS override checkbox
 * @param {HTMLTextAreaElement} elements.cssRules - CSS rules textarea
 * @param {HTMLElement} elements.liveCSS - Live CSS style element
 * @param {HTMLSelectElement} elements.pageTypeSelect - Page type select
 * @param {HTMLElement} elements.pageTypeHint - Page type hint element
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.createBlockElement - Function to create block element
 * @param {Function} callbacks.loadGlobalNavigation - Function to load global navigation
 * @param {Function} callbacks.clearAutoSave - Function to clear auto-save
 * @param {Function} callbacks.updateByteCounter - Function to update byte counter
 * @param {Function} callbacks.updateCostRail - Function to update cost rail
 * @param {Function} callbacks.updateTitleBytes - Function to update title bytes
 */
export function resetEditorForm(elements, callbacks) {
  const {
    titleInput,
    slugInput,
    blockEditor,
    titleOverrideEnabled,
    titleOverrideInput,
    navEnabled,
    footerEnabled,
    footerText,
    metaEnabled,
    metaDescription,
    metaAuthor,
    cssEnabled,
    cssRules,
    liveCSS,
    pageTypeSelect,
    pageTypeHint
  } = elements;

  const {
    createBlockElement,
    loadGlobalNavigation,
    clearAutoSave,
    updateByteCounter,
    updateCostRail,
    updateTitleBytes
  } = callbacks;

  // Clear all fields
  titleInput.value = '';
  slugInput.value = '';
  blockEditor.innerHTML = '';

  // Add one empty paragraph block
  const emptyBlock = createBlockElement('paragraph');
  blockEditor.appendChild(emptyBlock);

  // Reset title override
  titleOverrideEnabled.checked = false;
  titleOverrideEnabled.dispatchEvent(new Event('change'));
  titleOverrideInput.value = '';

  // Reset navigation
  navEnabled.checked = false;
  navEnabled.dispatchEvent(new Event('change'));
  loadGlobalNavigation();

  // Reset footer
  footerEnabled.checked = false;
  footerEnabled.dispatchEvent(new Event('change'));
  footerText.value = '';

  // Reset meta
  metaEnabled.checked = false;
  metaEnabled.dispatchEvent(new Event('change'));
  metaDescription.value = '';
  metaAuthor.value = '';

  // Reset CSS
  cssEnabled.checked = false;
  cssEnabled.dispatchEvent(new Event('change'));
  cssRules.value = '';
  liveCSS.textContent = '';

  // Reset page type
  pageTypeSelect.value = 'post';
  pageTypeHint.textContent = '';

  // Clear auto-save
  clearAutoSave();

  // Reset byte counter
  updateByteCounter(0, 0);
  updateCostRail();
  updateTitleBytes();
}
