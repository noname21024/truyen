import axios from 'axios';

// Base URL for the Django REST API
const API_BASE_URL = 'http://localhost:8000/api/';

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
  chapters: ChapterSummary[];
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
  // Get list of chapters for a novel slug
  getChapters: async (novelSlug: string) => {
    const response = await api.get<ChapterSummary[]>('chapters/', {
      params: { story: novelSlug },
    });
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
  getStoryPrice: async (storySlug: string) => {
    const r = await api.get<StoryPriceInfo>('coin/story-price/', { params: { story: storySlug } });
    return r.data;
  },
  buyStory: async (storySlug: string) => {
    const r = await api.post<{ success: boolean; coin_balance: number; unlocked_count: number; total_cost: number }>('coin/buy-story/', { story_slug: storySlug });
    return r.data;
  },
};
