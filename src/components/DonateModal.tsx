import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { DonationService, type GiftType } from '@/lib/api';

// Icon mapping: gift id -> public path
const GIFT_ICON: Record<string, string> = {
  tra_da:       '/icons/donate/money-bag.png',
  tich_ta_kiem: '/icons/donate/sword.png',
  linh_dan:     '/icons/donate/runes.png',
  bi_kip:       '/icons/donate/spell-book.png',
  ngu_kiem:     '/icons/donate/sword-fly.png',
  than_thu:     '/icons/donate/dragon.png',
  dai_tran:     '/icons/donate/freeze.png',
  phi_thuyen:   '/icons/donate/space.png',
  chi_ton:      '/icons/donate/throne.png',
};

// Size by tier: common=small, rare=medium, legendary=large
const ICON_SIZE: Record<string, number> = {
  common:    28,
  rare:      36,
  legendary: 48,
};

const TIER_LABEL: Record<string, string> = {
  common:    'Phổ thông',
  rare:      'Cao cấp',
  legendary: 'Đại gia',
};

const TIER_BG: Record<string, string> = {
  common:    'bg-surface border-outline-variant/40 hover:border-primary/60',
  rare:      'bg-blue-500/5 border-blue-400/30 hover:border-blue-500/60',
  legendary: 'bg-amber-500/5 border-amber-400/30 hover:border-amber-500/70',
};

const TIER_SELECTED: Record<string, string> = {
  common:    'ring-2 ring-primary border-primary bg-primary/5',
  rare:      'ring-2 ring-blue-500 border-blue-500 bg-blue-500/10',
  legendary: 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/10',
};

const TIER_XU_COLOR: Record<string, string> = {
  common:    'text-on-surface',
  rare:      'text-blue-600 dark:text-blue-400',
  legendary: 'text-amber-600 dark:text-amber-400',
};

// Floating gift particle for TikTok-style animation
interface Particle {
  id: number;
  icon: string;
  x: number;
  size: number;
  duration: number;
  delay: number;
}

interface DonateModalProps {
  storySlug: string;
  storyTitle: string;
  coinBalance: number;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

const DonateModal: React.FC<DonateModalProps> = ({ storySlug, storyTitle, coinBalance, onClose, onSuccess }) => {
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [selected, setSelected] = useState<GiftType | null>(null);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const particleIdRef = useRef(0);

  useEffect(() => {
    DonationService.getGiftTypes()
      .then(gifts => { setGiftTypes(gifts); setSelected(gifts[0] ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const spawnParticles = useCallback((gift: GiftType) => {
    const icon = GIFT_ICON[gift.id] ?? GIFT_ICON['tra_da'];
    const count = gift.tier === 'legendary' ? 12 : gift.tier === 'rare' ? 8 : 5;
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: ++particleIdRef.current,
      icon,
      x: 30 + Math.random() * 40,  // % from left
      size: ICON_SIZE[gift.tier] * (0.7 + Math.random() * 0.6),
      duration: 1.2 + Math.random() * 1.2,
      delay: i * 80,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    // Cleanup after max duration
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 3000);
  }, []);

  const handleDonate = async () => {
    if (!selected || donating) return;
    if (coinBalance < selected.xu) return;
    setDonating(true);
    try {
      const res = await DonationService.donate(storySlug, selected.id);
      spawnParticles(selected);
      setSuccessMsg(`Đã tặng ${selected.emoji} ${selected.name}!`);
      onSuccess(res.coin_balance);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Đã có lỗi xảy ra';
      setSuccessMsg(`❌ ${msg}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setDonating(false);
    }
  };

  const canAfford = selected ? coinBalance >= selected.xu : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Floating particles (TikTok-style) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <img
            key={p.id}
            src={p.icon}
            alt=""
            style={{
              position: 'absolute',
              bottom: '40%',
              left: `${p.x}%`,
              width: p.size,
              height: p.size,
              animation: `donateFloat ${p.duration}s ease-out ${p.delay}ms forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 rounded-full text-sm font-bold shadow-lg animate-in fade-in zoom-in-90 duration-200 ${successMsg.startsWith('❌') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {successMsg}
        </div>
      )}

      {/* Modal panel */}
      <div className="relative z-10 w-full sm:max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
          <div>
            <h2 className="font-black text-base text-on-surface flex items-center gap-2">
              <ViconicIcon name="card_giftcard" size={18} className="text-amber-500 shrink-0" />
              Tặng quà ủng hộ
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5 truncate max-w-[280px]">{storyTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
              <ViconicIcon name="paid" size={13} className="shrink-0" />
              {coinBalance.toLocaleString('vi-VN')} xu
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors">
              <ViconicIcon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Gift grid */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-on-surface-variant animate-pulse">Đang tải...</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {giftTypes.map(gift => {
                const isSelected = selected?.id === gift.id;
                const iconSize = ICON_SIZE[gift.tier];
                return (
                  <button
                    key={gift.id}
                    onClick={() => setSelected(gift)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150 ${TIER_BG[gift.tier]} ${isSelected ? TIER_SELECTED[gift.tier] : ''}`}
                  >
                    <img
                      src={GIFT_ICON[gift.id]}
                      alt={gift.name}
                      width={iconSize}
                      height={iconSize}
                      className={`object-contain drop-shadow-sm transition-transform duration-150 ${isSelected ? 'scale-110' : ''}`}
                    />
                    <span className="text-[10px] font-bold text-on-surface text-center leading-tight line-clamp-2">{gift.name}</span>
                    <span className={`text-[10px] font-black ${TIER_XU_COLOR[gift.tier]}`}>
                      {gift.xu >= 1000 ? `${(gift.xu / 1000).toLocaleString('vi-VN')}K` : gift.xu.toLocaleString('vi-VN')} xu
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected gift preview + confirm */}
        {selected && (
          <div className="border-t border-outline-variant/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <img src={GIFT_ICON[selected.id]} alt={selected.name} width={ICON_SIZE[selected.tier]} height={ICON_SIZE[selected.tier]} className="object-contain" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-on-surface">{selected.emoji} {selected.name}</p>
                <p className="text-xs text-on-surface-variant">{TIER_LABEL[selected.tier]} · {selected.xu.toLocaleString('vi-VN')} xu</p>
              </div>
              {!canAfford && (
                <Link to="/coins" onClick={onClose} className="text-xs font-bold text-primary hover:underline">Nạp xu</Link>
              )}
            </div>
            <button
              onClick={handleDonate}
              disabled={donating || !canAfford}
              className={`w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
                canAfford
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/30'
                  : 'bg-surface-variant text-on-surface-variant cursor-not-allowed'
              }`}
            >
              {donating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : canAfford ? (
                <>
                  <ViconicIcon name="favorite" size={15} className="shrink-0" />
                  Tặng ngay · {selected.xu.toLocaleString('vi-VN')} xu
                </>
              ) : (
                <>
                  <ViconicIcon name="lock" size={15} className="shrink-0" />
                  Không đủ xu (thiếu {(selected.xu - coinBalance).toLocaleString('vi-VN')} xu)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* CSS keyframe for float animation */}
      <style>{`
        @keyframes donateFloat {
          0%   { opacity: 0; transform: translateY(0) scale(0.5) rotate(-10deg); }
          15%  { opacity: 1; transform: translateY(-40px) scale(1.1) rotate(5deg); }
          80%  { opacity: 0.8; transform: translateY(-200px) scale(0.9) rotate(-5deg); }
          100% { opacity: 0; transform: translateY(-280px) scale(0.7) rotate(10deg); }
        }
      `}</style>
    </div>
  );
};

export default DonateModal;
