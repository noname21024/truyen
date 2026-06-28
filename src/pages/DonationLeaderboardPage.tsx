import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { DonationService, type DonationLeaderboardEntry, type DonationData, type GiftType } from '@/lib/api';

const TIER_STYLE: Record<string, string> = {
  common:    'bg-surface-variant text-on-surface-variant border-outline-variant/40',
  rare:      'bg-blue-500/10 text-blue-600 border-blue-400/40',
  legendary: 'bg-amber-500/10 text-amber-600 border-amber-400/40',
};

const RANK_COLORS = ['text-amber-500', 'text-slate-400', 'text-orange-400'];

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatXu(n: number) {
  if (n >= 1000) return `${(n / 1000).toLocaleString('vi-VN')}K xu`;
  return `${n.toLocaleString('vi-VN')} xu`;
}

type Tab = 'month' | 'all' | 'gifts';

const DonationLeaderboardPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('month');
  const [leaderboardMonth, setLeaderboardMonth] = useState<DonationLeaderboardEntry[]>([]);
  const [leaderboardAll, setLeaderboardAll] = useState<DonationLeaderboardEntry[]>([]);
  const [recentDonations, setRecentDonations] = useState<DonationData[]>([]);
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = getCurrentMonth();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      DonationService.getLeaderboard({ month: currentMonth }),
      DonationService.getLeaderboard(),
      DonationService.getDonations(),
      DonationService.getGiftTypes(),
    ]).then(([lbMonth, lbAll, donations, gifts]) => {
      setLeaderboardMonth(lbMonth);
      setLeaderboardAll(lbAll);
      setRecentDonations(donations);
      setGiftTypes(gifts);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'month', label: 'Tháng này', icon: 'calendar_month' },
    { id: 'all',   label: 'Tất cả',    icon: 'leaderboard' },
    { id: 'gifts', label: 'Quà gần đây', icon: 'history' },
  ];

  const leaderboard = tab === 'month' ? leaderboardMonth : leaderboardAll;

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-on-surface flex items-center justify-center gap-2 mb-1">
          <ViconicIcon name="military_tech" size={28} className="text-amber-500 shrink-0" />
          Bảng Công Đức
        </h1>
        <p className="text-sm text-on-surface-variant">Vinh danh những người ủng hộ cộng đồng</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-variant/30 p-1 rounded-sm">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5 ${tab === t.id ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant/50'}`}
          >
            <ViconicIcon name={t.icon} size={14} className="shrink-0" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-on-surface-variant animate-pulse">Đang tải...</div>
      ) : (tab === 'month' || tab === 'all') ? (
        <div className="space-y-3">
          {leaderboard.length === 0 ? (
            <div className="py-16 text-center text-sm text-on-surface-variant">
              <ViconicIcon name="sentiment_dissatisfied" size={36} className="mx-auto mb-3 text-outline/50" />
              Chưa có ai ủng hộ {tab === 'month' ? 'tháng này' : ''}.
            </div>
          ) : leaderboard.map((entry, idx) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-4 p-4 rounded-sm border ${idx === 0 ? 'bg-amber-500/5 border-amber-400/30' : idx === 1 ? 'bg-slate-400/5 border-slate-300/30' : idx === 2 ? 'bg-orange-400/5 border-orange-300/30' : 'bg-surface border-outline-variant/30'}`}
            >
              {/* Rank */}
              <div className={`w-8 text-center font-black text-lg shrink-0 ${RANK_COLORS[idx] ?? 'text-on-surface-variant'}`}>
                {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
              </div>

              {/* Avatar */}
              <img
                src={entry.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.user_name}`}
                alt={entry.user_name}
                className="w-10 h-10 rounded-full object-cover border border-outline-variant/50 shrink-0"
              />

              {/* Name + donation count */}
              <div className="flex-grow min-w-0">
                <p className="font-bold text-sm text-on-surface truncate">{entry.user_name}</p>
                <p className="text-[11px] text-on-surface-variant">{entry.donation_count} lần ủng hộ</p>
              </div>

              {/* Total */}
              <div className="text-right shrink-0">
                <p className="font-black text-base text-primary">{formatXu(entry.total_xu)}</p>
              </div>
            </div>
          ))}

          {/* Recent donations feed */}
          {tab === 'month' && recentDonations.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-1.5">
                <ViconicIcon name="feed" size={16} className="text-primary shrink-0" />
                Hoạt động gần đây
              </h2>
              <div className="space-y-2">
                {recentDonations.slice(0, 15).map(d => (
                  <Link key={d.id} to={`/detail/${d.story_slug}`} className="flex items-center gap-3 p-3 rounded-sm border border-outline-variant/20 hover:bg-surface-variant/20 transition-colors group">
                    <img src={d.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${d.user_name}`} alt={d.user_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    <div className="flex-grow min-w-0 text-xs">
                      <span className="font-bold text-on-surface">{d.user_name}</span>
                      <span className="text-on-surface-variant"> đã tặng </span>
                      <span className="font-bold text-primary">{d.gift_name}</span>
                      <span className="text-on-surface-variant"> cho </span>
                      <span className="font-bold text-on-surface group-hover:text-primary transition-colors truncate">{d.story_title}</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant/60 shrink-0">{new Date(d.created_at).toLocaleDateString('vi-VN')}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Recent gifts tab */
        <div className="space-y-2">
          <p className="text-xs text-on-surface-variant mb-4">Những lượt góp lửa mới nhất trên toàn hệ thống.</p>
          {recentDonations.length === 0 ? (
            <div className="py-16 text-center text-sm text-on-surface-variant">
              <ViconicIcon name="card_giftcard" size={36} className="mx-auto mb-3 text-outline/50" />
              Chưa có quà nào được tặng.
            </div>
          ) : recentDonations.map(d => {
            const gift = giftTypes.find(g => g.id === d.gift_type);
            const tier = gift?.tier ?? 'common';
            return (
              <Link
                key={d.id}
                to={`/detail/${d.story_slug}`}
                className={`flex items-center gap-3 p-3 rounded-sm border transition-colors group ${TIER_STYLE[tier]} hover:opacity-80`}
              >
                {/* Gift icon */}
                <img
                  src={`/icons/donate/${
                    d.gift_type === 'tra_da' ? 'money-bag' :
                    d.gift_type === 'tich_ta_kiem' ? 'sword' :
                    d.gift_type === 'linh_dan' ? 'runes' :
                    d.gift_type === 'bi_kip' ? 'spell-book' :
                    d.gift_type === 'ngu_kiem' ? 'sword-fly' :
                    d.gift_type === 'than_thu' ? 'dragon' :
                    d.gift_type === 'dai_tran' ? 'freeze' :
                    d.gift_type === 'phi_thuyen' ? 'space' :
                    d.gift_type === 'chi_ton' ? 'throne' : 'money-bag'
                  }.png`}
                  alt={d.gift_name}
                  className={`object-contain shrink-0 ${tier === 'legendary' ? 'w-9 h-9' : tier === 'rare' ? 'w-8 h-8' : 'w-6 h-6'}`}
                />
                {/* User avatar */}
                <img src={d.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${d.user_name}`} alt={d.user_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                <div className="flex-grow min-w-0 text-xs">
                  <span className="font-bold text-on-surface">{d.user_name}</span>
                  <span className="opacity-70"> đã tặng </span>
                  <span className="font-bold">{d.gift_name}</span>
                  <span className="opacity-70"> cho </span>
                  <span className="font-bold group-hover:underline truncate">{d.story_title}</span>
                </div>
                <span className="text-[10px] opacity-50 shrink-0">{new Date(d.created_at).toLocaleDateString('vi-VN')}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DonationLeaderboardPage;
