import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  PlusCircle, ShieldCheck, ArrowLeft, ChevronDown, ArrowRight, ArrowUp,
  BookOpen, RefreshCw, Calendar, Megaphone, XCircle, Gift, LayoutGrid,
  MessageCircle, Check, CheckCircle, ChevronRight, X, MessageSquare,
  ArrowLeftRight, Trash2, Pencil, Trophy, AlertCircle, Compass, Heart,
  Rss, ListFilter, List, Type, MessagesSquare, Forward, History, Home,
  Info, Flame, Lock, LockOpen, LogIn, LogOut, Mail, Menu, Library, Award,
  MoreHorizontal, Bell, BellRing, BellOff, BadgeDollarSign, Palette,
  Wallet, User, UserX, Play, FileText, QrCode, Receipt, Reply, Flag,
  Clock, Search, SearchX, Send, Frown, Smile, ShoppingBag, ShoppingCart,
  ArrowUpDown, Coins, TrendingUp, RotateCw, Eye, HeartHandshake,
  AlertTriangle, Crown, HelpCircle,
  Swords, Wand2, Sparkles, Coffee, GraduationCap, Ghost, Settings,
  Biohazard, Package, CalendarDays, CalendarRange, BarChart3,
  // New icons for categories/fallbacks
  Bolt, Gavel, HeartOff, Building2, Briefcase, Castle, Dumbbell, PawPrint,
  Globe, Brain, Building, Sprout, Users, Gamepad2, Shield, Moon, Laugh,
  DoorOpen, Cloud, FlaskConical, Skull, Rocket, Video, Utensils, Baby,
  Map, Film, Snowflake, Droplet, Flower2, Infinity, Stethoscope, HeartPulse,
  Expand, Waves, Bookmark, Tags,
} from 'lucide-react';

// Custom SVG Icons for brand assets that are not present in Lucide
const GoogleIcon: React.FC<any> = ({ size = 20, className, style }) => (
  <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const FacebookIcon: React.FC<any> = ({ size = 20, className, style }) => (
  <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// Maps the Material-Symbols-style names used across the app (name or
// "m9:name") to a Lucide icon component — avoids depending on the external
// cdn.viconic.dev loader, which can hang for 20s+ on networks that block/
// throttle it and stall the whole page behind it.
const ICON_MAP: Record<string, LucideIcon | React.ComponentType<any>> = {
  add_circle: PlusCircle,
  admin_panel_settings: ShieldCheck,
  arrow_back: ArrowLeft,
  arrow_drop_down: ChevronDown,
  arrow_forward: ArrowRight,
  arrow_upward: ArrowUp,
  auto_stories: Library,
  autorenew: RefreshCw,
  calendar_today: Calendar,
  campaign: Megaphone,
  cancel: XCircle,
  card_giftcard: Gift,
  category: LayoutGrid,
  chat_bubble: MessageCircle,
  check: Check,
  check_circle: CheckCircle,
  chevron_right: ChevronRight,
  close: X,
  comment: MessageSquare,
  compare_arrows: ArrowLeftRight,
  delete_sweep: Trash2,
  edit: Pencil,
  emoji_events: Trophy,
  error: AlertCircle,
  explore: Compass,
  favorite: Heart,
  feed: Rss,
  filter_list: ListFilter,
  format_list_bulleted: List,
  format_size: Type,
  forum: MessagesSquare,
  forward: Forward,
  history: History,
  home: Home,
  info: Info,
  keyboard_arrow_down: ChevronDown,
  local_fire_department: Flame,
  lock: Lock,
  lock_open: LockOpen,
  login: LogIn,
  logout: LogOut,
  mail: Mail,
  menu: Menu,
  menu_book: BookOpen,
  military_tech: Award,
  more_horiz: MoreHorizontal,
  notifications: Bell,
  notifications_active: BellRing,
  notifications_none: BellOff,
  paid: BadgeDollarSign,
  palette: Palette,
  payments: Wallet,
  person: User,
  person_off: UserX,
  play_arrow: Play,
  policy: FileText,
  qr_code: QrCode,
  receipt_long: Receipt,
  reply: Reply,
  report: Flag,
  schedule: Clock,
  search: Search,
  search_off: SearchX,
  send: Send,
  sentiment_dissatisfied: Frown,
  sentiment_satisfied: Smile,
  shopping_bag: ShoppingBag,
  shopping_cart: ShoppingCart,
  sort: ArrowUpDown,
  toll: Coins,
  trending_up: TrendingUp,
  update: RotateCw,
  visibility: Eye,
  volunteer_activism: HeartHandshake,
  warning: AlertTriangle,
  workspace_premium: Crown,
  // Genre/category and donation-leaderboard icons — chosen client-side by
  // name (HomePage.tsx categories, DonationLeaderboardPage.tsx tabs), not
  // returned by the API, so these don't show up in a plain grep for
  // `ViconicIcon name="..."`.
  swords: Swords,
  wand_stars: Wand2,
  local_cafe: Coffee,
  school: GraduationCap,
  mystery: Ghost,
  star_shine: Sparkles,
  settings: Settings,
  coronavirus: Biohazard,
  inventory_2: Package,
  today: CalendarDays,
  calendar_month: CalendarRange,
  leaderboard: BarChart3,
  fire: Flame,

  // New keys based on CATEGORY_ICONS and other unmapped icons
  bolt: Bolt,
  gavel: Gavel,
  heart_broken: HeartOff,
  shield_person: ShieldCheck,
  domain: Building2,
  work: Briefcase,
  castle: Castle,
  fitness_center: Dumbbell,
  pets: PawPrint,
  public: Globe,
  psychology: Brain,
  location_city: Building,
  grass: Sprout,
  group: Users,
  sports_esports: Gamepad2,
  security: Shield,
  dark_mode: Moon,
  sentiment_very_satisfied: Laugh,
  door_front: DoorOpen,
  cloud: Cloud,
  science: FlaskConical,
  skull: Skull,
  wand_shine: Sparkles,
  rocket: Rocket,
  videocam: Video,
  restaurant: Utensils,
  woman: User,
  baby_changing_station: Baby,
  map: Map,
  movie: Film,
  ac_unit: Snowflake,
  water_drop: Droplet,
  self_improvement: Flower2,
  all_inclusive: Infinity,
  sports_martial_arts: Swords,
  medical_services: Stethoscope,
  healing: HeartPulse,
  crop_free: Expand,
  diversity_1: Users,
  tsunami: Waves,
  agriculture: Sprout,

  // Social & Prefixed custom mappings
  google_color: GoogleIcon,
  facebook_color: FacebookIcon,
  vip_crown_queen_1_bold: Crown,
  tag_multiple_20_filled: Tags,
  cup_hot_fill: Coffee,
  coin: Coins,
  bookmark_rounded: Bookmark,
};

interface ViconicIconProps {
  name: string;
  size?: string | number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ViconicIcon: React.FC<ViconicIconProps> = ({
  name,
  size,
  color,
  className,
  style,
}) => {
  // Strip a "m9:" (or any "prefix:") that older call sites still pass.
  const key = name.includes(':') ? name.split(':')[1] : name;
  const Icon = ICON_MAP[key.replace(/-/g, '_')] || HelpCircle;

  return (
    <Icon
      size={size}
      color={color}
      className={className}
      style={style}
    />
  );
};

export const BaseViconicIcon = ViconicIcon;
export default ViconicIcon;

