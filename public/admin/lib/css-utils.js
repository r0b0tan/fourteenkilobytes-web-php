/**
 * CSS Utility Functions
 *
 * Pure functions for CSS processing and minification.
 */

/**
 * Strip CSS comments to save bytes in compiled output
 * @param {string} css - CSS code with comments
 * @returns {string} CSS without comments
 */
export function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Minify CSS while preserving strings, calc() expressions and descendant combinators.
 * Must stay in sync with minifyCss() in api/core/http.php.
 * @param {string} css - CSS code to minify
 * @returns {string} Minified CSS
 */
export function minifyCss(css) {
  // Protect quoted strings (content, attribute selectors, font names) from all rules below
  const strings = [];
  let result = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'/g, (match) => {
      strings.push(match);
      return `__STR${strings.length - 1}__`;
    });

  // Temporarily replace calc() functions to protect them
  const calcs = [];
  result = result.replace(/calc\([^)]+\)/g, (match) => {
    calcs.push(match);
    return `__CALC${calcs.length - 1}__`;
  });

  // Normal minification (without strings and calc)
  result = result
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([{};,>+~])\s*/g, '$1')
    .replace(/:\s+/g, ':');

  // Whitespace before ":" is a descendant combinator in selectors (".a :hover"),
  // so it is only removed inside declaration blocks or a plain declaration list (style="").
  result = result.includes('{')
    ? result.replace(/\{[^{}]*\}/g, (block) => block.replace(/\s+:/g, ':'))
    : result.replace(/\s+:/g, ':');

  result = result
    .replace(/(^|[:\s,(])0(?:px|rem|em|%|vh|vw|vmin|vmax)(?=([;,)\s}]|$))/gi, (_, prefix) => `${prefix}0`)
    .replace(/#([\da-f])\1([\da-f])\2([\da-f])\3\b/gi, '#$1$2$3')
    .replace(/rgba\(255,255,255,0\)/gi, 'transparent')
    .replace(/;}/g, '}')
    .trim();

  // Restore calc() functions with preserved spacing for + and - operators (but not --)
  result = result.replace(/__CALC(\d+)__/g, (_, index) => {
    let calc = calcs[parseInt(index)];
    // Minify inside calc but preserve + and - operators with spaces
    calc = calc
      .replace(/\s+/g, ' ')
      .replace(/\s*([(),])\s*/g, '$1')
      // Only add spaces around + and - when they're operators (not part of --)
      .replace(/([^-])\s*([+])\s*/g, '$1 $2 ')  // + is always an operator
      .replace(/([^-])\s*([-])\s*([^-])/g, '$1 $2 $3')  // - between non-dash chars
      .replace(/\s+/g, ' ')
      .trim();
    return calc;
  });

  return result.replace(/__STR(\d+)__/g, (_, index) => strings[parseInt(index)]);
}

/**
 * Elements whose surrounding whitespace never renders. Whitespace between two inline
 * elements (e.g. "<b>a</b> <i>b</i>") is significant and is collapsed to one space instead.
 */
const HTML_BLOCK_TAGS = new Set([
  '!doctype', 'html', 'head', 'body', 'title', 'meta', 'link', 'style', 'script', 'base',
  'noscript', 'template', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'dl', 'dt', 'dd', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
  'figure', 'figcaption', 'blockquote', 'pre', 'hr', 'br', 'table', 'caption', 'colgroup',
  'col', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'form', 'fieldset', 'legend',
  'details', 'summary', 'address', 'hgroup', 'option',
]);

/**
 * Remove whitespace between tags where it cannot render, keep a single space between inline elements.
 * @param {string} html - HTML document
 * @returns {string} HTML with collapsed inter-tag whitespace
 */
export function collapseWhitespaceBetweenTags(html) {
  // Whitespace inside <pre>, <textarea> and <script> is content and stays untouched.
  const preserved = [];
  return html
    .replace(/(<(pre|textarea|script)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (_, open, tag, content, close) => {
      preserved.push(content);
      return `${open}\u0000${preserved.length - 1}\u0000${close}`;
    })
    .replace(/(<\/?(!?[A-Za-z][A-Za-z0-9-]*)[^>]*>)[ \t\n\r\f]+(?=<\/?(!?[A-Za-z][A-Za-z0-9-]*))/g, (_, tag, prevName, nextName) => {
      const isBlock = HTML_BLOCK_TAGS.has(prevName.toLowerCase()) || HTML_BLOCK_TAGS.has(nextName.toLowerCase());
      return isBlock ? tag : `${tag} `;
    })
    .replace(/\u0000(\d+)\u0000/g, (_, index) => preserved[parseInt(index)] ?? '');
}

/**
 * Minify HTML document (CSS in <style> tags and inline styles).
 * Must stay in sync with minifyHtmlDocument() in api/core/http.php.
 * @param {string} html - HTML document
 * @returns {string} Minified HTML
 */
export function minifyHtmlDocument(html) {
  const result = html
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => match.replace(css, minifyCss(css)))
    .replace(/\sstyle="([^"]*)"/gi, (_, css) => {
      const minified = minifyCss(css);
      return minified ? ` style="${minified}"` : '';
    })
    .replace(/\s(class|id|rel|target|lang)="([A-Za-z0-9_-]+)"/g, ' $1=$2')
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

  return collapseWhitespaceBetweenTags(result).trim();
}
