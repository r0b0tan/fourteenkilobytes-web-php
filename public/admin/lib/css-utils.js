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
 * Minify CSS while preserving calc() expressions
 * @param {string} css - CSS code to minify
 * @returns {string} Minified CSS
 */
export function minifyCss(css) {
  // Temporarily replace calc() functions to protect them
  const calcs = [];
  let result = css.replace(/calc\([^)]+\)/g, (match) => {
    calcs.push(match);
    return `__CALC${calcs.length - 1}__`;
  });

  // Normal minification (without calc)
  result = result
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[\r\n\t]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
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

  return result;
}

/**
 * Minify HTML document (CSS in <style> tags and inline styles)
 * @param {string} html - HTML document
 * @returns {string} Minified HTML
 */
export function minifyHtmlDocument(html) {
  return html
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => match.replace(css, minifyCss(css)))
    .replace(/\sstyle="([^"]*)"/gi, (_, css) => {
      const minified = minifyCss(css);
      return minified ? ` style="${minified}"` : '';
    })
    .replace(/\s(class|id|rel|target|lang)="([A-Za-z0-9_-]+)"/g, ' $1=$2')
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .trim();
}
