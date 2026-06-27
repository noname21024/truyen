import axios from 'axios';

// Base URL for the Django REST API
const API_BASE_URL = 'http://localhost:8000/api/';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
