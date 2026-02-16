import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEditorRichtextTools } from '../../public/admin/lib/editor/richtext-tools.js';

function setSelectionOnTextNode(node, start = 0, end = node.textContent.length) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  return range;
}

describe('editor/richtext-tools', () => {
  let originalAlert;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="link-popup" class="hidden">
        <button class="link-prefix-btn" data-prefix="https://"></button>
        <button class="link-prefix-btn" data-prefix="mailto:"></button>
        <button class="link-prefix-btn" data-prefix="tel:"></button>
        <button class="link-target-btn" data-link-target="internal"></button>
        <button class="link-target-btn" data-link-target="external"></button>
      </div>
      <input id="link-href" />
      <button id="link-apply"></button>
      <button id="link-cancel"></button>
    `;

    if (!document.execCommand) {
      document.execCommand = () => true;
    }

    originalAlert = global.alert;
    global.alert = vi.fn();
  });

  afterEach(() => {
    global.alert = originalAlert;
  });

  it('shows alert for link command without selection', () => {
    const deps = {
      toggleSelectionWrap: vi.fn(),
      onPreviewRequested: vi.fn(),
      linkPopup: document.getElementById('link-popup'),
      linkHrefInput: document.getElementById('link-href'),
      linkApplyBtn: document.getElementById('link-apply'),
      linkCancelBtn: document.getElementById('link-cancel'),
      modalInfo: vi.fn(),
    };

    const tools = createEditorRichtextTools(deps);
    const block = document.createElement('div');
    block.innerHTML = '<div class="block-content" contenteditable="true">abc</div>';

    const sel = window.getSelection();
    sel.removeAllRanges();

    tools.handleFormatClick('link', block);
    expect(global.alert).toHaveBeenCalled();
  });

  it('applies valid link and triggers preview', () => {
    const execSpy = vi.spyOn(document, 'execCommand');

    const deps = {
      toggleSelectionWrap: vi.fn(),
      onPreviewRequested: vi.fn(),
      linkPopup: document.getElementById('link-popup'),
      linkHrefInput: document.getElementById('link-href'),
      linkApplyBtn: document.getElementById('link-apply'),
      linkCancelBtn: document.getElementById('link-cancel'),
      modalInfo: vi.fn(),
    };

    const tools = createEditorRichtextTools(deps);

    const block = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.textContent = 'Link me';
    block.appendChild(content);
    document.body.appendChild(content);

    setSelectionOnTextNode(content.firstChild, 0, 4);
    tools.handleFormatClick('link', block);

    expect(deps.linkPopup.classList.contains('hidden')).toBe(false);

    deps.linkHrefInput.value = 'https://example.com';
    deps.linkApplyBtn.click();

    expect(execSpy).toHaveBeenCalledWith('createLink', false, 'https://example.com');
    expect(deps.onPreviewRequested).toHaveBeenCalled();
    expect(deps.linkPopup.classList.contains('hidden')).toBe(true);
  });

  it('rejects invalid link and shows hint', () => {
    const deps = {
      toggleSelectionWrap: vi.fn(),
      onPreviewRequested: vi.fn(),
      linkPopup: document.getElementById('link-popup'),
      linkHrefInput: document.getElementById('link-href'),
      linkApplyBtn: document.getElementById('link-apply'),
      linkCancelBtn: document.getElementById('link-cancel'),
      modalInfo: vi.fn(),
    };

    const tools = createEditorRichtextTools(deps);

    const block = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.textContent = 'Mail';
    block.appendChild(content);
    document.body.appendChild(content);

    setSelectionOnTextNode(content.firstChild);
    tools.handleFormatClick('link', block);

    deps.linkHrefInput.value = 'name@example.com';
    deps.linkApplyBtn.click();

    expect(deps.modalInfo).toHaveBeenCalled();
    expect(deps.linkPopup.classList.contains('hidden')).toBe(false);
  });

  it('toggles link prefix buttons and updates placeholder', () => {
    const deps = {
      toggleSelectionWrap: vi.fn(),
      onPreviewRequested: vi.fn(),
      linkPopup: document.getElementById('link-popup'),
      linkHrefInput: document.getElementById('link-href'),
      linkApplyBtn: document.getElementById('link-apply'),
      linkCancelBtn: document.getElementById('link-cancel'),
      modalInfo: vi.fn(),
    };

    createEditorRichtextTools(deps);

    const httpsBtn = deps.linkPopup.querySelector('[data-prefix="https://"]');
    httpsBtn.click();

    expect(deps.linkHrefInput.value).toBe('https://');
    expect(deps.linkHrefInput.placeholder).toBe('www.example.com');
    expect(httpsBtn.classList.contains('active')).toBe(true);

    httpsBtn.click();
    expect(deps.linkHrefInput.value).toBe('');
    expect(deps.linkHrefInput.placeholder).toBe('/path or #anchor');
    expect(httpsBtn.classList.contains('active')).toBe(false);
  });

  it('executes non-link formatting commands and code wrapping', () => {
    const execSpy = vi.spyOn(document, 'execCommand');
    const deps = {
      toggleSelectionWrap: vi.fn(),
      onPreviewRequested: vi.fn(),
      linkPopup: document.getElementById('link-popup'),
      linkHrefInput: document.getElementById('link-href'),
      linkApplyBtn: document.getElementById('link-apply'),
      linkCancelBtn: document.getElementById('link-cancel'),
      modalInfo: vi.fn(),
    };

    const tools = createEditorRichtextTools(deps);
    const block = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.textContent = 'Format';
    block.appendChild(content);
    document.body.appendChild(content);

    setSelectionOnTextNode(content.firstChild, 0, 3);
    tools.handleFormatClick('bold', block);
    tools.handleFormatClick('italic', block);
    tools.handleFormatClick('underline', block);
    tools.handleFormatClick('strikethrough', block);
    tools.handleFormatClick('code', block);

    expect(execSpy).toHaveBeenCalledWith('bold', false, null);
    expect(execSpy).toHaveBeenCalledWith('italic', false, null);
    expect(execSpy).toHaveBeenCalledWith('underline', false, null);
    expect(execSpy).toHaveBeenCalledWith('strikeThrough', false, null);
    expect(deps.toggleSelectionWrap).toHaveBeenCalledWith('code', expect.any(Object));
    expect(deps.onPreviewRequested).toHaveBeenCalled();
  });

  it('handles empty href by closing popup and supports cancel', () => {
    const deps = {
      toggleSelectionWrap: vi.fn(),
      onPreviewRequested: vi.fn(),
      linkPopup: document.getElementById('link-popup'),
      linkHrefInput: document.getElementById('link-href'),
      linkApplyBtn: document.getElementById('link-apply'),
      linkCancelBtn: document.getElementById('link-cancel'),
      modalInfo: vi.fn(),
    };

    const tools = createEditorRichtextTools(deps);
    const block = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.textContent = 'Link me';
    block.appendChild(content);
    document.body.appendChild(content);

    setSelectionOnTextNode(content.firstChild, 0, 4);
    tools.handleFormatClick('link', block);
    expect(deps.linkPopup.classList.contains('hidden')).toBe(false);

    deps.linkHrefInput.value = '   ';
    deps.linkApplyBtn.click();
    expect(deps.linkPopup.classList.contains('hidden')).toBe(true);

    tools.handleFormatClick('link', block);
    deps.linkCancelBtn.click();
    expect(deps.linkPopup.classList.contains('hidden')).toBe(true);
  });

  it('normalizes www links and keeps tel hint for phone-like input', () => {
    const execSpy = vi.spyOn(document, 'execCommand');
    const deps = {
      toggleSelectionWrap: vi.fn(),
      onPreviewRequested: vi.fn(),
      linkPopup: document.getElementById('link-popup'),
      linkHrefInput: document.getElementById('link-href'),
      linkApplyBtn: document.getElementById('link-apply'),
      linkCancelBtn: document.getElementById('link-cancel'),
      modalInfo: vi.fn(),
    };

    const tools = createEditorRichtextTools(deps);
    const block = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.innerHTML = '<a href="/internal">Link</a>';
    block.appendChild(content);
    document.body.appendChild(content);

    const linkTextNode = content.querySelector('a').firstChild;
    setSelectionOnTextNode(linkTextNode, 0, 4);
    tools.handleFormatClick('link', block);

    deps.linkPopup.querySelector('[data-link-target="external"]').click();
    deps.linkPopup.querySelector('[data-link-target="internal"]').click();

    deps.linkHrefInput.value = 'www.example.com';
    deps.linkApplyBtn.click();

    expect(execSpy).toHaveBeenCalledWith('createLink', false, 'https://www.example.com');
    expect(deps.linkHrefInput.value).toBe('https://www.example.com');
    expect(content.querySelector('a')?.getAttribute('target')).toBe('_blank');
    expect(content.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(deps.modalInfo).not.toHaveBeenCalled();

    tools.handleFormatClick('link', block);

    deps.linkHrefInput.value = '+49 123 456789';
    deps.linkApplyBtn.click();
    expect(deps.modalInfo).toHaveBeenCalledWith(expect.stringContaining('tel:'));
  });

  it('applies target blank attributes when external mode is selected', () => {
    const deps = {
      toggleSelectionWrap: vi.fn(),
      onPreviewRequested: vi.fn(),
      linkPopup: document.getElementById('link-popup'),
      linkHrefInput: document.getElementById('link-href'),
      linkApplyBtn: document.getElementById('link-apply'),
      linkCancelBtn: document.getElementById('link-cancel'),
      modalInfo: vi.fn(),
    };

    const tools = createEditorRichtextTools(deps);
    const block = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.innerHTML = '<a href="/philosophy.html">Philosophy</a>';
    block.appendChild(content);
    document.body.appendChild(content);

    const linkTextNode = content.querySelector('a').firstChild;
    setSelectionOnTextNode(linkTextNode, 0, 5);
    tools.handleFormatClick('link', block);

    deps.linkPopup.querySelector('[data-link-target="external"]').click();
    deps.linkHrefInput.value = '/philosophy.html';
    deps.linkApplyBtn.click();

    const link = content.querySelector('a');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('removes target attributes when internal mode is selected', () => {
    const deps = {
      toggleSelectionWrap: vi.fn(),
      onPreviewRequested: vi.fn(),
      linkPopup: document.getElementById('link-popup'),
      linkHrefInput: document.getElementById('link-href'),
      linkApplyBtn: document.getElementById('link-apply'),
      linkCancelBtn: document.getElementById('link-cancel'),
      modalInfo: vi.fn(),
    };

    const tools = createEditorRichtextTools(deps);
    const block = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.innerHTML = '<a href="/example" target="_blank" rel="noopener noreferrer">Example</a>';
    block.appendChild(content);
    document.body.appendChild(content);

    const linkTextNode = content.querySelector('a').firstChild;
    setSelectionOnTextNode(linkTextNode, 0, 4);
    tools.handleFormatClick('link', block);

    deps.linkPopup.querySelector('[data-link-target="internal"]').click();
    deps.linkHrefInput.value = 'https://example.com';
    deps.linkApplyBtn.click();

    const link = content.querySelector('a');
    expect(link.hasAttribute('target')).toBe(false);
    expect(link.hasAttribute('rel')).toBe(false);
  });
});
