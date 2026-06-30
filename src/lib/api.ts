import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/';
const R2_BASE = 'https://pub-71585e468cd741989c43b01356ee9591.r2.dev';
export const CDN_BASE = 'https://cdn.pubnihtruyen.com';

function replaceR2(obj: unknown): unknown {
  if (typeof obj === 'string') return obj.replace(R2_BASE, CDN_BASE);
  if (Array.isArray(obj)) return obj.map(replaceR2);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, replaceR2(v)]));
  }
  return obj;
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

api.interceptors.response.use(response => {
  response.data = replaceR2(response.data);
  return response;
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
  genres: Category[];
  cover_url: string;
  background_thumbnail_url?: string | null;
  status: 'ONGOING' | 'COMPLETED' | 'PAUSED';
  is_vip: boolean;
  total_chapters: number;
  view_count: number;
  follow_count: number;
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
  genres: Category[];
  cover_url: string;
  background_thumbnail_url?: string | null;
  description: string;
  status: 'ONGOING' | 'COMPLETED' | 'PAUSED';
  is_vip: boolean;
  total_chapters: number;
  view_count: number;
  follow_count: number;
  created_at: string;
  updated_at: string;
  toc: ChapterToc[];
}

// Novel API services
export const NovelService = {
  // Get list of novels with optional filters (search title, category slug, author slug)
  getNovels: async (params?: { search?: string; category?: string; author?: string }) => {
    const apiParams: Record<string, string> = {};
    if (params?.search) apiParams.search = params.search;
    if (params?.category) apiParams.genre = params.category;
    if (params?.author) apiParams.author = params.author;
    const response = await api.get<NovelSummary[]>('stories/', { params: apiParams });
    return response.data;
  },

  // Get novel detail by its slug (e.g. 'tru-tien')
  getNovelDetail: async (slug: string) => {
    const response = await api.get<NovelDetail>(`stories/${slug}/`);
    return response.data;
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
    const response = await api.get<ChapterSummary[]>('chapters/', {
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
    const response = await api.get<PaginatedChapters | ChapterSummary[]>('chapters/', {
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
    const response = await api.get<ChapterDetail>(`chapters/${id}/`);
    return response.data;
  },

  // Get chapter detail by novel slug and chapter number
  getChapterByNumber: async (novelSlug: string, chapterNumber: number | string) => {
    const response = await api.get<ChapterDetail[]>('chapters/', {
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
    const response = await api.get<Category[]>('genres/');
    return response.data;
  },
};

// Author API services
export const AuthorService = {
  getAuthors: async () => {
    const response = await api.get<Author[]>('authors/');
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
  total_cost: number;
  free_up_to: number;
}

export const CoinService = {
  getPackages: async () => {
    const r = await api.get<CoinPackage[]>('coin/packages/');
    return r.data;
  },
  getBalance: async () => {
    const r = await api.get<{ coin_balance: number; is_vip: boolean; vip_expires_at: string | null }>('coin/balance/');
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
  content: string;
  parent: number | null;
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
  content: string;
  parent: number | null;
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

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const CommentService = {
  getStoryComments: async (storySlug: string): Promise<StoryCommentData[]> => {
    const r = await api.get<PaginatedResponse<StoryCommentData> | StoryCommentData[]>('story-comments/', {
      params: { story_slug: storySlug, page_size: 100 },
    });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  getRecentComments: async (limit = 50): Promise<StoryCommentData[]> => {
    const r = await api.get<PaginatedResponse<StoryCommentData> | StoryCommentData[]>('story-comments/', {
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
    const r = await api.get<PaginatedResponse<ChapterCommentData> | ChapterCommentData[]>('chapter-comments/', {
      params: { page_size: limit },
    });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  getChapterComments: async (chapterId: number): Promise<ChapterCommentData[]> => {
    const r = await api.get<PaginatedResponse<ChapterCommentData> | ChapterCommentData[]>('chapter-comments/', {
      params: { chapter_id: chapterId, page_size: 100 },
    });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  getChapterCommentsByStory: async (storySlug: string): Promise<ChapterCommentData[]> => {
    const r = await api.get<PaginatedResponse<ChapterCommentData> | ChapterCommentData[]>('chapter-comments/', {
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

  getDonations: async (params?: { story_slug?: string; month?: string }): Promise<DonationData[]> => {
    const r = await api.get<PaginatedResponse<DonationData> | DonationData[]>('story-donations/', { params: { ...params, page_size: 50 } });
    return Array.isArray(r.data) ? r.data : r.data.results;
  },

  getLeaderboard: async (params?: { story_slug?: string; month?: string }): Promise<DonationLeaderboardEntry[]> => {
    const r = await api.get<DonationLeaderboardEntry[]>('story-donations/leaderboard/', { params });
    return r.data;
  },
};
