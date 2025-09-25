import type { Timestamp } from "firebase/firestore";

export interface Classification {
  id: string;
  name: string;
}

export interface SecondaryClassification {
  id: string;
  name: string;
}

export interface DailySnapshot {
  id: string; // YYYY-MM-DD
  note_data?: { views: number; comments: number; likes: number; sales?: number; };
  x_preliminary_data?: { impressions: number; likes: number; replies: number; retweets: number; quotes: number; };
  x_confirmed_data?: { impressions: number; likes: number; engagements: number; };
}

export interface Article {
  id: string;
  title: string;
  url: string;
  publicationDate?: string;
  classificationId: string;
  secondaryClassificationId?: string;
  daily_snapshots: DailySnapshot[];
  note_views_change?: number;
  note_comments_change?: number;
  note_likes_change?: number;
  x_preliminary_impressions_change?: number;
  x_preliminary_likes_change?: number;
  x_preliminary_replies_change?: number;
  x_preliminary_retweets_change?: number;
  x_preliminary_quotes_change?: number;
  x_confirmed_impressions_change?: number;
  x_confirmed_likes_change?: number;
  x_confirmed_engagements_change?: number;
  totalXImpressions?: number;
  totalXLikes?: number;
  totalXReplies?: number;
  totalXRetweets?: number;
  totalXQuotes?: number;
  totalXEngagements?: number;
  isActive?: boolean; // ADDED
  [key: string]: any;
}

export interface Kpi {
  id: string;
  authorId: string;
  kpiName: string;
  expression: string;
  targetValue: number;
  createdAt: Timestamp;
}