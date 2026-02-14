/**
 * Byte Counting Utility Functions
 *
 * Pure functions for measuring and finalizing compiled HTML.
 */

import { minifyHtmlDocument } from './css-utils.js';

/**
 * Get UTF-8 byte length of a string
 * @param {string} text - Text to measure
 * @returns {number} Byte length
 */
export function getByteLength(text) {
  return new TextEncoder().encode(text).length;
}

/**
 * Finalize compiled page HTML with accurate byte counting
 * Iteratively replaces {{bytes}} placeholder and re-minifies until byte count converges
 *
 * @param {string} rawHtml - HTML with {{bytes}} placeholder
 * @param {number} initialBytes - Initial byte estimate (default: 0)
 * @param {boolean} applyMinification - Whether to minify HTML (default: true)
 * @returns {{html: string, bytes: number}} Finalized HTML and final byte count
 */
export function finalizeCompiledPageHtml(rawHtml, initialBytes = 0, applyMinification = true) {
  let bytes = initialBytes;
  let html = '';

  // Iterate up to 5 times to converge on final byte count
  for (let i = 0; i < 5; i++) {
    const withBytes = rawHtml.replace(/\{\{bytes\}\}/g, String(bytes));
    html = applyMinification ? minifyHtmlDocument(withBytes) : withBytes;
    const nextBytes = getByteLength(html);
    if (nextBytes === bytes) {
      return { html, bytes: nextBytes };
    }
    bytes = nextBytes;
  }

  // Final iteration if convergence not reached
  const withBytes = rawHtml.replace(/\{\{bytes\}\}/g, String(bytes));
  html = applyMinification ? minifyHtmlDocument(withBytes) : withBytes;
  return { html, bytes: getByteLength(html) };
}
