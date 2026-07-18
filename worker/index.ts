interface Env {
  ASSETS: Fetcher;
}

interface PageMeta {
  title: string;
  description: string;
  image?: string;
  type?: string;
  bodyHtml?: string;
  canonical?: string;
  jsonLd?: any;
}

const API_BASE = 'https://api.pubnihtruyen.com/api';
const SITE_URL = 'https://pubnihtruyen.com';
const SITE_NAME = 'Pub Nih Truyện';
const DEFAULT_TITLE = 'Pub Nih Truyện - Thế Giới Light Novel & Dịch Giả';
const DEFAULT_DESCRIPTION = 'Đọc Light Novel dịch full miễn phí, cập nhật chương mới mỗi ngày. Kho truyện ngôn tình, huyền huyễn, xuyên không, hệ thống... giao diện mượt, không quảng cáo.';
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;
const R2_DEV_BASE = 'https://pub-71585e468cd741989c43b01356ee9591.r2.dev';
const CDN_BASE = 'https://cdn.pubnihtruyen.com';

const STATIC_META: Record<string, PageMeta> = {
  '/': {
    title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION,
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: SITE_NAME, url: SITE_URL,
      potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
    },
  },
  '/ranking': { title: `Bảng Xếp Hạng Truyện | ${SITE_NAME}`, description: 'Xếp hạng những truyện được đọc nhiều nhất trên Pub Nih Truyện theo lượt xem thực tế.' },
  '/new-update': { title: `Mới Cập Nhật | ${SITE_NAME}`, description: 'Danh sách truyện vừa cập nhật chương mới nhất trên Pub Nih Truyện.' },
  '/completed': { title: `Truyện Đã Hoàn Thành | ${SITE_NAME}`, description: 'Kho truyện light novel đã hoàn thành, đọc trọn bộ không phải chờ chương mới.' },
  '/genres': { title: `Thể Loại Truyện | ${SITE_NAME}`, description: 'Duyệt truyện theo thể loại: ngôn tình, huyền huyễn, xuyên không, hệ thống...' },
  '/search': { title: `Tìm Kiếm Truyện | ${SITE_NAME}`, description: 'Tìm kiếm light novel theo tên truyện, tác giả trên Pub Nih Truyện.' },
  '/leaderboard': { title: `Bảng Vàng Đóng Góp | ${SITE_NAME}`, description: 'Bảng xếp hạng những độc giả ủng hộ dịch giả nhiều nhất trên Pub Nih Truyện.' },
};

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean;
}

function r2ToCdn(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith(R2_DEV_BASE) ? url.replace(R2_DEV_BASE, CDN_BASE) : url;
}

function safeJsonLd(obj: any): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

async function fetchJson(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const LISTING_CAP = 60;

function storyListHtml(stories: any[]): string {
  return '<ul>' + stories.slice(0, LISTING_CAP).map(s =>
    `<li><a href="/detail/${escapeHtml(s.slug)}">${escapeHtml(s.title)}</a>${s.author ? ' - ' + escapeHtml(s.author) : ''}</li>`
  ).join('') + '</ul>';
}

function genreListHtml(genres: any[]): string {
  return '<ul>' + genres.map(g =>
    `<li><a href="/genres/${escapeHtml(g.slug)}">${escapeHtml(g.name)}</a></li>`
  ).join('') + '</ul>';
}

async function metaForPath(pathname: string): Promise<PageMeta> {
  const detailMatch = pathname.match(/^\/detail\/([^/]+)\/?$/);
  if (detailMatch) {
    const story = await fetchJson(`/stories/${detailMatch[1]}/`);
    if (story) {
      const cover = r2ToCdn(story.cover_url) || DEFAULT_IMAGE;
      const canonical = `${SITE_URL}/detail/${story.slug}`;
      const genres: any[] = Array.isArray(story.genres) ? story.genres : [];
      const toc: any[] = Array.isArray(story.toc) ? story.toc : [];
      const bodyHtml =
        `<h1>${escapeHtml(story.title)}</h1>` +
        `<img src="${escapeHtml(cover)}" alt="${escapeHtml(story.title)}">` +
        (story.author_slug ? `<p>Tác giả: <a href="/author/${escapeHtml(story.author_slug)}">${escapeHtml(story.author)}</a></p>` : '') +
        (genres.length ? `<p>Thể loại: ${genres.map(g => `<a href="/genres/${escapeHtml(g.slug)}">${escapeHtml(g.name)}</a>`).join(', ')}</p>` : '') +
        `<p>Trạng thái: ${story.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra'} - ${story.total_chapters || 0} chương</p>` +
        `<p>${escapeHtml(story.description || '')}</p>` +
        (toc.length ? `<h2>Danh sách chương</h2><ul>${toc.map((c: any) =>
          `<li><a href="/chapter/${c.id}">${escapeHtml(c.title || `Chương ${c.chapter_number}`)}</a></li>`
        ).join('')}</ul>` : '');

      const jsonLd: any = {
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: story.title,
        url: canonical,
        image: cover,
        description: truncate(story.description || '', 300),
        inLanguage: 'vi',
        bookFormat: 'https://schema.org/EBook',
        genre: genres.map(g => g.name),
      };
      if (story.author) jsonLd.author = { '@type': 'Person', name: story.author };
      if (story.rating_count > 0) {
        jsonLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: story.rating_avg, ratingCount: story.rating_count, bestRating: 5, worstRating: 1 };
      }

      return {
        title: `${story.title}${story.author ? ' - ' + story.author : ''} | ${SITE_NAME}`,
        description: truncate(story.description || DEFAULT_DESCRIPTION, 200),
        image: cover,
        type: 'book',
        bodyHtml,
        canonical,
        jsonLd,
      };
    }
    return STATIC_META['/'];
  }

  const chapterMatch = pathname.match(/^\/chapter\/([^/]+)\/?$/);
  if (chapterMatch) {
    const chapter = await fetchJson(`/chapters/${chapterMatch[1]}/`);
    if (chapter) {
      const chapterLabel = chapter.title || `Chương ${chapter.chapter_number}`;
      const canonical = `${SITE_URL}/chapter/${chapter.id}`;
      return {
        title: `${chapterLabel} - ${chapter.story_title} | ${SITE_NAME}`,
        description: `Đọc ${chapter.story_title} ${chapterLabel} full, cập nhật nhanh nhất tại ${SITE_NAME}.`,
        type: 'article',
        bodyHtml: `<h1>${escapeHtml(chapterLabel)}</h1><p><a href="/detail/${escapeHtml(chapter.story_slug)}">${escapeHtml(chapter.story_title)}</a></p>`,
        canonical,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: chapterLabel,
          url: canonical,
          datePublished: chapter.published_at,
          isPartOf: { '@type': 'Book', name: chapter.story_title, url: `${SITE_URL}/detail/${chapter.story_slug}` },
        },
      };
    }
    return STATIC_META['/'];
  }

  const authorMatch = pathname.match(/^\/author\/([^/]+)\/?$/);
  if (authorMatch) {
    const author = await fetchJson(`/authors/${authorMatch[1]}/`);
    if (author) {
      const name = author.name_vi || author.name_zh;
      const canonical = `${SITE_URL}/author/${author.slug}`;
      const stories = await fetchJson(`/stories/?author=${authorMatch[1]}`);
      return {
        title: `Truyện của ${name} | ${SITE_NAME}`,
        description: `Danh sách${author.story_count ? ' ' + author.story_count : ''} truyện dịch của tác giả ${name} trên ${SITE_NAME}.`,
        bodyHtml: `<h1>Truyện của ${escapeHtml(name)}</h1>` + (Array.isArray(stories) ? storyListHtml(stories) : ''),
        canonical,
        jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name, url: canonical },
      };
    }
    return STATIC_META['/'];
  }

  const genreMatch = pathname.match(/^\/genres\/([^/]+)\/?$/);
  if (genreMatch) {
    const genres = await fetchJson('/genres/');
    const genre = Array.isArray(genres) ? genres.find((g: any) => g.slug === genreMatch[1]) : null;
    if (genre) {
      const canonical = `${SITE_URL}/genres/${genre.slug}`;
      const stories = await fetchJson(`/stories/?genre=${genreMatch[1]}`);
      return {
        title: `Truyện ${genre.name} Hay Nhất | ${SITE_NAME}`,
        description: `Tổng hợp truyện thể loại ${genre.name} được dịch và cập nhật đầy đủ tại ${SITE_NAME}.`,
        bodyHtml: `<h1>Truyện ${escapeHtml(genre.name)}</h1>` + (Array.isArray(stories) ? storyListHtml(stories) : ''),
        canonical,
      };
    }
    return { ...STATIC_META['/genres'], canonical: `${SITE_URL}/genres` };
  }

  const PAGE_HEADINGS: Record<string, string> = {
    '/': SITE_NAME,
    '/ranking': 'Bảng Xếp Hạng Truyện',
    '/new-update': 'Mới Cập Nhật',
  };
  if (pathname in PAGE_HEADINGS) {
    const stories = await fetchJson('/stories/');
    return { ...STATIC_META[pathname], bodyHtml: `<h1>${escapeHtml(PAGE_HEADINGS[pathname])}</h1>` + (Array.isArray(stories) ? storyListHtml(stories) : ''), canonical: `${SITE_URL}${pathname === '/' ? '' : pathname}` || SITE_URL };
  }

  if (pathname === '/completed') {
    const stories = await fetchJson('/stories/?status=COMPLETED');
    return { ...STATIC_META['/completed'], bodyHtml: `<h1>Truyện Đã Hoàn Thành</h1>` + (Array.isArray(stories) ? storyListHtml(stories) : ''), canonical: `${SITE_URL}/completed` };
  }

  if (pathname === '/genres') {
    const genres = await fetchJson('/genres/');
    return { ...STATIC_META['/genres'], bodyHtml: `<h1>Thể Loại Truyện</h1>` + (Array.isArray(genres) ? genreListHtml(genres) : ''), canonical: `${SITE_URL}/genres` };
  }

  return { ...(STATIC_META[pathname] || STATIC_META['/']), canonical: `${SITE_URL}${pathname === '/' ? '' : pathname}` || SITE_URL };
}

class TitleHandler {
  constructor(private title: string) {}
  element(element: any) {
    element.setInnerContent(this.title);
  }
}

class HeadHandler {
  constructor(private meta: PageMeta) {}
  element(element: any) {
    const m = this.meta;
    const image = m.image || DEFAULT_IMAGE;
    let tags =
      `<meta name="description" content="${escapeHtml(m.description)}">` +
      `<meta property="og:site_name" content="${SITE_NAME}">` +
      `<meta property="og:type" content="${m.type || 'website'}">` +
      `<meta property="og:title" content="${escapeHtml(m.title)}">` +
      `<meta property="og:description" content="${escapeHtml(m.description)}">` +
      `<meta property="og:image" content="${escapeHtml(image)}">` +
      `<meta name="twitter:card" content="summary_large_image">` +
      `<meta name="twitter:title" content="${escapeHtml(m.title)}">` +
      `<meta name="twitter:description" content="${escapeHtml(m.description)}">`;
    if (m.canonical) {
      tags += `<link rel="canonical" href="${escapeHtml(m.canonical)}">`;
      tags += `<meta property="og:url" content="${escapeHtml(m.canonical)}">`;
    }
    if (m.jsonLd) {
      tags += `<script type="application/ld+json">${safeJsonLd(m.jsonLd)}</script>`;
    }
    element.append(tags, { html: true });
  }
}

class RootHandler {
  constructor(private html: string) {}
  element(element: any) {
    element.setInnerContent(this.html, { html: true });
  }
}

const HAS_EXTENSION_RE = /\.[a-zA-Z0-9]+$/;

// Crawlers/link-preview bots that don't execute JS — safe to hand them the
// unstyled content snapshot directly. Real browsers never match this, so they
// never see the unstyled flash before React mounts.
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|zalo|discordbot|slackbot|linkedinbot|pinterest|embedly|quora|outbrain|w3c_validator|preview|headless/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/sitemap.xml') {
      const upstream = await fetch(`${API_BASE}/sitemap.xml`);
      return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
    }

    const response = await env.ASSETS.fetch(request);

    if (HAS_EXTENSION_RE.test(url.pathname) || !(response.headers.get('content-type') || '').includes('text/html')) {
      return response;
    }

    let meta: PageMeta;
    try {
      meta = await metaForPath(url.pathname);
    } catch {
      return response;
    }

    const rewriter = new HTMLRewriter()
      .on('title', new TitleHandler(meta.title))
      .on('head', new HeadHandler(meta));

    const isBot = BOT_RE.test(request.headers.get('user-agent') || '');
    if (meta.bodyHtml && isBot) {
      rewriter.on('#root', new RootHandler(meta.bodyHtml));
    }

    return rewriter.transform(response);
  },
};
