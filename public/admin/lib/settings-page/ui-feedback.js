export function createToast(doc = document) {
  let container = doc.getElementById('toast-container');
  if (!container) {
    container = doc.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    doc.body.appendChild(container);
  }

  function show(text, type = 'success', duration = 3000) {
    const toast = doc.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = text;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  }

  return {
    success: (text) => show(text, 'success'),
    error: (text) => show(text, 'error')
  };
}

export function createModal({ doc = document, t }) {
  const backdrop = doc.getElementById('modal-backdrop');
  const modal = doc.getElementById('modal');
  const message = doc.getElementById('modal-message');
  const actions = doc.getElementById('modal-actions');

  function hide() {
    modal.classList.add('hidden');
    backdrop.classList.add('hidden');
    modal.className = 'modal hidden';
    actions.innerHTML = '';
  }

  function show(text, buttons, type = '') {
    message.textContent = text;
    actions.innerHTML = '';
    modal.className = 'modal' + (type ? ` modal-${type}` : '');

    buttons.forEach(btn => {
      const button = doc.createElement('button');
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
    confirm(text) {
      return new Promise(resolve => {
        show(text, [
          { text: t('modal.yes'), class: 'btn-primary', action: () => resolve(true) },
          { text: t('modal.cancel'), class: 'btn-secondary', action: () => resolve(false) }
        ]);
      });
    },

    success(text) {
      show(text, [{ text: t('modal.ok'), class: 'btn-primary' }], 'success');
    },

    error(text) {
      show(text, [{ text: t('modal.ok'), class: 'btn-primary' }], 'error');
    },

    hide
  };
}
