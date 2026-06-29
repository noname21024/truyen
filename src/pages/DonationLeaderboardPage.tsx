import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { DonationService, type DonationLeaderboardEntry, type DonationData, type GiftType } from '@/lib/api';

const TIER_STYLE: Record<string, string> = {
  common:    'bg-slate-50/50 hover:bg-slate-50 dark:bg-[#121316]/20 dark:hover:bg-[#1c1d21]/20 border-outline-variant/35 text-on-surface-variant',
  rare:      'bg-blue-50/20 hover:bg-blue-50/30 dark:bg-blue-950/5 dark:hover:bg-blue-950/10 border-blue-200/40 text-blue-700 dark:text-blue-400',
  legendary: 'bg-amber-50/20 hover:bg-amber-50/30 dark:bg-amber-950/5 dark:hover:bg-amber-950/10 border-amber-250/50 text-amber-700 dark:text-amber-400 shadow-xs shadow-amber-500/5',
};


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
    <div className="max-w-[1300px] mx-auto px-6 md:px-12 pt-6 pb-16 w-full min-h-screen">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center text-xs opacity-75 mb-6 truncate">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">
            <Link className="hover:text-primary transition-colors flex items-center" to="/">
              <ViconicIcon name="home" size={14} className="mr-1 shrink-0" />
              Trang chủ
            </Link>
          </li>
          <li className="flex items-center font-bold">
            <ViconicIcon name="chevron_right" size={14} className="mx-1 opacity-50 shrink-0" />
            Bảng Công Đức
          </li>
        </ol>
      </nav>

      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent p-6 sm:p-8 mb-8 border border-amber-500/20 shadow-xs">
        <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display-lg text-2xl sm:text-3xl font-extrabold text-on-surface mb-2 flex items-center gap-2.5 truncate">
              <ViconicIcon name="military_tech" size={32} className="text-amber-500 shrink-0 animate-pulse" />
              <span>Bảng Công Đức</span>
            </h1>
            <p className="font-body-ui text-on-surface-variant text-xs sm:text-sm max-w-2xl opacity-90 leading-relaxed">
              Vinh danh những tấm lòng hảo tâm đã quyên góp ủng hộ dịch giả và cộng đồng Pub Nih Truyện. Mỗi ngọn lửa nhỏ thắp sáng hành trình lan tỏa những tác phẩm tuyệt vời.
            </p>
          </div>
          <Link
            to="/"
            className="md:self-center shrink-0 w-fit bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 px-5 rounded-xl border border-amber-500 shadow-sm shadow-amber-500/10 transition-all flex items-center gap-2 active:scale-95"
          >
            <ViconicIcon name="b3:cup-hot-fill" size={14} className="shrink-0" />
            <span>Donate Ủng Hộ Dịch Giả</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-variant/40 border border-outline-variant/30 rounded-xl p-1 mb-8 max-w-md font-label-bold text-xs select-none">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-center py-2 px-3 rounded-lg transition-colors font-bold flex items-center justify-center gap-1.5 ${
              tab === t.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'
            }`}
          >
            <ViconicIcon name={t.icon} size={14} className="shrink-0" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 sm:gap-6 py-4 px-5 border border-outline-variant/30 rounded-2xl bg-surface shadow-xs">
              <div className="w-10 h-10 bg-outline-variant/20 rounded-full shrink-0" />
              <div className="flex-grow space-y-2">
                <div className="h-4 bg-outline-variant/20 rounded w-1/3" />
                <div className="h-3 bg-outline-variant/20 rounded w-20" />
              </div>
              <div className="w-20 h-6 bg-outline-variant/20 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      ) : (tab === 'month' || tab === 'all') ? (
        <div className="space-y-6">
          {leaderboard.length === 0 ? (
            <div className="py-24 text-center text-sm text-on-surface-variant bg-surface border border-outline-variant/30 rounded-2xl">
              <ViconicIcon name="sentiment_dissatisfied" size={48} className="mx-auto mb-4 text-outline/40" />
              <p className="font-bold text-on-surface mb-1">Chưa có ai ủng hộ {tab === 'month' ? 'tháng này' : ''}</p>
              <p className="text-xs text-on-surface-variant">Hãy trở thành người đầu tiên ủng hộ dịch giả nhé!</p>
            </div>
          ) : (
            <>
              {/* Podium for top 3 (Desktop only) */}
              <div className="hidden md:flex justify-center items-end gap-8 my-12 max-w-4xl mx-auto bg-surface-variant/15 border border-outline-variant/30 rounded-2xl p-8 relative overflow-hidden backdrop-blur-xs shadow-xs">
                {/* Visual Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Rank 2 (Left) */}
                {leaderboard.length >= 2 && (
                  <div className="flex flex-col items-center w-52 shrink-0 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
                    <div className="relative mb-3.5">
                      <div className="w-16 h-16 rounded-full border-4 border-slate-305 bg-surface shadow-md overflow-hidden">
                        <img 
                          src={leaderboard[1].user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${leaderboard[1].user_name}`} 
                          alt={leaderboard[1].user_name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="absolute -top-2.5 -right-1.5 bg-slate-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow border border-white">
                        2
                      </div>
                    </div>
                    <span className="font-bold text-sm text-on-surface truncate max-w-full">{leaderboard[1].user_name}</span>
                    <span className="text-[10px] text-on-surface-variant mb-2">{leaderboard[1].donation_count} lần ủng hộ</span>
                    {/* Podium base */}
                    <div className="w-full bg-gradient-to-t from-slate-400/20 to-slate-400/10 border border-slate-350/40 rounded-t-xl h-24 flex flex-col justify-center items-center px-4 py-2 mt-2 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Bảng Bạc</span>
                      <span className="text-sm font-black text-slate-600 dark:text-slate-300 mt-1">{formatXu(leaderboard[1].total_xu)}</span>
                    </div>
                  </div>
                )}

                {/* Rank 1 (Middle) */}
                {leaderboard.length >= 1 && (
                  <div className="flex flex-col items-center w-56 shrink-0 z-10 animate-in fade-in slide-in-from-bottom duration-500">
                    <div className="relative mb-3.5">
                      {/* Golden Crown */}
                      <ViconicIcon name="u4:vip-crown-queen-1-bold" size={32} className="text-amber-500 drop-shadow absolute -top-7 left-1/2 -translate-x-1/2 transform -rotate-12 animate-bounce" />
                      <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-lg overflow-hidden">
                        <div className="w-full h-full rounded-full border-2 border-white bg-surface overflow-hidden">
                          <img 
                            src={leaderboard[0].user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${leaderboard[0].user_name}`} 
                            alt={leaderboard[0].user_name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-md border-2 border-white">
                        1
                      </div>
                    </div>
                    <span className="font-extrabold text-base text-on-surface truncate max-w-full flex items-center gap-1">
                      {leaderboard[0].user_name}
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium mb-2">{leaderboard[0].donation_count} lần ủng hộ</span>
                    {/* Podium base */}
                    <div className="w-full bg-gradient-to-t from-amber-500/20 to-amber-500/10 border border-amber-400/50 rounded-t-2xl h-32 flex flex-col justify-center items-center px-4 py-2 mt-2 shadow-sm relative overflow-hidden">
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-pulse" />
                      <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest">Bảng Vàng</span>
                      <span className="text-lg font-black text-primary mt-1">{formatXu(leaderboard[0].total_xu)}</span>
                    </div>
                  </div>
                )}

                {/* Rank 3 (Right) */}
                {leaderboard.length >= 3 && (
                  <div className="flex flex-col items-center w-52 shrink-0 animate-in fade-in slide-in-from-bottom duration-500 delay-200">
                    <div className="relative mb-3.5">
                      <div className="w-16 h-16 rounded-full border-4 border-orange-300 bg-surface shadow-md overflow-hidden">
                        <img 
                          src={leaderboard[2].user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${leaderboard[2].user_name}`} 
                          alt={leaderboard[2].user_name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="absolute -top-2.5 -right-1.5 bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow border border-white">
                        3
                      </div>
                    </div>
                    <span className="font-bold text-sm text-on-surface truncate max-w-full">{leaderboard[2].user_name}</span>
                    <span className="text-[10px] text-on-surface-variant mb-2">{leaderboard[2].donation_count} lần ủng hộ</span>
                    {/* Podium base */}
                    <div className="w-full bg-gradient-to-t from-orange-400/20 to-orange-400/10 border border-orange-300/40 rounded-t-lg h-20 flex flex-col justify-center items-center px-4 py-2 mt-2 shadow-xs">
                      <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">Bảng Đồng</span>
                      <span className="text-sm font-black text-orange-700 mt-1">{formatXu(leaderboard[2].total_xu)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ranks list */}
              <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;
                  
                  let cardBorder = "border-slate-100 dark:border-slate-800/40 hover:border-primary/20 hover:shadow-xs";
                  let cardBg = "bg-white dark:bg-[#121316]/30 hover:bg-slate-50/50 dark:hover:bg-[#1c1d21]/30";
                  let rankElement = null;

                  if (rank === 1) {
                    cardBorder = "border-amber-200/60 hover:border-amber-400/80 dark:border-amber-900/40 dark:hover:border-amber-500/80 shadow-xs";
                    cardBg = "bg-amber-50/5 hover:bg-amber-50/15 dark:bg-amber-950/5 dark:hover:bg-amber-950/10";
                    rankElement = (
                      <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                        <div className="w-full h-full rounded-full bg-white dark:bg-[#1c1d21] flex items-center justify-center">
                          <span className="text-base font-black bg-gradient-to-r from-red-500 via-yellow-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                            1
                          </span>
                        </div>
                      </div>
                    );
                  } else if (rank === 2) {
                    cardBorder = "border-slate-205 hover:border-slate-400/80 dark:border-slate-850 dark:hover:border-slate-700 shadow-xs";
                    cardBg = "bg-slate-50/5 hover:bg-slate-50/15 dark:bg-slate-900/5 dark:hover:bg-slate-900/10";
                    rankElement = (
                      <div className="w-10 h-10 rounded-full border-2 border-slate-300 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center shadow-xs">
                        <span className="text-sm font-black text-slate-600 dark:text-slate-350">
                          2
                        </span>
                      </div>
                    );
                  } else if (rank === 3) {
                    cardBorder = "border-orange-200/50 hover:border-orange-400/80 dark:border-orange-900/30 dark:hover:border-orange-500/80 shadow-xs";
                    cardBg = "bg-orange-50/5 hover:bg-orange-50/15 dark:bg-orange-950/5 dark:hover:bg-orange-950/10";
                    rankElement = (
                      <div className="w-10 h-10 rounded-full border-2 border-orange-300 bg-orange-50/55 dark:bg-orange-950/20 dark:border-orange-900/50 flex items-center justify-center shadow-xs">
                        <span className="text-sm font-black text-orange-700 dark:text-orange-500">
                          3
                        </span>
                      </div>
                    );
                  } else {
                    rankElement = (
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-450 flex items-center justify-center font-bold text-xs">
                        {rank}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-4 border rounded-2xl transition-all duration-300 group ${cardBg} ${cardBorder} ${isTop3 ? 'md:hidden' : ''}`}
                    >
                      {/* Rank */}
                      <div className="w-10 flex flex-col items-center justify-center shrink-0 select-none">
                        {rankElement}
                      </div>

                      {/* Avatar */}
                      <img
                        src={entry.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.user_name}`}
                        alt={entry.user_name}
                        className="w-11 h-11 rounded-full object-cover border border-outline-variant/40 shrink-0"
                      />

                      {/* Name + donation count */}
                      <div className="flex-grow min-w-0">
                        <p className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{entry.user_name}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">{entry.donation_count} lần ủng hộ</p>
                      </div>

                      {/* Total */}
                      <div className="text-right shrink-0">
                        <p className="font-black text-sm sm:text-base text-primary">{formatXu(entry.total_xu)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Recent donations feed */}
          {tab === 'month' && recentDonations.length > 0 && (
            <div className="mt-12 max-w-4xl mx-auto">
              <h2 className="text-base font-bold text-on-surface mb-5 flex items-center gap-2">
                <ViconicIcon name="feed" size={20} className="text-primary shrink-0" />
                Hoạt động gần đây
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentDonations.slice(0, 10).map(d => (
                  <Link 
                    key={d.id} 
                    to={`/detail/${d.story_slug}`} 
                    className="flex items-center gap-3 p-4 border border-outline-variant/20 hover:border-primary/20 bg-white/50 dark:bg-[#121316]/20 hover:bg-slate-50/50 dark:hover:bg-[#1c1d21]/20 rounded-2xl shadow-xs transition-all duration-300 group"
                  >
                    <img 
                      src={d.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${d.user_name}`} 
                      alt={d.user_name} 
                      className="w-8 h-8 rounded-full object-cover border border-outline-variant/40 shrink-0" 
                    />
                    <div className="flex-grow min-w-0 text-xs leading-normal">
                      <p className="truncate text-on-surface">
                        <span className="font-bold text-on-surface">{d.user_name}</span>
                        <span className="text-on-surface-variant"> đã tặng </span>
                        <span className="font-bold text-primary">{d.gift_name}</span>
                      </p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 truncate group-hover:text-primary transition-colors">
                        Cho: {d.story_title}
                      </p>
                    </div>
                    <span className="text-[9px] text-on-surface-variant/60 shrink-0 self-start mt-0.5">
                      {new Date(d.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Recent gifts tab */
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="bg-surface-variant/20 p-4 border border-outline-variant/20 rounded-2xl mb-2 flex items-center gap-2">
            <ViconicIcon name="info" size={16} className="text-primary shrink-0" />
            <p className="text-xs text-on-surface-variant font-medium">Những lượt quyên góp góp lửa mới nhất trên toàn hệ thống.</p>
          </div>
          
          {recentDonations.length === 0 ? (
            <div className="py-24 text-center text-sm text-on-surface-variant bg-surface border border-outline-variant/30 rounded-2xl">
              <ViconicIcon name="card_giftcard" size={48} className="mx-auto mb-4 text-outline/40" />
              <p className="font-bold text-on-surface mb-1">Chưa có quà nào được tặng</p>
              <p className="text-xs text-on-surface-variant font-medium">Hãy là người đầu tiên tiếp sức cho tác giả nhé!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {recentDonations.map(d => {
                const gift = giftTypes.find(g => g.id === d.gift_type);
                const tier = gift?.tier ?? 'common';
                return (
                  <Link
                    key={d.id}
                    to={`/detail/${d.story_slug}`}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${TIER_STYLE[tier]}`}
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
                      className={`object-contain shrink-0 ${tier === 'legendary' ? 'w-11 h-11 animate-pulse' : tier === 'rare' ? 'w-9 h-9' : 'w-8 h-8'}`}
                    />
                    {/* User avatar */}
                    <img 
                      src={d.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${d.user_name}`} 
                      alt={d.user_name} 
                      className="w-8 h-8 rounded-full object-cover border border-outline-variant/40 shrink-0" 
                    />
                    <div className="flex-grow min-w-0 text-xs sm:text-sm">
                      <span className="font-bold text-on-surface">{d.user_name}</span>
                      <span className="opacity-75"> đã tặng </span>
                      <span className="font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10 select-none">{d.gift_name}</span>
                      <span className="opacity-75"> cho truyện </span>
                      <span className="font-bold text-on-surface group-hover:text-primary transition-colors underline decoration-outline-variant underline-offset-4">{d.story_title}</span>
                    </div>
                    <span className="text-[10px] opacity-60 shrink-0">{new Date(d.created_at).toLocaleDateString('vi-VN')}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DonationLeaderboardPage;
