/**
 * Content Utility Functions
 *
 * Pure functions for analyzing content structure.
 */

/**
 * Check if content blocks contain any section blocks (recursively)
 * @param {Array} content - Array of content blocks
 * @returns {boolean} True if any section block is found
 */
export function contentHasSections(content) {
  if (!Array.isArray(content) || content.length === 0) return false;

  const hasSectionInBlock = (block) => {
    if (!block || typeof block !== 'object') return false;
    if (block.type === 'section') return true;

    // Check children array
    if (Array.isArray(block.children) && block.children.some(hasSectionInBlock)) {
      return true;
    }

    // Check cells array (for layout blocks)
    if (Array.isArray(block.cells)) {
      for (const cell of block.cells) {
        if (Array.isArray(cell?.children) && cell.children.some(hasSectionInBlock)) {
          return true;
        }
      }
    }

    return false;
  };

  return content.some(hasSectionInBlock);
}
