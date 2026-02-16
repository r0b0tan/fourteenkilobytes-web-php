/**
 * Editor block factory utilities
 */

export function createEditorBlockFactory(deps) {
  function setupListKeyHandlers(listEl) {
    listEl.addEventListener('keydown', (e) => {
      const li = e.target.closest('li');
      if (!li) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const newLi = document.createElement('li');
        newLi.contentEditable = 'true';
        newLi.dataset.placeholder = 'List item...';
        li.after(newLi);
        newLi.focus();
        deps.onPreviewRequested();
      } else if (e.key === 'Backspace' && li.innerHTML === '' && listEl.children.length > 1) {
        e.preventDefault();
        const prevLi = li.previousElementSibling;
        li.remove();
        if (prevLi) {
          prevLi.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(prevLi);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        deps.onPreviewRequested();
      }
    });
  }

  function createInnerAddBlockWrapper(sectionBlock) {
    return deps.createInnerAddBlock({
      onBlockAdd: (config) => {
        const childBlock = createBlockElement(config.type, config.level, '', config.listType, config.spacerHeight, true);
        const sectionBlocks = sectionBlock.querySelector('.section-blocks');
        sectionBlocks.appendChild(childBlock);
        const focusTarget = childBlock.querySelector('li[contenteditable="true"]') || childBlock.querySelector('.block-content');
        if (focusTarget) focusTarget.focus();
        deps.onPreviewRequested();
      }
    });
  }

  function createBlockElement(type, level, initialHtml = '', listType = null, spacerHeight = null, isNested = false) {
    const block = document.createElement('div');
    block.className = 'block-item';
    block.dataset.type = type;
    block.dataset.selector = '';
    if (level) block.dataset.level = level;
    if (listType) block.dataset.listType = listType;
    if (type === 'spacer') block.dataset.height = spacerHeight || '1rem';

    if (type === 'section') {
      const sectionBlock = deps.createSectionBlock({
        isNested,
        callbacks: {
          onSelectorChange: () => {
            deps.onCostRailChanged();
            deps.onPreviewRequested();
          },
          onMoveUp: () => deps.moveBlock(sectionBlock, -1),
          onMoveDown: () => deps.moveBlock(sectionBlock, 1),
          onDuplicate: () => {
            const data = deps.serializeBlock(sectionBlock);
            const blockElFromSource = deps.getBlockElFromSource();
            const clone = blockElFromSource ? blockElFromSource(data) : null;
            if (clone) {
              deps.insertBlockDirectlyBelow(sectionBlock, clone);
              deps.onPreviewRequested();
            }
          },
          onDelete: () => {
            sectionBlock.remove();
            deps.onPreviewRequested();
          },
          onChange: () => {
            deps.onCostRailChanged();
            deps.onPreviewRequested();
          },
          createInnerAddBlock: createInnerAddBlockWrapper
        },
        Compiler: deps.Compiler
      });
      return sectionBlock;
    }

    if (type === 'layout') {
      const layoutBlock = deps.createLayoutBlock({
        isNested,
        callbacks: {
          onSelectorChange: () => {
            deps.onCostRailChanged();
            deps.onPreviewRequested();
          },
          onMoveUp: () => deps.moveBlock(layoutBlock, -1),
          onMoveDown: () => deps.moveBlock(layoutBlock, 1),
          onDuplicate: () => {
            const data = deps.serializeBlock(layoutBlock);
            const blockElFromSource = deps.getBlockElFromSource();
            const clone = blockElFromSource ? blockElFromSource(data) : null;
            if (clone) {
              deps.insertBlockDirectlyBelow(layoutBlock, clone);
              deps.onPreviewRequested();
            }
          },
          onDelete: () => {
            layoutBlock.remove();
            deps.onPreviewRequested();
          },
          onChange: () => {
            deps.onCostRailChanged();
            deps.onPreviewRequested();
          },
          createBlockElement: (nestedType, nestedLevel, html, nestedListType, nestedSpacerHeight, nested) => {
            return createBlockElement(nestedType, nestedLevel, html, nestedListType, nestedSpacerHeight, nested);
          }
        }
      });
      return layoutBlock;
    }

    const header = document.createElement('div');
    header.className = 'block-header';

    if (type === 'paragraph' || type === 'blockquote' || type === 'codeblock') {
      const typeSelect = deps.createTextBlockTypeSelector(type, (newType) => {
        const oldType = block.dataset.type;
        block.dataset.type = newType;

        const content = block.querySelector('.block-content');
        if (oldType === 'codeblock' && newType !== 'codeblock') {
          content.contentEditable = 'true';
          content.classList.remove('block-codeblock');
          content.dataset.placeholder = newType === 'blockquote' ? 'Quote...' : 'Enter text...';
          const formatBtns = block.querySelector('.block-format-buttons');
          if (formatBtns) formatBtns.style.display = '';
        } else if (oldType !== 'codeblock' && newType === 'codeblock') {
          content.textContent = content.textContent;
          content.contentEditable = 'true';
          content.classList.add('block-codeblock');
          content.dataset.placeholder = 'Code...';
          const formatBtns = block.querySelector('.block-format-buttons');
          if (formatBtns) formatBtns.style.display = 'none';
        } else {
          content.dataset.placeholder = newType === 'blockquote' ? 'Quote...' : newType === 'codeblock' ? 'Code...' : 'Enter text...';
        }

        deps.updateBlockStyling(block);
        deps.onCostRailChanged();
        deps.onPreviewRequested();
      });
      header.appendChild(typeSelect);
    } else if (type === 'heading') {
      const typeSelect = deps.createHeadingLevelSelector(level, (newLevel) => {
        block.dataset.level = newLevel;
        deps.updateBlockStyling(block);
        deps.onCostRailChanged();
        deps.onPreviewRequested();
      });
      header.appendChild(typeSelect);
    } else if (type === 'list' || type === 'unordered-list' || type === 'ordered-list') {
      const effectiveListType = listType || (type === 'ordered-list' ? 'ordered' : 'unordered');
      block.dataset.type = 'list';
      block.dataset.listType = effectiveListType;

      const typeSelect = deps.createListTypeSelector(effectiveListType, (newListType) => {
        block.dataset.listType = newListType;
        const oldList = block.querySelector('.editable-list');
        if (oldList) {
          const newTag = newListType === 'ordered' ? 'ol' : 'ul';
          const newList = document.createElement(newTag);
          newList.className = 'editable-list';
          while (oldList.firstChild) {
            newList.appendChild(oldList.firstChild);
          }
          oldList.replaceWith(newList);
          setupListKeyHandlers(newList);
        }
        deps.onCostRailChanged();
        deps.onPreviewRequested();
      });
      header.appendChild(typeSelect);
    } else {
      header.appendChild(deps.createBlockTypeLabel(type));
    }

    if (type !== 'bloglist' && type !== 'divider' && type !== 'codeblock' && type !== 'spacer' && type !== 'author') {
      header.appendChild(deps.createFormatButtons(deps.onFormatClick, block));
    }

    const actions = document.createElement('div');
    actions.className = 'block-item-actions';
    if (!isNested) {
      actions.appendChild(deps.createBlockSelectorControl({
        initialValue: block.dataset.selector || '',
        onChange: (value) => {
          block.dataset.selector = value;
          deps.onCostRailChanged();
          deps.onPreviewRequested();
        }
      }));
    }

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.textContent = '↑';
    upBtn.title = 'Move up';
    upBtn.addEventListener('click', () => deps.moveBlock(block, -1));
    actions.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.textContent = '↓';
    downBtn.title = 'Move down';
    downBtn.addEventListener('click', () => deps.moveBlock(block, 1));
    actions.appendChild(downBtn);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.innerHTML = '⧉';
    copyBtn.title = 'Duplicate';
    copyBtn.addEventListener('click', () => {
      const data = deps.serializeBlock(block);
      const blockElFromSource = deps.getBlockElFromSource();
      const clone = blockElFromSource ? blockElFromSource(data) : null;
      if (clone) {
        deps.insertBlockDirectlyBelow(block, clone);
        deps.onPreviewRequested();
      }
    });
    actions.appendChild(copyBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', () => block.remove());
    actions.appendChild(deleteBtn);

    header.appendChild(actions);

    if (!isNested) {
      block.appendChild(deps.createByteIndicator('0 B'));
    }
    block.appendChild(header);

    let content;
    if (type === 'bloglist') {
      content = deps.createBloglistContent();
    } else if (type === 'author') {
      content = deps.createAuthorContent({
        block,
        onChange: () => {
          deps.onCostRailChanged();
          deps.onPreviewRequested();
        }
      });
    } else if (type === 'list' || type === 'unordered-list' || type === 'ordered-list') {
      const effectiveListType = block.dataset.listType || (type === 'ordered-list' ? 'ordered' : 'unordered');
      content = deps.createListContent({
        listType: effectiveListType,
        initialHtml,
        setupListKeyHandlers
      });
    } else if (type === 'divider') {
      content = deps.createDividerContent();
    } else if (type === 'spacer') {
      content = deps.createSpacerContent({
        height: block.dataset.height || spacerHeight || '1rem',
        block,
        onChange: () => {
          deps.onCostRailChanged();
          deps.onPreviewRequested();
        }
      });
    } else if (type === 'codeblock') {
      content = deps.createCodeblockContent(initialHtml);
    } else if (type === 'blockquote') {
      content = deps.createBlockquoteContent(initialHtml);
    } else if (type === 'heading') {
      content = deps.createHeadingContent(initialHtml);
    } else {
      content = deps.createParagraphContent(initialHtml);
    }

    block.appendChild(content);

    deps.updateBlockStyling(block);
    return block;
  }

  return {
    setupListKeyHandlers,
    createInnerAddBlockWrapper,
    createBlockElement
  };
}