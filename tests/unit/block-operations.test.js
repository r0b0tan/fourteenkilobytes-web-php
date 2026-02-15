import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  updateBlockStyling,
  insertBlockBelow,
  moveBlock,
  toggleSelectionWrap
} from '../../public/admin/lib/block-operations.js';

describe('updateBlockStyling', () => {
  test('applies heading styles', () => {
    const block = document.createElement('div');
    block.dataset.type = 'heading';
    block.dataset.level = '2';

    const content = document.createElement('div');
    content.className = 'block-content';
    block.appendChild(content);

    updateBlockStyling(block);

    expect(content.style.fontWeight).toBe('bold');
    expect(content.style.fontSize).toBe('1.5rem');
    expect(content.dataset.placeholder).toBe('Heading...');
  });

  test('applies blockquote styles', () => {
    const block = document.createElement('div');
    block.dataset.type = 'blockquote';

    const content = document.createElement('div');
    content.className = 'block-content';
    block.appendChild(content);

    updateBlockStyling(block);

    expect(content.style.fontStyle).toBe('italic');
    expect(content.style.borderLeft).toContain('var(--border)');
    expect(content.style.paddingLeft).toBe('12px');
    expect(content.dataset.placeholder).toBe('Quote...');
  });

  test('applies codeblock placeholder', () => {
    const block = document.createElement('div');
    block.dataset.type = 'codeblock';

    const content = document.createElement('div');
    content.className = 'block-content';
    block.appendChild(content);

    updateBlockStyling(block);

    expect(content.dataset.placeholder).toBe('Code...');
  });

  test('applies default placeholder for paragraph', () => {
    const block = document.createElement('div');
    block.dataset.type = 'paragraph';

    const content = document.createElement('div');
    content.className = 'block-content';
    block.appendChild(content);

    updateBlockStyling(block);

    expect(content.dataset.placeholder).toBe('Enter text...');
  });

  test('does not modify special block types', () => {
    const block = document.createElement('div');
    block.dataset.type = 'bloglist';

    const content = document.createElement('div');
    content.className = 'block-content';
    block.appendChild(content);

    updateBlockStyling(block);

    expect(content.dataset.placeholder).toBeUndefined();
  });

  test('resets styles before applying new ones', () => {
    const block = document.createElement('div');
    block.dataset.type = 'paragraph';

    const content = document.createElement('div');
    content.className = 'block-content';
    content.style.fontSize = '2rem';
    content.style.fontWeight = 'bold';
    block.appendChild(content);

    updateBlockStyling(block);

    expect(content.style.fontSize).toBe('');
    expect(content.style.fontWeight).toBe('');
  });
});

describe('insertBlockBelow', () => {
  test('inserts block directly below reference', () => {
    const parent = document.createElement('div');
    const block1 = document.createElement('div');
    block1.className = 'block-item';
    const block2 = document.createElement('div');
    block2.className = 'block-item';

    parent.appendChild(block1);
    parent.appendChild(block2);

    const newBlock = document.createElement('div');
    newBlock.className = 'block-item';
    newBlock.textContent = 'new';

    insertBlockBelow(block1, newBlock);

    const blocks = parent.querySelectorAll('.block-item');
    expect(blocks.length).toBe(3);
    expect(blocks[0]).toBe(block1);
    expect(blocks[1]).toBe(newBlock);
    expect(blocks[2]).toBe(block2);
  });

  test('appends block if reference is last', () => {
    const parent = document.createElement('div');
    const block1 = document.createElement('div');
    block1.className = 'block-item';

    parent.appendChild(block1);

    const newBlock = document.createElement('div');
    newBlock.className = 'block-item';

    insertBlockBelow(block1, newBlock);

    expect(parent.children.length).toBe(2);
    expect(parent.children[1]).toBe(newBlock);
  });

  test('appends if reference not found', () => {
    const parent = document.createElement('div');
    const block1 = document.createElement('div');
    block1.className = 'block-item';
    parent.appendChild(block1);

    const orphan = document.createElement('div');
    orphan.className = 'block-item';

    const newBlock = document.createElement('div');
    newBlock.className = 'block-item';

    insertBlockBelow(orphan, newBlock);
    // Should not throw, but also won't insert since orphan has no parent
  });

  test('handles null newBlock gracefully', () => {
    const parent = document.createElement('div');
    const block1 = document.createElement('div');
    block1.className = 'block-item';
    parent.appendChild(block1);

    insertBlockBelow(block1, null);

    expect(parent.children.length).toBe(1);
  });
});

describe('moveBlock', () => {
  test('moves block up', () => {
    const parent = document.createElement('div');
    const block1 = document.createElement('div');
    block1.className = 'block-item';
    block1.textContent = '1';
    const block2 = document.createElement('div');
    block2.className = 'block-item';
    block2.textContent = '2';

    parent.appendChild(block1);
    parent.appendChild(block2);

    const onChange = vi.fn();
    moveBlock(block2, -1, { onChange });

    const blocks = parent.querySelectorAll('.block-item');
    expect(blocks[0].textContent).toBe('2');
    expect(blocks[1].textContent).toBe('1');
    expect(onChange).toHaveBeenCalled();
  });

  test('moves block down', () => {
    const parent = document.createElement('div');
    const block1 = document.createElement('div');
    block1.className = 'block-item';
    block1.textContent = '1';
    const block2 = document.createElement('div');
    block2.className = 'block-item';
    block2.textContent = '2';

    parent.appendChild(block1);
    parent.appendChild(block2);

    moveBlock(block1, 1, { onChange: vi.fn() });

    const blocks = parent.querySelectorAll('.block-item');
    expect(blocks[0].textContent).toBe('2');
    expect(blocks[1].textContent).toBe('1');
  });

  test('does not move beyond start', () => {
    const parent = document.createElement('div');
    const block1 = document.createElement('div');
    block1.className = 'block-item';
    const block2 = document.createElement('div');
    block2.className = 'block-item';

    parent.appendChild(block1);
    parent.appendChild(block2);

    moveBlock(block1, -1, { onChange: vi.fn() });

    expect(parent.children[0]).toBe(block1);
  });

  test('does not move beyond end', () => {
    const parent = document.createElement('div');
    const block1 = document.createElement('div');
    block1.className = 'block-item';
    const block2 = document.createElement('div');
    block2.className = 'block-item';

    parent.appendChild(block1);
    parent.appendChild(block2);

    moveBlock(block2, 1, { onChange: vi.fn() });

    expect(parent.children[1]).toBe(block2);
  });

  test('works without callbacks', () => {
    const parent = document.createElement('div');
    const block1 = document.createElement('div');
    block1.className = 'block-item';
    const block2 = document.createElement('div');
    block2.className = 'block-item';

    parent.appendChild(block1);
    parent.appendChild(block2);

    moveBlock(block2, -1);

    expect(parent.children[0]).toBe(block2);
  });
});

describe('toggleSelectionWrap', () => {
  test('wraps selection with tag', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.textContent = 'Hello world';
    document.body.appendChild(div);

    // Select "world"
    const range = document.createRange();
    const textNode = div.firstChild;
    range.setStart(textNode, 6);
    range.setEnd(textNode, 11);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const onChange = vi.fn();
    toggleSelectionWrap('code', { onChange });

    expect(div.querySelector('code')).toBeTruthy();
    expect(div.querySelector('code').textContent).toBe('world');
    expect(onChange).toHaveBeenCalled();

    document.body.removeChild(div);
  });

  test('unwraps if already wrapped', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    const codeEl = document.createElement('code');
    codeEl.textContent = 'world';
    div.appendChild(document.createTextNode('Hello '));
    div.appendChild(codeEl);
    document.body.appendChild(div);

    // Select text inside code element
    const range = document.createRange();
    const textNode = codeEl.firstChild;
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    toggleSelectionWrap('code', { onChange: vi.fn() });

    expect(div.querySelector('code')).toBeNull();
    expect(div.textContent).toBe('Hello world');

    document.body.removeChild(div);
  });

  test('does nothing if no selection', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.textContent = 'Hello';
    document.body.appendChild(div);

    const sel = window.getSelection();
    sel.removeAllRanges();

    const onChange = vi.fn();
    toggleSelectionWrap('code', { onChange });

    expect(div.querySelector('code')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  test('works without callbacks', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.textContent = 'Hello world';
    document.body.appendChild(div);

    const range = document.createRange();
    const textNode = div.firstChild;
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    toggleSelectionWrap('strong');

    expect(div.querySelector('strong')).toBeTruthy();

    document.body.removeChild(div);
  });
});
