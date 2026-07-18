import React from 'react';
import type { LucideIcon } from 'lucide-react';
import * as Lucide from 'lucide-react';

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

// Maps Material-Symbols-style names or custom app names to Lucide icons
const ICON_MAP: Record<string, LucideIcon | React.ComponentType<any>> = {
  add_circle: Lucide.PlusCircle,
  admin_panel_settings: Lucide.ShieldCheck,
  arrow_back: Lucide.ArrowLeft,
  arrow_drop_down: Lucide.ChevronDown,
  arrow_forward: Lucide.ArrowRight,
  arrow_upward: Lucide.ArrowUp,
  auto_stories: Lucide.Library,
  autorenew: Lucide.RefreshCw,
  calendar_today: Lucide.Calendar,
  campaign: Lucide.Megaphone,
  cancel: Lucide.XCircle,
  card_giftcard: Lucide.Gift,
  category: Lucide.LayoutGrid,
  chat_bubble: Lucide.MessageCircle,
  check: Lucide.Check,
  check_circle: Lucide.CheckCircle,
  chevron_right: Lucide.ChevronRight,
  close: Lucide.X,
  comment: Lucide.MessageSquare,
  compare_arrows: Lucide.ArrowLeftRight,
  delete_sweep: Lucide.Trash2,
  edit: Lucide.Pencil,
  emoji_events: Lucide.Trophy,
  error: Lucide.AlertCircle,
  explore: Lucide.Compass,
  favorite: Lucide.Heart,
  feed: Lucide.Rss,
  filter_list: Lucide.ListFilter,
  format_list_bulleted: Lucide.List,
  format_size: Lucide.Type,
  forum: Lucide.MessagesSquare,
  forward: Lucide.Forward,
  history: Lucide.History,
  home: Lucide.Home,
  info: Lucide.Info,
  keyboard_arrow_down: Lucide.ChevronDown,
  local_fire_department: Lucide.Flame,
  lock: Lucide.Lock,
  lock_open: Lucide.LockOpen,
  login: Lucide.LogIn,
  logout: Lucide.LogOut,
  mail: Lucide.Mail,
  menu: Lucide.Menu,
  menu_book: Lucide.BookOpen,
  military_tech: Lucide.Award,
  more_horiz: Lucide.MoreHorizontal,
  notifications: Lucide.Bell,
  notifications_active: Lucide.BellRing,
  notifications_none: Lucide.BellOff,
  paid: Lucide.BadgeDollarSign,
  palette: Lucide.Palette,
  payments: Lucide.Wallet,
  person: Lucide.User,
  person_off: Lucide.UserX,
  play_arrow: Lucide.Play,
  policy: Lucide.FileText,
  qr_code: Lucide.QrCode,
  receipt_long: Lucide.Receipt,
  reply: Lucide.Reply,
  report: Lucide.Flag,
  schedule: Lucide.Clock,
  search: Lucide.Search,
  search_off: Lucide.SearchX,
  send: Lucide.Send,
  sentiment_dissatisfied: Lucide.Frown,
  sentiment_satisfied: Lucide.Smile,
  shopping_bag: Lucide.ShoppingBag,
  shopping_cart: Lucide.ShoppingCart,
  sort: Lucide.ArrowUpDown,
  toll: Lucide.Coins,
  trending_up: Lucide.TrendingUp,
  update: Lucide.RotateCw,
  visibility: Lucide.Eye,
  volunteer_activism: Lucide.HeartHandshake,
  warning: Lucide.AlertTriangle,
  workspace_premium: Lucide.Crown,

  // Genre/category overrides
  swords: Lucide.Swords,
  wand_stars: Lucide.Wand2,
  local_cafe: Lucide.Coffee,
  school: Lucide.GraduationCap,
  mystery: Lucide.Ghost,
  star_shine: Lucide.Sparkles,
  settings: Lucide.Settings,
  coronavirus: Lucide.Biohazard,
  inventory_2: Lucide.Package,
  today: Lucide.CalendarDays,
  calendar_month: Lucide.CalendarRange,
  leaderboard: Lucide.BarChart3,
  fire: Lucide.Flame,

  // Category and other overrides
  heart_broken: Lucide.HeartCrack,
  shield_person: Lucide.ShieldAlert,
  domain: Lucide.Building2,
  work: Lucide.Briefcase,
  pets: Lucide.PawPrint,
  location_city: Lucide.Building,
  grass: Lucide.Sprout,
  sports_esports: Lucide.Gamepad2,
  dark_mode: Lucide.Moon,
  sentiment_very_satisfied: Lucide.Laugh,
  door_front: Lucide.DoorOpen,
  science: Lucide.FlaskConical,
  wand_shine: Lucide.Sparkles,
  movie: Lucide.Film,
  ac_unit: Lucide.Snowflake,
  water_drop: Lucide.Droplet,
  self_improvement: Lucide.Flower2,
  medical_services: Lucide.Stethoscope,
  healing: Lucide.HeartPulse,
  crop_free: Lucide.Expand,
  tsunami: Lucide.Waves,

  // Social & custom mapped
  google_color: GoogleIcon,
  facebook_color: FacebookIcon,
  vip_crown_queen_1_bold: Lucide.Crown,
  tag_multiple_20_filled: Lucide.Tags,
  cup_hot_fill: Lucide.Coffee,
  coin: Lucide.Coins,
  bookmark_rounded: Lucide.Bookmark,
};

// Converts kebab-case, snake_case or spaces to PascalCase
const toPascalCase = (str: string): string => {
  return str
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
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
  const normalizedKey = key.replace(/-/g, '_');

  // 1. Try static mapping
  let Icon = ICON_MAP[normalizedKey];

  // 2. Try dynamic lookup from Lucide exports
  if (!Icon) {
    const pascalName = toPascalCase(key);
    const DynamicIcon = (Lucide as any)[pascalName];
    if (DynamicIcon) {
      Icon = DynamicIcon;
    }
  }

  // 3. Fallback to HelpCircle
  if (!Icon) {
    Icon = Lucide.HelpCircle;
  }

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


