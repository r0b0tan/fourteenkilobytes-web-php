/**
 * Modal Utilities Module
 *
 * Provides modal dialog functionality (confirm, success, error, info).
 * Uses existing modal DOM elements from editor.html.
 */

/**
 * Creates a modal manager
 * @param {Object} elements - DOM elements
 * @param {HTMLElement} elements.backdrop - Modal backdrop element
 * @param {HTMLElement} elements.modal - Modal container element
 * @param {HTMLElement} elements.message - Message container element
 * @param {HTMLElement} elements.actions - Actions container element
 * @returns {Object} Modal API
 */
export function createModalManager(elements) {
  const { backdrop, modal, message, actions } = elements;

  function hide() {
    modal.classList.add('hidden');
    backdrop.classList.add('hidden');
    modal.className = 'modal hidden';
    actions.innerHTML = '';
  }

  function show(text, buttons, type = '', html = false) {
    if (html) {
      message.innerHTML = text;
    } else {
      message.textContent = text;
    }
    actions.innerHTML = '';
    modal.className = 'modal' + (type ? ` modal-${type}` : '');

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = btn.text;
      button.className = btn.class || '';
      button.addEventListener('click', () => {
        hide();
        if (btn.action) btn.action();
      });
      actions.appendChild(button);
    });

    backdrop.classList.remove('hidden');
    modal.classList.remove('hidden');
  }

  return {
    /**
     * Shows a confirmation dialog
     * @param {string} text - Confirmation message
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     */
    confirm(text) {
      return new Promise(resolve => {
        show(text, [
          { text: 'Yes', class: 'btn-primary', action: () => resolve(true) },
          { text: 'Cancel', class: 'btn-secondary', action: () => resolve(false) }
        ]);
      });
    },

    /**
     * Shows a success modal
     * @param {string} text - Success message
     * @param {Array} buttons - Optional custom buttons
     * @param {boolean} html - Whether text is HTML
     */
    success(text, buttons = null, html = false) {
      show(text, buttons || [{ text: 'OK', class: 'btn-primary' }], 'success', html);
    },

    /**
     * Shows an error modal
     * @param {string} text - Error message
     * @param {boolean} html - Whether text is HTML
     */
    error(text, html = false) {
      show(text, [{ text: 'OK', class: 'btn-primary' }], 'error', html);
    },

    /**
     * Shows an info modal
     * @param {string} text - Info message
     */
    info(text) {
      show(text, [{ text: 'OK', class: 'btn-primary' }]);
    },

    /**
     * Hides the modal
     */
    hide
  };
}
