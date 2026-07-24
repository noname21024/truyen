import axios from 'axios';

const _rawApiUrl = (import.meta.env.VITE_API_BASE_URL || 'https://api.pubnihtruyen.com/api').trim();
export const API_BASE_URL = _rawApiUrl.replace(/\/+$/, '');

// Client-side TTL cache — prevents redundant API calls when navigating between pages
const _memCache = new Map<string, { data: unknown; exp: number }>();
const CACHE_TTL = 60_000; // 60s matches server-side Django cache TTL

async function memoGet<T>(url: string, params?: Record<string, string>): Promise<T> {
  const key = params && Object.keys(params).length > 0
    ? url + '?' + new URLSearchParams(params).toString()
    : url;
  const hit = _memCache.get(key);
  if (hit && Date.now() < hit.exp) return hit.data as T;
  const r = await publicApi.get<T>(url, params ? { params } : undefined);
  _memCache.set(key, { data: r.data, exp: Date.now() + CACHE_TTL });
  return r.data;
}

export function invalidateCache(urlPrefix?: string) {
  if (!urlPrefix) { _memCache.clear(); return; }
  for (const key of _memCache.keys()) {
    if (key.startsWith(urlPrefix)) _memCache.delete(key);
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The account is limited to a fixed number of signed-in devices. When a newer
// device pushes this one out, the server answers `session_revoked` — the stored
// token is dead, so clear it and let the app show a message rather than letting
// every subsequent call fail silently.
api.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.data?.code === 'session_revoked') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('session-revoked'));
    }
    return Promise.reject(error);
  }
);

export const AuthService = {
  // Frees this device's slot server-side; without it the session lingers until
  // it expires and keeps occupying one of the allowed devices.
  logout: async () => {
    try {
      await api.post('auth/logout/');
    } catch {
      // Already invalid server-side — clearing local state below is enough.
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  updateName: async (name: string) => {
    const r = await api.patch<{ name: string }>('auth/profile/', { name });
    return r.data;
  },

  uploadAvatar: async (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    // Let the browser set the multipart boundary itself.
    const r = await api.post<{ avatar_url: string }>('auth/avatar/', form, {
      headers: { 'Content-Type': undefined as unknown as string },
    });
    return r.data;
  },

  resetAvatar: async () => {
    const r = await api.post<{ avatar_url: string }>('auth/avatar/reset/');
    return r.data;
  },

  getSessions: async () => {
    const r = await api.get<{
      id: number; device: string; last_seen_at: string; created_at: string; is_current: boolean;
    }[]>('auth/sessions/');
    return r.data;
  },
};

// Public API instance — no Authorization header so Cloudflare CDN can cache responses
// for logged-in users too (free plan doesn't support "Ignore Authorization header" rule)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// TypeScript interfaces matching the Django serializers
export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Author {
  id: number;
  name_zh: string;
  name_vi: string;
  slug: string;
  story_count?: number;
}

export interface ChapterSummary {
  id: number;
  title: string;
  chapter_number: number;
  content_url: string;
  published_at: string;
  has_audio?: boolean;
  audio_url?: string | null;
  view_count?: number;
}

export interface ChapterDetail {
  id: number;
  story: number;
  story_slug: string;
  story_title: string;
  title: string;
  chapter_number: number;
  content_url: string;
  published_at: string;
  has_audio?: boolean;
  audio_url?: string | null;
  view_count?: number;
}

export interface NovelSummary {
  id: number;
  title: string;
  slug: string;
  author: string | null;
  author_slug?: string | null;
  author_id?: number | null;
  genres: Category[];
  cover_url: string;
  background_thumbnail_url?: string | null;
  status: 'ONGOING' | 'COMPLETED' | 'PAUSED';
  is_vip: boolean;
  total_chapters: number;
  view_count: number;
  follow_count: number;
  /** Story comments plus comments on all of its chapters. */
  comment_count: number;
  updated_at: string;
  description?: string;
}

export interface ChapterToc {
  id: number;
  chapter_number: number;
  title: string;
}

export interface PaginatedChapters {
  count: number;
  next: string | null;
  previous: string | null;
  results: ChapterSummary[];
}

export interface NovelDetail {
  id: number;
  title: string;
  slug: string;
  author: string | null;
  author_slug?: string | null;
  author_id?: number | null;
  genres: Category[];
  cover_url: string;
  background_thumbnail_url?: string | null;
  description: string;
  status: 'ONGOING' | 'COMPLETED' | 'PAUSED';
  is_vip: boolean;
  total_chapters: number;
  view_count: number;
  follow_count: number;
  comment_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  toc: ChapterToc[];
}

// Novel API services
export const NovelService = {
  // Get list of novels with optional filters (search title, category slug, author slug)
  getNovels: async (params?: { search?: string; category?: string; author?: string; status?: string }) => {
    const apiParams: Record<string, string> = {};
    if (params?.search) apiParams.search = params.search;
    if (params?.category) apiParams.genre = params.category;
    if (params?.author) apiParams.author = params.author;
    if (params?.status) apiParams.status = params.status;
    return memoGet<NovelSummary[]>('stories/', apiParams);
  },

  // Get novel detail by its slug (e.g. 'tru-tien')
  getNovelDetail: async (slug: string) => {
    return memoGet<NovelDetail>(`stories/${slug}/`);
  },

  // Increment novel views
  incrementViews: async (slug: string) => {
    const response = await api.post<{ status: string; views: number }>(`stories/${slug}/increment-views/`);
    return response.data;
  },
};

// Chapter API services
export const ChapterService = {
  // Get list of chapters for a novel slug (legacy, no pagination)
  getChapters: async (novelSlug: string) => {
    const response = await publicApi.get<ChapterSummary[]>('chapters/', {
      params: { story: novelSlug },
    });
    return response.data;
  },

  // Get paginated chapters — used by DetailPage for lazy loading
  getChaptersPaginated: async (novelSlug: string, params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    ordering?: string;
  }): Promise<PaginatedChapters> => {
    const response = await publicApi.get<PaginatedChapters | ChapterSummary[]>('chapters/', {
      params: {
        story: novelSlug,
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 100,
        ...(params?.search ? { search: params.search } : {}),
        ordering: params?.ordering ?? 'chapter_number',
      },
    });
    if (Array.isArray(response.data)) {
      return { count: response.data.length, next: null, previous: null, results: response.data };
    }
    return response.data;
  },

  // Get chapter detail by ID (since chapters have primary key ID)
  getChapterDetail: async (id: number | string) => {
    const token = localStorage.getItem('auth_token');
    const instance = token ? api : publicApi;
    const response = await instance.get<ChapterDetail>(`chapters/${id}/`);
    return response.data;
  },

  // Get chapter detail by novel slug and chapter number
  getChapterByNumber: async (novelSlug: string, chapterNumber: number | string) => {
    const token = localStorage.getItem('auth_token');
    const instance = token ? api : publicApi;
    const response = await instance.get<ChapterDetail[]>('chapters/', {
      params: { story: novelSlug, chapter_number: chapterNumber },
    });
    return response.data[0] || null;
  },

  // Get chapter content (json) via backend server proxy
  getChapterContent: async (id: number | string) => {
    const response = await api.get<any>(`chapters/${id}/content/`);
    return response.data;
  },

  // Increment chapter views
  incrementViews: async (id: number | string) => {
    const response = await api.post<{ status: string; chapter_views: number; novel_views: number }>(
      `chapters/${id}/increment-views/`
    );
    return response.data;
  },
};

// Category API services
export const CategoryService = {
  getCategories: async () => {
    return memoGet<Category[]>('genres/');
  },
};

// Author API services
export const AuthorService = {
  getAuthors: async () => {
    const response = await publicApi.get<Author[]>('authors/');
    return response.data;
  },

  // Get a single author's info (name + story_count) by slug
  getAuthorDetail: async (slug: string) => {
    const response = await publicApi.get<Author>(`authors/${slug}/`);
    return response.data;
  },
};

export interface CoinPackage {
  id: number;
  coins: number;
  price: number;
  label: string;
  original_price: number;
  discount: number;
}

export interface CoinDepositResult {
  transaction_id: number;
  qr_url: string;
  account_number: string;
  account_name: string;
  description: string;
  coins: number;
  vnd_amount: number;
  expires_at: string;
  created_at: string;
}

export interface CoinTx {
  id: number;
  type: 'deposit' | 'spend';
  status: 'pending' | 'completed' | 'cancelled';
  coins: number;
  vnd_amount: number;
  ref_code: string;
  note: string;
  expires_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface VIPStatus {
  is_active: boolean;
  expires_at: string | null;
}

export interface StoryPriceInfo {
  story_title: string;
  total_paid_chapters: number;
  already_unlocked: number;
  locked_count: number;
  cost_per_chapter: number;
  /** Price before the bulk discount — shown struck through next to total_cost. */
  original_cost: number;
  discount_percent: number;
  saved: number;
  total_cost: number;
  free_up_to: number;
}

export const CoinService = {
  getPackages: async () => {
    const r = await api.get<CoinPackage[]>('coin/packages/');
    return r.data;
  },
  getBalance: async () => {
    const r = await api.get<{ coin_balance: number; is_vip: boolean; vip_expires_at: string | null; is_staff: boolean }>('coin/balance/');
    return r.data;
  },
  createDeposit: async (packageId: number) => {
    const r = await api.post<CoinDepositResult>('coin/deposit/', { package_id: packageId });
    return r.data;
  },
  createCustomDeposit: async (amount: number) => {
    const r = await api.post<CoinDepositResult>('coin/deposit/', { custom_amount: amount });
    return r.data;
  },
  getTransactions: async () => {
    const r = await api.get<CoinTx[]>('coin/transactions/');
    return r.data;
  },
  unlockChapter: async (chapterId: number) => {
    const r = await api.post<{ success: boolean; coin_balance: number; already_unlocked?: boolean; via_vip?: boolean }>('coin/unlock/', { chapter_id: chapterId });
    return r.data;
  },
  getUnlockedChapters: async (storySlug: string) => {
    const r = await api.get<{ unlocked_chapters: number[]; is_vip: boolean; vip_expires_at: string | null; free_up_to: number }>('coin/unlocked/', { params: { story: storySlug } });
    return r.data;
  },
  getVIPStatus: async () => {
    const r = await api.get<VIPStatus>('coin/vip-status/');
    return r.data;
  },
  subscribeVIP: async () => {
    const r = await api.post<{ success: boolean; coin_balance: number; is_vip: boolean; vip_expires_at: string }>('coin/subscribe-vip/');
    return r.data;
  },
  reportPayment: async (transactionId: number) => {
    const r = await api.post<{ success: boolean }>('coin/report-payment/', { transaction_id: transactionId });
    return r.data;
  },
  cancelDeposit: async (transactionId: number) => {
    const r = await api.post<{ success: boolean }>('coin/cancel-deposit/', { transaction_id: transactionId });
    return r.data;
  },
  getStoryPrice: async (storySlug: string) => {
    const r = await api.get<StoryPriceInfo>('coin/story-price/', { params: { story: storySlug } });
    return r.data;
  },
  buyStory: async (storySlug: string) => {
    const r = await api.post<{ success: boolean; coin_balance: number; unlocked_count: number; total_cost: number }>('coin/buy-story/', { story_slug: storySlug });
    return r.data;
  },
};

export interface StoryCommentData {
  id: number;
  story: number;
  story_slug: string;
  story_title: string;
  user: number;
  user_name: string;
  user_avatar: string;
  user_is_vip?: boolean;
  user_is_staff?: boolean;
  content: string;
  parent: number | null;
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
}

export interface ChapterCommentData {
  id: number;
  chapter: number;
  chapter_number: number;
  story_slug: string;
  story_title: string;
  user: number;
  user_name: string;
  user_avatar: string;
  user_is_vip?: boolean;
  user_is_staff?: boolean;
  content: string;
  parent: number | null;
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
}

export interface NotificationData {
  id: number;
  type: 'reply_comment' | 'vip_expiring' | 'vip_expired';
  is_read: boolean;
  data: {
    reply_user_name?: string;
    reply_user_avatar?: string;
    comment_content?: string;
    sticker_urls?: string[];
    story_slug?: string;
    story_title?: string;
    chapter_id?: number;
    chapter_number?: number;
    comment_id?: number;
  };
  created_at: string;
}

export interface GiftType {
  id: string;
  name: string;
  xu: number;
  tier: 'common' | 'rare' | 'legendary';
  emoji: string;
}

export interface DonationData {
  id: number;
  story: number;
  story_title: string;
  story_slug: string;
  user: number;
  user_name: string;
  user_avatar: string;
  gift_type: string;
  gift_name: string;
  xu_amount: number;
  created_at: string;
}

export interface DonationLeaderboardEntry {
  user_id: number;
  user_name: string;
  user_avatar: string;
  total_xu: number;
  donation_count: number;
}

export interface LeaderboardPage {
  count: number;
  page: number;
  page_size: number;
  results: DonationLeaderboardEntry[];
}

export interface DonationsPage {
  count: number;
  results: DonationData[];
}

export interface TopDonatedStory {
  story_id: number;
  story_slug: string;
  story_title: string;
  story_cover: string;
  total_xu: number;
  donation_count: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Comment listings carry a per-user `liked_by_me` flag, so a logged-in reader
// must send their token — publicApi strips it and the server would report every
// comment as un-liked.
function commentApi() {
  return localStorage.getItem('auth_token') ? api : publicApi;
}

export const CommentService = {
  getStoryComments: async (storySlug: string): Promise<StoryCommentData[]> => {
    const r = await commentApi().get<PaginatedResponse<StoryCommentData> | StoryCommentData[]>('story-comments/', {
      params: { story_slug: storySlug, page_size: 100 },
    });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  toggleStoryCommentLike: async (commentId: number): Promise<{ liked: boolean; like_count: number }> => {
    const r = await api.post(`story-comments/${commentId}/toggle-like/`);
    return r.data;
  },

  toggleChapterCommentLike: async (commentId: number): Promise<{ liked: boolean; like_count: number }> => {
    const r = await api.post(`chapter-comments/${commentId}/toggle-like/`);
    return r.data;
  },

  getRecentComments: async (limit = 50): Promise<StoryCommentData[]> => {
    const r = await publicApi.get<PaginatedResponse<StoryCommentData> | StoryCommentData[]>('story-comments/', {
      params: { page_size: limit },
    });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  postStoryComment: async (storyId: number, content: string, parentId?: number): Promise<StoryCommentData> => {
    const r = await api.post<StoryCommentData>('story-comments/', {
      story: storyId,
      content,
      ...(parentId ? { parent: parentId } : {}),
    });
    return r.data;
  },

  deleteStoryComment: async (commentId: number): Promise<void> => {
    await api.delete(`story-comments/${commentId}/`);
  },

  editStoryComment: async (commentId: number, content: string): Promise<StoryCommentData> => {
    const r = await api.patch<StoryCommentData>(`story-comments/${commentId}/`, { content });
    return r.data;
  },

  getRecentChapterComments: async (limit = 50): Promise<ChapterCommentData[]> => {
    const r = await commentApi().get<PaginatedResponse<ChapterCommentData> | ChapterCommentData[]>('chapter-comments/', {
      params: { page_size: limit },
    });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  getChapterComments: async (chapterId: number): Promise<ChapterCommentData[]> => {
    const r = await commentApi().get<PaginatedResponse<ChapterCommentData> | ChapterCommentData[]>('chapter-comments/', {
      params: { chapter_id: chapterId, page_size: 100 },
    });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  getChapterCommentsByStory: async (storySlug: string): Promise<ChapterCommentData[]> => {
    const r = await commentApi().get<PaginatedResponse<ChapterCommentData> | ChapterCommentData[]>('chapter-comments/', {
      params: { story_slug: storySlug, page_size: 100 },
    });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  postChapterComment: async (chapterId: number, content: string, parentId?: number): Promise<ChapterCommentData> => {
    const r = await api.post<ChapterCommentData>('chapter-comments/', {
      chapter: chapterId,
      content,
      ...(parentId ? { parent: parentId } : {}),
    });
    return r.data;
  },

  deleteChapterComment: async (commentId: number): Promise<void> => {
    await api.delete(`chapter-comments/${commentId}/`);
  },

  editChapterComment: async (commentId: number, content: string): Promise<ChapterCommentData> => {
    const r = await api.patch<ChapterCommentData>(`chapter-comments/${commentId}/`, { content });
    return r.data;
  },
};

export const NotificationService = {
  getNotifications: async (): Promise<NotificationData[]> => {
    const r = await api.get<PaginatedResponse<NotificationData> | NotificationData[]>('notifications/', {
      params: { page_size: 50 },
    });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  getUnreadCount: async (): Promise<number> => {
    const r = await api.get<{ count: number }>('notifications/unread-count/');
    return r.data.count;
  },

  markRead: async (id: number): Promise<void> => {
    await api.post(`notifications/${id}/mark-read/`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post('notifications/mark-all-read/');
  },

  deleteNotification: async (id: number): Promise<void> => {
    await api.delete(`notifications/${id}/`);
  },

  clearAll: async (): Promise<void> => {
    await api.delete('notifications/clear-all/');
  },
};

export const DonationService = {
  getGiftTypes: async (): Promise<GiftType[]> => {
    const r = await api.get<GiftType[]>('story-donations/gift-types/');
    return r.data;
  },

  donate: async (storySlug: string, giftTypeId: string): Promise<{ success: boolean; coin_balance: number; donation: { id: number; gift_name: string; xu_amount: number } }> => {
    const r = await api.post('story-donations/', { story_slug: storySlug, gift_type: giftTypeId });
    return r.data;
  },

  getDonations: async (params?: { story_slug?: string; month?: string; page?: number; page_size?: number }): Promise<DonationsPage> => {
    const r = await publicApi.get<PaginatedResponse<DonationData> | DonationData[]>('story-donations/', { params: { page_size: 20, ...params } });
    return Array.isArray(r.data) ? { count: r.data.length, results: r.data } : { count: r.data.count, results: r.data.results };
  },

  getLeaderboard: async (params?: { story_slug?: string; period?: 'today'; month?: string; page?: number; page_size?: number }): Promise<LeaderboardPage> => {
    const r = await publicApi.get<LeaderboardPage>('story-donations/leaderboard/', { params });
    return r.data;
  },

  getTopStories: async (period?: 'today' | 'week' | 'month' | 'all'): Promise<TopDonatedStory[]> => {
    const r = await publicApi.get<TopDonatedStory[]>('story-donations/top-stories/', { params: { period } });
    return r.data;
  },
};

export const StoryFollowService = {
  // Accepts a slug or a numeric id — story cards only have the latter.
  toggle: async (story: string | number): Promise<{ following: boolean; follow_count: number }> => {
    const payload = typeof story === 'number' ? { story_id: story } : { story_slug: story };
    const r = await api.post('story-follows/toggle/', payload);
    return r.data;
  },

  // Story ids the current user follows. The server is the source of truth —
  // the old localStorage scheme keyed entries by display name, so renaming
  // yourself orphaned every entry and the shelf looked empty.
  getMyFollows: async (): Promise<number[]> => {
    const r = await api.get<PaginatedResponse<{ story: number }> | { story: number }[]>(
      'story-follows/', { params: { page_size: 200 } }
    );
    const list = Array.isArray(r.data) ? r.data : r.data.results;
    const ids = list.map(f => f.story);

    // Story cards read their bookmark state from these keys, so refresh them
    // from the server — otherwise a story followed on another device shows an
    // empty bookmark here until it's toggled again.
    //
    // Deliberately does NOT dispatch followed-novels-updated: the followed
    // columns call this from their own event listener, so re-firing here would
    // loop them straight back into another fetch.
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user?.id) {
        const prefix = 'follow_novel_';
        const suffix = `_user_${user.id}`;
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(prefix) && key.endsWith(suffix)) localStorage.removeItem(key);
        }
        for (const id of ids) localStorage.setItem(`${prefix}${id}${suffix}`, '1');
      }
    } catch {}
    return ids;
  },

  // Returns whether the logged-in user already follows this story (scoped server-side to the current user)
  checkFollowing: async (storySlug: string): Promise<boolean> => {
    const r = await api.get<PaginatedResponse<{ id: number }> | { id: number }[]>('story-follows/', { params: { story_slug: storySlug } });
    const list = Array.isArray(r.data) ? r.data : r.data.results;
    return list.length > 0;
  },
};

export const ErrorReportService = {
  submit: async (chapterId: number, errorName: string, errorMessage: string) => {
    const r = await api.post('chapter-error-reports/', {
      chapter: chapterId,
      error_name: errorName,
      error_message: errorMessage,
    });
    return r.data;
  },
};

export interface ReadingProgressEntry {
  id: number;
  story: number;
  last_chapter: number;
  updated_at: string;
  last_chapter_number: number;
  last_chapter_title: string;
  story_title: string;
  story_slug: string;
  story_cover: string;
}

export const ReadingProgressService = {
  getAll: async (): Promise<ReadingProgressEntry[]> => {
    const r = await api.get<PaginatedResponse<ReadingProgressEntry> | ReadingProgressEntry[]>(
      'reading-progress/', { params: { page_size: 200 } }
    );
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  // Upserts server-side: one row per story, one request per chapter read.
  save: async (storyId: number, chapterId: number) => {
    await api.post('reading-progress/upsert/', { story: storyId, last_chapter: chapterId });
  },

  // Story ids for the "Lịch Sử Xem" widget, most-recently-read first.
  //
  // The server rows (one per story the reader has actually opened a chapter of)
  // are the durable source — they survive a cleared cache or a brand-new device
  // because they're tied to the account, not the browser. The local
  // `viewing_history` is only a fallback: it covers logged-out readers and
  // stories opened on the detail page but not yet read. We merge server first,
  // then any local-only ids, and write the result back so the list is instantly
  // there (and re-hydrated) on the next load.
  getHistoryStoryIds: async (): Promise<number[]> => {
    const readLocal = (): number[] => {
      try {
        const raw = JSON.parse(localStorage.getItem('viewing_history') || '[]');
        return (Array.isArray(raw) ? raw : [])
          .map((x: unknown) => Number(x))
          .filter((n: number) => !Number.isNaN(n));
      } catch { return []; }
    };

    if (!localStorage.getItem('auth_token')) return readLocal().slice(0, 15);

    try {
      const progress = await ReadingProgressService.getAll();
      const sorted = progress
        .slice()
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const serverIds = sorted.map(p => p.story).slice(0, 15);
      // Hydrate the per-story badge cache (keyed by story id, matching how the
      // sidebar reads it) from the server's chapter number — so "Đang đọc: C…"
      // is right even after a cleared cache, on a new device, or when the local
      // copy was written under the slug instead of the id.
      for (const p of sorted) {
        if (p.last_chapter_number) {
          localStorage.setItem(`reading_progress_${p.story}`, String(p.last_chapter_number));
        }
      }
      // For a signed-in reader the server is authoritative: reading a chapter
      // always upserts progress there. We deliberately do NOT fold in local-only
      // ids, so stories that were merely opened on the detail page (under the old
      // behavior, still lingering in localStorage) don't resurface. Mirror the
      // result locally for an instant render on the next load.
      localStorage.setItem('viewing_history', JSON.stringify(serverIds));
      return serverIds;
    } catch {
      return readLocal().slice(0, 15);
    }
  },
};

export const StoryRatingService = {
  rate: async (storySlug: string, rating: number): Promise<{ user_rating: number; rating_avg: number; rating_count: number }> => {
    const r = await api.post('story-ratings/rate/', { story_slug: storySlug, rating });
    return r.data;
  },

  getMyRating: async (storySlug: string): Promise<{ user_rating: number | null }> => {
    const r = await api.get('story-ratings/my-rating/', { params: { story_slug: storySlug } });
    return r.data;
  },
};
