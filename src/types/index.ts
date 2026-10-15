export type AccountType = 'provider' | 'client' | 'both';
export type ProviderStatus = 'pending' | 'approved' | 'rejected';
export type ListingStatus = 'pending' | 'published' | 'hidden' | 'rejected';
export type OrderStatus =
  | 'new' | 'pending_payment' | 'paid' | 'waiting_for_provider' | 'accepted' | 'in_progress' | 'provider_completed' | 'awaiting_customer_confirmation'
  | 'completed_by_customer' | 'protection_period' | 'completed' | 'cancelled' | 'disputed' | 'resolved' | 'confirmation_expired' | 'refunded';

export type PaymentStatus = 'not_connected' | 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'disputed' | 'cancelled';
export type CancelledBy = 'client' | 'provider' | 'admin';
export type DisputeStatus = 'open' | 'under_review' | 'resolved_customer' | 'resolved_provider' | 'resolved_partial';

export interface Profile {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  account_type: AccountType;
  is_admin: boolean;
  is_disabled: boolean;
  provider_verified: boolean;
  provider_status: ProviderStatus;
  bio: string | null;
  skills: string[];
  provider_earnings: number;
  pending_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon_name: string;
  sort_order: number;
  created_at: string;
}

export interface ServiceCatalogItem {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

export interface City {
  id: string;
  name: string;
  sort_order: number;
}

export interface Listing {
  id: string;
  provider_id: string;
  category_id: string;
  service_name: string;
  description: string | null;
  price: number;
  experience: string | null;
  city: string;
  status: ListingStatus;
  featured: boolean;
  rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  provider?: Profile;
  images?: ListingImage[];
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  sort_order: number;
}

export interface Dispute {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  details: string;
  evidence_urls: string[];
  status: DisputeStatus;
  admin_resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  listing_id: string;
  client_id: string;
  provider_id: string;
  status: OrderStatus;
  notes: string | null;
  service_price: number;
  customer_fee: number;
  provider_fee: number;
  customer_total: number;
  customer_commission_rate?: number | null;
  provider_commission_rate?: number | null;
  provider_net: number;
  mahra_revenue: number;
  currency: string;
  payment_status: PaymentStatus;
  payment_id: string | null;
  provider_completed_at: string | null;
  confirmation_deadline: string | null;
  confirmed_at: string | null;
  confirmed_by?: string | null;
  protection_period_start?: string | null;
  protection_period_end?: string | null;
  actual_payout_status?: string;
  cancelled_at: string | null;
  cancelled_by: CancelledBy | null;
  cancel_reason: string | null;
  completion_note: string | null;
  completion_evidence: string[];
  created_at: string;
  updated_at: string;
  // Joined fields
  listing?: Listing;
  client?: Profile;
  provider?: Profile;
  dispute?: Dispute;
}

export interface Review {
  id: string;
  listing_id: string;
  client_id: string;
  client_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string | null;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  listing?: Listing;
  user1?: Profile;
  user2?: Profile;
  lastMessage?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export type NotificationType = 'message' | 'order' | 'order_update' | 'admin_broadcast' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface HomepageSettings {
  id: number;
  hero_title: string;
  hero_description: string;
  hero_image_url: string | null;
  updated_at: string;
}

// Static data used for rendering before DB loads
export const CATEGORY_ICONS: Record<string, string> = {
  'التقنية والرقمية': 'Laptop',
  'الأعمال والإدارة': 'Briefcase',
  'المطاعم والضيافة': 'UtensilsCrossed',
  'الجمال والعناية': 'Sparkles',
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  'التقنية والرقمية': { bg: 'bg-blue-50', text: 'text-blue-700', gradient: 'from-blue-500 to-blue-600' },
  'الأعمال والإدارة': { bg: 'bg-amber-50', text: 'text-amber-700', gradient: 'from-amber-500 to-amber-600' },
  'المطاعم والضيافة': { bg: 'bg-orange-50', text: 'text-orange-700', gradient: 'from-orange-500 to-orange-600' },
  'الجمال والعناية': { bg: 'bg-pink-50', text: 'text-pink-700', gradient: 'from-pink-500 to-pink-600' },
};

export function getCategoryColor(name: string) {
  return CATEGORY_COLORS[name] || { bg: 'bg-slate-50', text: 'text-slate-700', gradient: 'from-slate-500 to-slate-600' };
}
