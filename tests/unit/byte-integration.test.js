import { describe, test, expect } from 'vitest';
import { renderBlockHtml, estimateContentSize } from '../../public/admin/lib/byte-estimation.js';
import { finalizeCompiledPageHtml, getByteLength } from '../../public/admin/lib/byte-utils.js';

describe('Byte Pipeline Integration', () => {
  test('complex state -> rendered html -> finalized bytes stays deterministic', () => {
    const blocks = [
      {
        type: 'section',
        background: '#111111',
        color: '#ffffff',
        pattern: 'grid',
        patternColor: '#ffffff',
        patternOpacity: '0.2',
        width: '100%',
        padding: '2rem',
        align: 'center',
        children: [
          {
            type: 'heading',
            level: 2,
            children: [{ type: 'text', text: 'Integration Heading' }],
          },
          {
            type: 'layout',
            columns: 2,
            rows: 1,
            rowGap: '12px',
            columnGap: '8px',
            cells: [
              {
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'text', text: 'Cell A content' }],
                  },
                ],
              },
              {
                children: [
                  {
                    type: 'unordered-list',
                    items: [
                      { children: [{ type: 'text', text: 'One' }] },
                      { children: [{ type: 'text', text: 'Two' }] },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'bloglist',
          },
        ],
      },
      {
        type: 'codeblock',
        content: 'const x = 42;\nconsole.log(x);',
      },
    ];

    const rendered = blocks.map((b) => renderBlockHtml(b)).join('\n');
    const estimatedContentBytes = estimateContentSize(blocks);

    const rawDocument = `<html><body>${rendered}<footer>Bytes: {{bytes}}</footer></body></html>`;
    const finalized1 = finalizeCompiledPageHtml(rawDocument, estimatedContentBytes, true);
    const finalized2 = finalizeCompiledPageHtml(rawDocument, estimatedContentBytes, true);

    expect(finalized1.bytes).toBeGreaterThan(0);
    expect(finalized1.bytes).toBe(getByteLength(finalized1.html));
    expect(finalized1.bytes).toBeGreaterThanOrEqual(estimatedContentBytes);

    expect(finalized1.html).toBe(finalized2.html);
    expect(finalized1.bytes).toBe(finalized2.bytes);

    const cellCount = (finalized1.html.match(/\bclass=(?:"|')?cell\b/g) || []).length;
    expect(cellCount).toBe(2);
  });
});
