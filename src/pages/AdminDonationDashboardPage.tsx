import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { DonationService, CoinService, type TopDonatedStory } from '@/lib/api';
import { showCustomAlert } from '@/lib/dialog';

type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  all: 'Tất cả',
};

function formatXu(n: number) {
  if (n >= 1000) return `${(n / 1000).toLocaleString('vi-VN')}K xu`;
  return `${n.toLocaleString('vi-VN')} xu`;
}

const AdminDonationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [stories, setStories] = useState<TopDonatedStory[]>([]);
  const [loading, setLoading] = useState(false);

  // Only staff accounts may view this dashboard
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (!saved) {
      showCustomAlert("Yêu cầu đăng nhập", "Vui lòng đăng nhập bằng tài khoản quản trị viên để truy cập trang này!", () => navigate('/'));
      setChecking(false);
      return;
    }
    let parsedUser: any;
    try {
      parsedUser = JSON.parse(saved);
    } catch {
      navigate('/');
      return;
    }

    CoinService.getBalance()
      .then(data => {
        const updated = { ...parsedUser, coin_balance: data.coin_balance, is_vip: data.is_vip, is_staff: data.is_staff };
        localStorage.setItem('user', JSON.stringify(updated));
        if (!data.is_staff) {
          showCustomAlert("Không có quyền truy cập", "Trang này chỉ dành cho quản trị viên.", () => navigate('/'));
          return;
        }
        setAuthorized(true);
      })
      .catch(() => {
        showCustomAlert("Lỗi xác thực", "Không thể xác minh quyền truy cập. Vui lòng thử lại.", () => navigate('/'));
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  // Load top donated stories whenever the period changes
  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    setLoading(true);
    DonationService.getTopStories(period)
      .then(data => { if (!cancelled) setStories(data); })
      .catch(() => { if (!cancelled) setStories([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authorized, period]);

  if (checking) {
    return (
      <div className="max-w-[1300px] mx-auto px-6 md:px-12 py-24 text-center text-sm text-on-surface-variant">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  if (!authorized) return null;

  const totalXu = stories.reduce((sum, s) => sum + s.total_xu, 0);
  const totalDonations = stories.reduce((sum, s) => sum + s.donation_count, 0);

  return (
    <div className="max-w-[1300px] mx-auto px-6 md:px-12 pt-6 pb-16 w-full min-h-screen">
      {/* Header */}
      <div className="mb-6 border-b border-outline-variant/50 pb-4">
        <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl text-on-surface mb-2 flex items-center gap-2">
          <ViconicIcon name="admin_panel_settings" size={24} className="text-primary shrink-0" />
          Truyện Được Ủng Hộ Nhiều Nhất
        </h1>
        <p className="font-body-ui text-on-surface-variant text-sm">
          Theo dõi truyện nhận được nhiều ủng hộ nhất theo ngày/tuần/tháng để ưu tiên cập nhật chương nhanh hơn. Chỉ quản trị viên mới xem được trang này.
        </p>
      </div>

      {/* Period tabs */}
      <div className="flex bg-surface-variant/40 border border-outline-variant/30 rounded-xl p-1 mb-6 max-w-xl font-label-bold text-xs select-none">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 text-center py-2 px-3 rounded-lg transition-colors font-bold ${
              period === p
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 max-w-2xl">
        <div className="bg-surface border border-outline-variant/40 rounded-xl p-4">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Truyện có ủng hộ</p>
          <p className="text-xl font-black text-on-surface">{stories.length}</p>
        </div>
        <div className="bg-surface border border-outline-variant/40 rounded-xl p-4">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tổng lượt ủng hộ</p>
          <p className="text-xl font-black text-on-surface">{totalDonations}</p>
        </div>
        <div className="bg-surface border border-outline-variant/40 rounded-xl p-4">
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Tổng xu nhận</p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400">{formatXu(totalXu)}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-surface border border-outline-variant/30 rounded-xl" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="py-24 text-center text-sm text-on-surface-variant bg-surface border border-outline-variant/30 rounded-2xl">
          <ViconicIcon name="local_fire_department" size={48} className="mx-auto mb-4 text-outline/40" />
          <p className="font-bold text-on-surface mb-1">
            Chưa có truyện nào được ủng hộ {PERIOD_LABELS[period].toLowerCase()}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-surface border border-outline-variant/30 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/30 text-left text-[10px] uppercase tracking-wider text-on-surface-variant">
                <th className="p-3 w-10">#</th>
                <th className="p-3">Truyện</th>
                <th className="p-3 text-right">Lượt ủng hộ</th>
                <th className="p-3 text-right">Tổng xu</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {stories.map((s, idx) => (
                <tr key={s.story_id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-variant/20 transition-colors">
                  <td className="p-3 font-bold text-on-surface-variant">{idx + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={s.story_cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover"}
                        alt={s.story_title}
                        className="w-8 h-11 object-cover rounded-sm border border-outline-variant/40 shrink-0"
                      />
                      <span className="font-bold text-on-surface line-clamp-1">{s.story_title}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right text-on-surface-variant">{s.donation_count}</td>
                  <td className="p-3 text-right font-black text-amber-600 dark:text-amber-400">{formatXu(s.total_xu)}</td>
                  <td className="p-3 text-right">
                    <Link to={`/detail/${s.story_slug}`} className="text-primary hover:underline text-xs font-bold">
                      Xem →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDonationDashboardPage;
