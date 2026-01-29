// src/types.ts
var SIZE_LIMIT = 14336;
var MAX_PAGINATION_ITERATIONS = 10;

// src/measure.browser.ts
var encoder = new TextEncoder();
function measureBytes(str) {
  return encoder.encode(str).length;
}
async function computeHash(str) {
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function normalizeLineEndings(str) {
  return str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function createPageMeasurement(slug, breakdown) {
  const overhead = breakdown.base + breakdown.title + breakdown.meta + breakdown.css + breakdown.navigation + breakdown.footer + breakdown.pagination + breakdown.icons;
  const content = breakdown.content;
  const total = overhead + content;
  return {
    slug,
    breakdown,
    measurements: {
      total,
      overhead,
      content
    },
    total,
    remaining: SIZE_LIMIT - total,
    utilizationRatio: total / SIZE_LIMIT
  };
}
function totalFromBreakdown(breakdown) {
  return breakdown.base + breakdown.title + breakdown.meta + breakdown.css + breakdown.navigation + breakdown.footer + breakdown.pagination + breakdown.icons + breakdown.content;
}

// src/icons.ts
var ICON_SVG = {
  "arrow-left": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  "arrow-right": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  "arrow-up": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  "arrow-down": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
  "external-link": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>',
  "home": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  "menu": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
  "close": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  "check": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
  "info": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  "warning": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
  "error": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
  "mail": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>',
  "rss": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16"/><circle cx="5" cy="19" r="1"/></svg>',
  "calendar": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  "tag": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1"/></svg>'
};
function buildWhitelist() {
  const whitelist = /* @__PURE__ */ new Map();
  for (const [id, svg] of Object.entries(ICON_SVG)) {
    whitelist.set(id, {
      id,
      svg,
      bytes: measureBytes(svg)
    });
  }
  return whitelist;
}
var ICON_WHITELIST = buildWhitelist();
function getAvailableIconIds() {
  return Array.from(ICON_WHITELIST.keys()).sort();
}
function isValidIconId(id) {
  return ICON_WHITELIST.has(id);
}
function getIcon(id) {
  return ICON_WHITELIST.get(id);
}
function getIconSvg(id) {
  const icon = ICON_WHITELIST.get(id);
  if (!icon) {
    throw new Error(`Icon not in whitelist: ${id}`);
  }
  return icon.svg;
}
function getIconBytes(id) {
  const icon = ICON_WHITELIST.get(id);
  if (!icon) {
    throw new Error(`Icon not in whitelist: ${id}`);
  }
  return icon.bytes;
}

// src/validate.ts
var SLUG_PATTERN = /^[a-z0-9-]+$/;
var HREF_PATTERN = /^(\/[a-z0-9._/-]*|#[a-z0-9-]*|[a-z0-9-]+\.html)$/i;
var MAX_TITLE_LENGTH = 200;
var MAX_META_DESCRIPTION_LENGTH = 160;
var MAX_META_AUTHOR_LENGTH = 100;
function validateInput(input) {
  const slugResult = validateSlug(input.slug);
  if (!slugResult.valid)
    return slugResult;
  const titleResult = validateTitle(input.title);
  if (!titleResult.valid)
    return titleResult;
  const contentResult = validateContent(input.content);
  if (!contentResult.valid)
    return contentResult;
  if (input.navigation !== null) {
    const navResult = validateNavigation(input.navigation);
    if (!navResult.valid)
      return navResult;
  }
  if (input.footer !== null) {
    const footerResult = validateFooter(input.footer);
    if (!footerResult.valid)
      return footerResult;
  }
  if (input.css !== null) {
    const cssResult = validateCss(input.css);
    if (!cssResult.valid)
      return cssResult;
  }
  if (input.meta !== null) {
    const metaResult = validateMeta(input.meta);
    if (!metaResult.valid)
      return metaResult;
  }
  const iconsResult = validateIcons(input.icons);
  if (!iconsResult.valid)
    return iconsResult;
  return { valid: true };
}
function validateSlug(slug) {
  if (!SLUG_PATTERN.test(slug)) {
    return {
      valid: false,
      error: {
        code: "INVALID_SLUG",
        slug,
        pattern: SLUG_PATTERN.source
      }
    };
  }
  return { valid: true };
}
function validateTitle(title) {
  if (!title || title.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: "EMPTY_TITLE",
        message: "Title cannot be empty"
      }
    };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: {
        code: "TITLE_TOO_LONG",
        length: title.length,
        maxLength: MAX_TITLE_LENGTH
      }
    };
  }
  return { valid: true };
}
function validateContent(blocks) {
  if (blocks.length === 0) {
    return {
      valid: false,
      error: {
        code: "CONTENT_EMPTY",
        message: "At least one content block is required"
      }
    };
  }
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const result = validateContentBlock(block, `content[${i}]`);
    if (!result.valid)
      return result;
  }
  return { valid: true };
}
function validateContentBlock(block, path) {
  const blockType = block.type;
  if (blockType !== "heading" && blockType !== "paragraph" && blockType !== "bloglist") {
    return {
      valid: false,
      error: {
        code: "CONTENT_INVALID_ELEMENT",
        element: blockType,
        allowed: ["heading", "paragraph", "bloglist"],
        path
      }
    };
  }
  if (blockType === "heading") {
    if (block.level === void 0 || block.level < 1 || block.level > 6) {
      return {
        valid: false,
        error: {
          code: "CONTENT_INVALID_ELEMENT",
          element: `heading with level ${block.level}`,
          allowed: ["heading with level 1-6"],
          path
        }
      };
    }
  }
  if (blockType !== "bloglist") {
    for (let i = 0; i < block.children.length; i++) {
      const node = block.children[i];
      const result = validateInlineNode(node, `${path}.children[${i}]`);
      if (!result.valid)
        return result;
    }
  }
  return { valid: true };
}
function validateInlineNode(node, path) {
  const allowedTypes = ["text", "linebreak", "bold", "italic", "link"];
  if (!allowedTypes.includes(node.type)) {
    return {
      valid: false,
      error: {
        code: "CONTENT_INVALID_ELEMENT",
        element: node.type,
        allowed: allowedTypes,
        path
      }
    };
  }
  if (node.type === "text" || node.type === "linebreak") {
    return { valid: true };
  }
  if (node.type === "link") {
    const hrefResult = validateHref(node.href, path);
    if (!hrefResult.valid)
      return hrefResult;
  }
  if ("children" in node && node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const result = validateInlineNode(child, `${path}.children[${i}]`);
      if (!result.valid)
        return result;
    }
  }
  return { valid: true };
}
function validateHref(href, path) {
  if (!HREF_PATTERN.test(href)) {
    return {
      valid: false,
      error: {
        code: "INVALID_HREF",
        href,
        reason: "Must be relative path, fragment, or .html file",
        path
      }
    };
  }
  return { valid: true };
}
function validateNavigation(nav) {
  for (let i = 0; i < nav.items.length; i++) {
    const item = nav.items[i];
    const path = `navigation.items[${i}]`;
    if (!item.text || item.text.trim().length === 0) {
      return {
        valid: false,
        error: {
          code: "CONTENT_INVALID_ELEMENT",
          element: "navigation item with empty text",
          allowed: ["navigation item with non-empty text"],
          path
        }
      };
    }
    const hrefResult = validateHref(item.href, path);
    if (!hrefResult.valid)
      return hrefResult;
  }
  return { valid: true };
}
function validateFooter(footer) {
  if (typeof footer.content !== "string") {
    return {
      valid: false,
      error: {
        code: "CONTENT_INVALID_ELEMENT",
        element: "footer with non-string content",
        allowed: ["footer with string content"]
      }
    };
  }
  return { valid: true };
}
function validateCss(css) {
  const rules = css.rules;
  let braceCount = 0;
  for (let i = 0; i < rules.length; i++) {
    const char = rules[i];
    if (char === "{")
      braceCount++;
    if (char === "}")
      braceCount--;
    if (braceCount < 0) {
      return {
        valid: false,
        error: {
          code: "CSS_PARSE_ERROR",
          offset: i,
          message: "Unexpected closing brace"
        }
      };
    }
  }
  if (braceCount !== 0) {
    return {
      valid: false,
      error: {
        code: "CSS_PARSE_ERROR",
        offset: rules.length,
        message: "Unbalanced braces"
      }
    };
  }
  return { valid: true };
}
function validateMeta(meta) {
  if (meta.description !== void 0) {
    if (typeof meta.description !== "string") {
      return {
        valid: false,
        error: {
          code: "CONTENT_INVALID_ELEMENT",
          element: "meta description with non-string value",
          allowed: ["meta description with string value"]
        }
      };
    }
    if (meta.description.length > MAX_META_DESCRIPTION_LENGTH) {
      return {
        valid: false,
        error: {
          code: "CONTENT_INVALID_ELEMENT",
          element: `meta description with ${meta.description.length} characters`,
          allowed: [`meta description with max ${MAX_META_DESCRIPTION_LENGTH} characters`]
        }
      };
    }
  }
  if (meta.author !== void 0) {
    if (typeof meta.author !== "string") {
      return {
        valid: false,
        error: {
          code: "CONTENT_INVALID_ELEMENT",
          element: "meta author with non-string value",
          allowed: ["meta author with string value"]
        }
      };
    }
    if (meta.author.length > MAX_META_AUTHOR_LENGTH) {
      return {
        valid: false,
        error: {
          code: "CONTENT_INVALID_ELEMENT",
          element: `meta author with ${meta.author.length} characters`,
          allowed: [`meta author with max ${MAX_META_AUTHOR_LENGTH} characters`]
        }
      };
    }
  }
  return { valid: true };
}
function validateIcons(icons) {
  const available = getAvailableIconIds();
  for (let i = 0; i < icons.length; i++) {
    const icon = icons[i];
    if (!isValidIconId(icon.id)) {
      return {
        valid: false,
        error: {
          code: "ICON_NOT_IN_WHITELIST",
          iconId: icon.id,
          available,
          path: `icons[${i}]`
        }
      };
    }
  }
  return { valid: true };
}

// src/flatten.ts
var HTML_ESCAPE = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE[char]);
}
function flatten(input) {
  const breakdown = {
    base: 0,
    title: 0,
    meta: 0,
    css: 0,
    navigation: 0,
    footer: 0,
    pagination: 0,
    icons: 0,
    content: 0,
    favicon: 0
  };
  let iconBytes = 0;
  for (const iconRef of input.icons) {
    iconBytes += getIconBytes(iconRef.id);
  }
  breakdown.icons = iconBytes;
  const titleHtml = `<title>${escapeHtml(input.title)}</title>`;
  breakdown.title = measureBytes(titleHtml);
  let cssHtml = "";
  if (input.css !== null) {
    cssHtml = `<style>${input.css.rules}</style>`;
    breakdown.css = measureBytes(cssHtml);
  }
  let metaHtml = "";
  if (input.meta !== null) {
    const metaParts = [];
    if (input.meta.description) {
      metaParts.push(`<meta name="description" content="${escapeHtml(input.meta.description)}">`);
    }
    if (input.meta.author) {
      metaParts.push(`<meta name="author" content="${escapeHtml(input.meta.author)}">`);
    }
    if (metaParts.length > 0) {
      metaHtml = metaParts.join("\n");
      breakdown.meta = measureBytes(metaHtml);
    }
  }
  let faviconHtml = "";
  if (input.favicon) {
    faviconHtml = `<link rel="icon" href="${input.favicon}">`;
    breakdown.favicon = measureBytes(faviconHtml);
  }
  const headContent = `<meta charset="utf-8">
${titleHtml}${faviconHtml ? "\n" + faviconHtml : ""}${metaHtml ? "\n" + metaHtml : ""}${cssHtml ? "\n" + cssHtml : ""}`;
  const head = `<head>
${headContent}
</head>`;
  let navigation = "";
  if (input.navigation !== null) {
    const navItems = input.navigation.items.map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.text)}</a>`).join("\n");
    navigation = `<nav>
${navItems}
</nav>`;
    breakdown.navigation = measureBytes(navigation);
  }
  let footer = "";
  if (input.footer !== null) {
    footer = `<footer>${escapeHtml(input.footer.content)}</footer>`;
    breakdown.footer = measureBytes(footer);
  }
  const contentBlocks = input.content.map(
    (block, index) => {
      const html = flattenContentBlock(block, input.icons, input.posts);
      return {
        html,
        bytes: measureBytes(html),
        sourceIndex: index
      };
    }
  );
  const contentHtml = contentBlocks.map((b) => b.html).join("\n");
  breakdown.content = measureBytes(contentHtml);
  const doctype = "<!DOCTYPE html>";
  const htmlOpen = '<html lang="en">';
  const bodyOpen = "<body>";
  const bodyClose = "</body>";
  const htmlClose = "</html>";
  const headStructureBytes = measureBytes('<head>\n<meta charset="utf-8">\n') + (faviconHtml ? measureBytes("\n") : 0) + // newline between title and favicon
  (metaHtml ? measureBytes("\n") : 0) + // newline between favicon/title and meta
  (cssHtml ? measureBytes("\n") : 0) + // newline between meta/title and css
  measureBytes("\n</head>");
  breakdown.base = measureBytes(doctype) + measureBytes("\n") + measureBytes(htmlOpen) + measureBytes("\n") + headStructureBytes + measureBytes("\n") + measureBytes(bodyOpen) + measureBytes("\n") + measureBytes(bodyClose) + measureBytes("\n") + measureBytes(htmlClose);
  if (navigation)
    breakdown.base += measureBytes("\n");
  if (contentHtml)
    breakdown.base += measureBytes("\n");
  if (footer)
    breakdown.base += measureBytes("\n");
  const page = {
    doctype,
    htmlOpen,
    head,
    bodyOpen,
    navigation,
    content: contentHtml,
    footer,
    bodyClose,
    htmlClose
  };
  return {
    page,
    contentBlocks,
    breakdown,
    iconBytes
  };
}
function flattenContentBlock(block, icons, posts) {
  if (block.type === "bloglist") {
    return renderBloglist(posts || []);
  }
  const inlineHtml = flattenInlineNodes(block.children, icons, "content");
  if (block.type === "heading") {
    const level = block.level ?? 1;
    return `<h${level}>${inlineHtml}</h${level}>`;
  }
  return `<p>${inlineHtml}</p>`;
}
function renderBloglist(posts) {
  const published = posts.filter((p) => p.status === "published" && p.pageType === "post");
  if (published.length === 0) {
    return '<p class="empty">Noch keine Posts.</p>';
  }
  published.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const items = published.map((post) => {
    const date = new Date(post.publishedAt).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    return `<li class="post"><a href="/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a><time datetime="${escapeHtml(post.publishedAt)}">${date}</time></li>`;
  }).join("\n");
  return `<ul class="posts">
${items}
</ul>`;
}
function flattenInlineNodes(nodes, icons, placement) {
  return nodes.map((node, index) => flattenInlineNode(node, icons, placement, index)).join("");
}
function flattenInlineNode(node, icons, placement, index) {
  switch (node.type) {
    case "text":
      return escapeHtml(node.text);
    case "linebreak":
      return "<br>";
    case "bold":
      return `<b>${flattenInlineNodes(node.children, icons, placement)}</b>`;
    case "italic":
      return `<i>${flattenInlineNodes(node.children, icons, placement)}</i>`;
    case "link": {
      const childHtml = flattenInlineNodes(node.children, icons, placement);
      const icon = icons.find(
        (i) => i.placement === placement && i.index === index
      );
      const iconHtml = icon ? getIconSvg(icon.id) : "";
      return `<a href="${escapeHtml(node.href)}">${childHtml}${iconHtml}</a>`;
    }
  }
}
function assemblePageWithContent(page, contentHtml, paginationHtml) {
  const parts = [page.doctype, page.htmlOpen, page.head, page.bodyOpen];
  if (page.navigation) {
    parts.push(page.navigation);
  }
  if (contentHtml) {
    parts.push(contentHtml);
  }
  if (paginationHtml) {
    parts.push(paginationHtml);
  }
  if (page.footer) {
    parts.push(page.footer);
  }
  parts.push(page.bodyClose, page.htmlClose);
  return normalizeLineEndings(parts.join("\n"));
}

// src/paginate.ts
function generatePaginationNav(baseSlug, currentPage, totalPages) {
  if (totalPages <= 1) {
    return "";
  }
  const links = [];
  for (let i = 1; i <= totalPages; i++) {
    const slug = i === 1 ? `${baseSlug}.html` : `${baseSlug}-${i}.html`;
    if (i === currentPage) {
      links.push(`<span>${i}</span>`);
    } else {
      links.push(`<a href="${slug}">${i}</a>`);
    }
  }
  return `<nav aria-label="pagination">
${links.join("\n")}
</nav>`;
}
function calculatePaginationBytes(baseSlug, currentPage, totalPages) {
  const html = generatePaginationNav(baseSlug, currentPage, totalPages);
  return measureBytes(html);
}
function calculateFixedOverhead(breakdown) {
  return breakdown.base + breakdown.title + breakdown.css + breakdown.navigation + breakdown.footer + breakdown.icons;
}
function paginate(baseSlug, page, contentBlocks, baseBreakdown, allowPagination) {
  const fixedOverhead = calculateFixedOverhead(baseBreakdown);
  const totalContentBytes = contentBlocks.reduce((sum, b) => sum + b.bytes, 0);
  const contentNewlines = Math.max(0, contentBlocks.length - 1);
  const totalContentWithNewlines = totalContentBytes + contentNewlines;
  if (fixedOverhead + totalContentWithNewlines <= SIZE_LIMIT) {
    const contentHtml = contentBlocks.map((b) => b.html).join("\n");
    return {
      success: true,
      pages: [
        {
          pageNumber: 1,
          contentBlocks,
          contentHtml,
          paginationHtml: "",
          breakdown: {
            ...baseBreakdown,
            content: measureBytes(contentHtml),
            pagination: 0
          }
        }
      ]
    };
  }
  if (!allowPagination) {
    return {
      success: false,
      error: {
        code: "PAGINATION_DISABLED",
        measured: fixedOverhead + totalContentWithNewlines,
        limit: SIZE_LIMIT
      }
    };
  }
  let estimatedPages = Math.ceil(
    totalContentWithNewlines / (SIZE_LIMIT - fixedOverhead - 100)
  );
  estimatedPages = Math.max(2, estimatedPages);
  let iteration = 0;
  let pages = [];
  let previousPageCount = 0;
  while (iteration < MAX_PAGINATION_ITERATIONS) {
    iteration++;
    pages = [];
    let currentPageBlocks = [];
    let currentPageBytes = 0;
    let pageNumber = 1;
    for (let i = 0; i < contentBlocks.length; i++) {
      const block = contentBlocks[i];
      const paginationBytes = calculatePaginationBytes(
        baseSlug,
        pageNumber,
        estimatedPages
      );
      const availableBudget = SIZE_LIMIT - fixedOverhead - paginationBytes;
      const newlineBytes = currentPageBlocks.length > 0 ? 1 : 0;
      const candidateBytes = currentPageBytes + newlineBytes + block.bytes;
      if (candidateBytes <= availableBudget) {
        currentPageBlocks.push(block);
        currentPageBytes = candidateBytes;
      } else {
        if (currentPageBlocks.length === 0) {
          return {
            success: false,
            error: {
              code: "PAGINATION_BLOCK_TOO_LARGE",
              blockIndex: block.sourceIndex,
              blockSize: block.bytes,
              availableBudget
            }
          };
        }
        const contentHtml = currentPageBlocks.map((b) => b.html).join("\n");
        const paginationHtml = generatePaginationNav(
          baseSlug,
          pageNumber,
          estimatedPages
        );
        pages.push({
          pageNumber,
          contentBlocks: currentPageBlocks,
          contentHtml,
          paginationHtml,
          breakdown: {
            ...baseBreakdown,
            content: measureBytes(contentHtml),
            pagination: measureBytes(paginationHtml)
          }
        });
        pageNumber++;
        currentPageBlocks = [block];
        currentPageBytes = block.bytes;
      }
    }
    if (currentPageBlocks.length > 0) {
      const contentHtml = currentPageBlocks.map((b) => b.html).join("\n");
      const paginationHtml = generatePaginationNav(
        baseSlug,
        pageNumber,
        estimatedPages
      );
      pages.push({
        pageNumber,
        contentBlocks: currentPageBlocks,
        contentHtml,
        paginationHtml,
        breakdown: {
          ...baseBreakdown,
          content: measureBytes(contentHtml),
          pagination: measureBytes(paginationHtml)
        }
      });
    }
    if (pages.length === previousPageCount) {
      const oversized = pages.find((p) => totalFromBreakdown(p.breakdown) > SIZE_LIMIT);
      if (oversized) {
        return {
          success: false,
          error: {
            code: "PAGINATION_NO_CONVERGENCE",
            iterations: iteration
          }
        };
      }
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        p.paginationHtml = generatePaginationNav(baseSlug, p.pageNumber, pages.length);
        p.breakdown.pagination = measureBytes(p.paginationHtml);
      }
      return { success: true, pages };
    }
    previousPageCount = pages.length;
    estimatedPages = pages.length;
  }
  return {
    success: false,
    error: {
      code: "PAGINATION_NO_CONVERGENCE",
      iterations: MAX_PAGINATION_ITERATIONS
    }
  };
}
function paginatedSlug(baseSlug, pageNumber) {
  return pageNumber === 1 ? baseSlug : `${baseSlug}-${pageNumber}`;
}

// src/compiler.ts
function compile(input) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const validation = validateInput(input);
  if (!validation.valid) {
    return {
      success: false,
      buildId: input.buildId,
      timestamp,
      error: validation.error
    };
  }
  const flattenResult = flatten(input);
  const { page, contentBlocks, breakdown } = flattenResult;
  const totalBytes = totalFromBreakdown(breakdown);
  if (totalBytes > SIZE_LIMIT) {
    if (!input.allowPagination) {
      const fixedOverhead = breakdown.base + breakdown.title + breakdown.css + breakdown.navigation + breakdown.footer + breakdown.icons + breakdown.pagination;
      const availableBudget = SIZE_LIMIT - fixedOverhead;
      let oversizedBlock;
      for (const block of contentBlocks) {
        if (block.bytes > availableBudget) {
          oversizedBlock = {
            index: block.sourceIndex,
            size: block.bytes,
            availableBudget
          };
          break;
        }
      }
      return {
        success: false,
        buildId: input.buildId,
        timestamp,
        error: {
          code: "SIZE_LIMIT_EXCEEDED",
          measured: totalBytes,
          limit: SIZE_LIMIT,
          breakdown,
          oversizedBlock
        },
        partialMeasurements: createPageMeasurement(input.slug, breakdown)
      };
    }
  }
  const paginationResult = paginate(
    input.slug,
    page,
    contentBlocks,
    breakdown,
    input.allowPagination
  );
  if (!paginationResult.success) {
    return {
      success: false,
      buildId: input.buildId,
      timestamp,
      error: paginationResult.error,
      partialMeasurements: createPageMeasurement(input.slug, breakdown)
    };
  }
  const compiledPages = [];
  const measurements = [];
  const totalPages = paginationResult.pages.length;
  for (const paginatedPage of paginationResult.pages) {
    const slug = paginatedSlug(input.slug, paginatedPage.pageNumber);
    const html = assemblePageWithContent(
      page,
      paginatedPage.contentHtml,
      paginatedPage.paginationHtml
    );
    const bytes = measureBytes(html);
    const hash = computeHash(html);
    if (bytes > SIZE_LIMIT) {
      const pageBreakdown = paginatedPage.breakdown;
      const pageFixedOverhead = pageBreakdown.base + pageBreakdown.title + pageBreakdown.css + pageBreakdown.navigation + pageBreakdown.footer + pageBreakdown.icons + pageBreakdown.pagination;
      const pageAvailableBudget = SIZE_LIMIT - pageFixedOverhead;
      let oversizedBlock;
      for (const block of paginatedPage.contentBlocks) {
        if (block.bytes > pageAvailableBudget) {
          oversizedBlock = {
            index: block.sourceIndex,
            size: block.bytes,
            availableBudget: pageAvailableBudget
          };
          break;
        }
      }
      return {
        success: false,
        buildId: input.buildId,
        timestamp,
        error: {
          code: "SIZE_LIMIT_EXCEEDED",
          measured: bytes,
          limit: SIZE_LIMIT,
          breakdown: paginatedPage.breakdown,
          oversizedBlock
        }
      };
    }
    compiledPages.push({
      slug,
      pageNumber: paginatedPage.pageNumber,
      totalPages,
      html,
      bytes,
      hash
    });
    measurements.push(createPageMeasurement(slug, paginatedPage.breakdown));
  }
  const totals = {
    pageCount: compiledPages.length,
    totalBytes: compiledPages.reduce((sum, p) => sum + p.bytes, 0),
    largestPage: Math.max(...compiledPages.map((p) => p.bytes)),
    smallestPage: Math.min(...compiledPages.map((p) => p.bytes))
  };
  return {
    success: true,
    buildId: input.buildId,
    timestamp,
    pages: compiledPages,
    measurements,
    totals
  };
}
function dryRun(input) {
  const result = compile(input);
  if (result.success) {
    return {
      wouldSucceed: true,
      measurements: result.measurements,
      pages: result.pages
    };
  }
  return {
    wouldSucceed: false,
    error: result.error,
    partialMeasurements: result.partialMeasurements
  };
}
function verifyDeterminism(input) {
  const result1 = compile(input);
  const result2 = compile(input);
  if (!result1.success || !result2.success) {
    return result1.success === result2.success;
  }
  if (result1.pages.length !== result2.pages.length) {
    return false;
  }
  return result1.pages.every(
    (page, i) => page.hash === result2.pages[i].hash
  );
}
function formatBreakdown(breakdown) {
  const lines = [];
  const total = totalFromBreakdown(breakdown);
  const items = [
    ["Base", breakdown.base],
    ["Title", breakdown.title],
    ["Meta", breakdown.meta],
    ["CSS", breakdown.css],
    ["Navigation", breakdown.navigation],
    ["Footer", breakdown.footer],
    ["Pagination", breakdown.pagination],
    ["Icons", breakdown.icons],
    ["Content", breakdown.content]
  ];
  for (const [name, bytes] of items) {
    if (bytes > 0) {
      const pct = (bytes / total * 100).toFixed(1);
      lines.push(`  ${name}: ${bytes} bytes (${pct}%)`);
    }
  }
  lines.push(`  Total: ${total} bytes`);
  lines.push(`  Remaining: ${SIZE_LIMIT - total} bytes`);
  lines.push(`  Utilization: ${(total / SIZE_LIMIT * 100).toFixed(1)}%`);
  return lines.join("\n");
}
function formatResult(result) {
  if (!result.success) {
    return `Compilation failed: ${result.error.code}
${JSON.stringify(result.error, null, 2)}`;
  }
  const lines = [
    `Compilation successful`,
    `Build ID: ${result.buildId}`,
    `Timestamp: ${result.timestamp}`,
    `Pages: ${result.totals.pageCount}`,
    `Total bytes: ${result.totals.totalBytes}`,
    ""
  ];
  for (const measurement of result.measurements) {
    lines.push(`Page: ${measurement.slug}`);
    lines.push(formatBreakdown(measurement.breakdown));
    lines.push("");
  }
  return lines.join("\n");
}

// src/manifest.core.ts
function createEmptyManifest() {
  return {
    version: 1,
    entries: []
  };
}
function canPublish(slug, manifest) {
  const entry = manifest.entries.find((e) => e.slug === slug);
  if (!entry) {
    return { allowed: true };
  }
  if (entry.status === "published") {
    return {
      allowed: false,
      reason: "SLUG_EXISTS",
      existingHash: entry.hash,
      publishedAt: entry.publishedAt
    };
  }
  if (entry.status === "tombstone") {
    return {
      allowed: false,
      reason: "SLUG_TOMBSTONED",
      tombstonedAt: entry.tombstonedAt
    };
  }
  return { allowed: true };
}
function publishCheckToError(slug, check) {
  if (check.allowed) {
    return null;
  }
  if (check.reason === "SLUG_EXISTS") {
    return {
      code: "SLUG_ALREADY_PUBLISHED",
      slug,
      publishedAt: check.publishedAt
    };
  }
  if (check.reason === "SLUG_TOMBSTONED") {
    return {
      code: "SLUG_IS_TOMBSTONE",
      slug,
      tombstonedAt: check.tombstonedAt
    };
  }
  return null;
}
function addEntry(manifest, entry) {
  return {
    ...manifest,
    entries: [...manifest.entries, entry]
  };
}
function tombstoneEntry(manifest, slug, tombstonedAt) {
  const entryIndex = manifest.entries.findIndex((e) => e.slug === slug);
  if (entryIndex === -1) {
    return { success: false, reason: "NOT_FOUND" };
  }
  const entry = manifest.entries[entryIndex];
  if (entry.status === "tombstone") {
    return { success: false, reason: "ALREADY_TOMBSTONED", tombstonedAt: entry.tombstonedAt };
  }
  const updatedEntry = {
    ...entry,
    status: "tombstone",
    tombstonedAt
  };
  const entries = [...manifest.entries];
  entries[entryIndex] = updatedEntry;
  return {
    success: true,
    manifest: {
      ...manifest,
      entries
    }
  };
}
function getEntry(manifest, slug) {
  return manifest.entries.find((e) => e.slug === slug);
}
function getPublishedEntries(manifest) {
  return manifest.entries.filter((e) => e.status === "published");
}
function getTombstonedEntries(manifest) {
  return manifest.entries.filter((e) => e.status === "tombstone");
}
function buildIndexState(manifest) {
  const entries = manifest.entries.map((e) => ({
    slug: e.slug,
    title: e.title,
    publishedAt: e.publishedAt,
    status: e.status
  }));
  entries.sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );
  return { entries };
}
function generateTombstoneHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Page Removed</title>
</head>
<body>
<p>This page has been removed.</p>
</body>
</html>`;
}
function validateManifest(manifest) {
  if (manifest.version !== 1) {
    return {
      valid: false,
      error: {
        code: "MANIFEST_CORRUPTED",
        reason: `Invalid version: ${manifest.version}`
      }
    };
  }
  const slugs = /* @__PURE__ */ new Set();
  for (const entry of manifest.entries) {
    if (slugs.has(entry.slug)) {
      return {
        valid: false,
        error: {
          code: "MANIFEST_CORRUPTED",
          reason: `Duplicate slug: ${entry.slug}`
        }
      };
    }
    slugs.add(entry.slug);
  }
  for (const entry of manifest.entries) {
    if (!entry.slug || !entry.hash || !entry.publishedAt || !entry.title) {
      return {
        valid: false,
        error: {
          code: "MANIFEST_CORRUPTED",
          reason: `Invalid entry: ${entry.slug}`
        }
      };
    }
    if (entry.status !== "published" && entry.status !== "tombstone") {
      return {
        valid: false,
        error: {
          code: "MANIFEST_CORRUPTED",
          reason: `Invalid status for ${entry.slug}: ${entry.status}`
        }
      };
    }
    if (entry.status === "tombstone" && !entry.tombstonedAt) {
      return {
        valid: false,
        error: {
          code: "MANIFEST_CORRUPTED",
          reason: `Tombstone without tombstonedAt: ${entry.slug}`
        }
      };
    }
  }
  return { valid: true };
}
export {
  MAX_PAGINATION_ITERATIONS,
  SIZE_LIMIT,
  addEntry,
  buildIndexState,
  canPublish,
  compile,
  computeHash,
  createEmptyManifest,
  dryRun,
  formatBreakdown,
  formatResult,
  generateTombstoneHtml,
  getAvailableIconIds,
  getEntry,
  getIcon,
  getIconBytes,
  getIconSvg,
  getPublishedEntries,
  getTombstonedEntries,
  isValidIconId,
  measureBytes,
  normalizeLineEndings,
  publishCheckToError,
  tombstoneEntry,
  validateInput,
  validateManifest,
  verifyDeterminism
};
