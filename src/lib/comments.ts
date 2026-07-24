import { STICKER_SETS } from '@/data/stickers';

/**
 * Converts sticker tokens [sticker:setId:filename] and plain URLs (https://..., http://..., www....)
 * in comment text into formatted HTML with clickable links and inline sticker images.
 */
export const renderCommentContentHtml = (text: string): string => {
  if (!text) return '';

  // 1. Convert sticker shortcodes [sticker:setId:filename] to <img> tags
  let html = text.replace(/\[sticker:([a-zA-Z0-9_-]+):([a-zA-Z0-9_.-]+)\]/g, (match, setId, filename) => {
    const set = STICKER_SETS.find(s => s.id === setId);
    if (set) {
      return `<img src="${set.baseUrl}${filename}" alt="sticker" class="w-12 h-12 inline-block align-middle my-0.5 mx-1 max-h-12 object-contain select-none animate-in zoom-in-50 duration-150" />`;
    }
    return match;
  });

  // 2. Parse URLs in text segments, avoiding existing HTML tags like <img src="...">
  const parts = html.split(/(<[^>]+>)/g);
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

  const processedParts = parts.map(part => {
    // If this part is an HTML tag (e.g. <img ...> or <a ...>), don't process URLs inside its attributes
    if (/^<[^>]+>$/.test(part)) {
      return part;
    }

    // Convert URLs into YouTube-style clickable anchor tags
    return part.replace(urlRegex, (url) => {
      let cleanUrl = url;
      let trailingPunct = '';

      // Strip trailing punctuation like . , ; : ! ? ) ] unless part of balanced parens
      while (/[.,;:!?)]$/.test(cleanUrl)) {
        if (cleanUrl.endsWith(')') && (cleanUrl.match(/\(/g) || []).length >= (cleanUrl.match(/\)/g) || []).length) {
          break;
        }
        trailingPunct = cleanUrl.slice(-1) + trailingPunct;
        cleanUrl = cleanUrl.slice(0, -1);
      }

      if (!cleanUrl) return url;

      let href = cleanUrl;
      if (cleanUrl.toLowerCase().startsWith('www.')) {
        href = 'https://' + cleanUrl;
      }

      // External link SVG icon (YouTube style)
      const svgIcon = `<svg class="w-3.5 h-3.5 inline-block shrink-0 opacity-80 mb-0.5 ml-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>`;

      const linkHtml = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 break-all inline-items-center gap-0.5 font-medium transition-colors cursor-pointer" onclick="event.stopPropagation()">${cleanUrl}${svgIcon}</a>`;

      return linkHtml + trailingPunct;
    });
  });

  return processedParts.join('');
};
