import React, { useState, useEffect, useRef } from 'react';
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

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  scaleY: number;
  wobbleSpeed: number;
  wobble: number;
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

interface CelebrationData {
  giftId: string;
  giftName: string;
  emoji: string;
  tier: 'common' | 'rare' | 'legendary';
  xu: number;
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
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]);

  useEffect(() => {
    DonationService.getGiftTypes()
      .then(gifts => { setGiftTypes(gifts); setSelected(gifts[0] ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const initConfetti = (tier: 'common' | 'rare' | 'legendary') => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    const width = canvas.width;
    const height = canvas.height;

    const count = tier === 'legendary' ? 220 : tier === 'rare' ? 120 : 60;
    const colors = [
      '#f59e0b', '#fb923c', '#ec4899', '#3b82f6', '#10b981', '#a855f7',
      '#ef4444', '#facc15', '#06b6d4', '#6366f1'
    ];

    const particles: ConfettiParticle[] = [];
    const sparkles: Sparkle[] = [];

    const sparkleCount = tier === 'legendary' ? 80 : tier === 'rare' ? 40 : 20;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      sparkles.push({
        x: width / 2,
        y: height * 0.45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: tier === 'legendary' ? '#facc15' : tier === 'rare' ? '#60a5fa' : '#34d399',
        size: 2 + Math.random() * 4,
        alpha: 1,
        decay: 0.01 + Math.random() * 0.015
      });
    }

    for (let i = 0; i < count; i++) {
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? 0 : width;
      const y = height * 0.9;
      
      const baseAngle = fromLeft ? -Math.PI / 4 : -Math.PI * 3 / 4;
      const angle = baseAngle + (Math.random() - 0.5) * 0.4;
      const speed = 16 + Math.random() * 18;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        scaleY: 1,
        wobbleSpeed: 0.04 + Math.random() * 0.08,
        wobble: Math.random() * Math.PI
      });
    }

    particlesRef.current = particles;
    sparklesRef.current = sparkles;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let active = false;

      particlesRef.current.forEach(p => {
        p.vy += 0.45;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;

        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;
        p.scaleY = Math.sin(p.wobble);

        if (p.y < canvas.height + 20 && p.x > -20 && p.x < canvas.width + 20) {
          active = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.scale(1, p.scaleY);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      sparklesRef.current.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;

        if (s.alpha > 0) {
          active = true;
          ctx.save();
          ctx.globalAlpha = s.alpha;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - s.size);
          ctx.lineTo(s.x + s.size / 2, s.y);
          ctx.lineTo(s.x, s.y + s.size);
          ctx.lineTo(s.x - s.size / 2, s.y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });

      if (active) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    render();
  };

  useEffect(() => {
    if (celebration) {
      const timer = setTimeout(() => {
        initConfetti(celebration.tier);
      }, 50);

      const dismissTimer = setTimeout(() => {
        setCelebration(null);
      }, 4000);

      const handleResize = () => {
        if (canvasRef.current) {
          canvasRef.current.width = window.innerWidth;
          canvasRef.current.height = window.innerHeight;
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(timer);
        clearTimeout(dismissTimer);
        window.removeEventListener('resize', handleResize);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [celebration]);

  const handleDonate = async () => {
    if (!selected || donating) return;
    if (coinBalance < selected.xu) return;
    setDonating(true);
    try {
      const res = await DonationService.donate(storySlug, selected.id);
      setErrorMsg('');
      setCelebration({
        giftId: selected.id,
        giftName: selected.name,
        emoji: selected.emoji,
        tier: selected.tier as 'common' | 'rare' | 'legendary',
        xu: selected.xu
      });
      onSuccess(res.coin_balance);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Đã có lỗi xảy ra';
      setErrorMsg(`❌ ${msg}`);
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setDonating(false);
    }
  };

  const canAfford = selected ? coinBalance >= selected.xu : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Error toast */}
      {errorMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 rounded-full text-sm font-bold shadow-lg animate-in fade-in zoom-in-90 duration-200 bg-red-500 text-white">
          {errorMsg}
        </div>
      )}

      {/* Fullscreen Celebration Overlay */}
      {celebration && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/50 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
          onClick={() => setCelebration(null)}
        >
          {/* Canvas for confetti */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          
          {/* Celebration Card */}
          <div 
            className={`celebration-card relative z-10 w-full max-w-sm mx-4 p-8 rounded-3xl border bg-surface text-on-surface text-center shadow-2xl transition-all ${
              celebration.tier === 'legendary'
                ? 'border-amber-500/40 shadow-amber-500/25'
                : celebration.tier === 'rare'
                ? 'border-blue-500/30 shadow-blue-500/15'
                : 'border-emerald-500/20 shadow-emerald-500/10'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gift image wrapper & glow */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-surface-variant/40 border border-outline-variant/20 p-4">
                {/* Vòng hào quang phía sau */}
                <div 
                  className={`celebration-glow ${
                    celebration.tier === 'legendary'
                      ? 'bg-[radial-gradient(circle,rgba(245,158,11,0.45)_0%,transparent_70%)]'
                      : celebration.tier === 'rare'
                      ? 'bg-[radial-gradient(circle,rgba(59,130,246,0.35)_0%,transparent_70%)]'
                      : 'bg-[radial-gradient(circle,rgba(16,185,129,0.3)_0%,transparent_70%)]'
                  }`}
                />
                
                <img 
                  src={GIFT_ICON[celebration.giftId] || GIFT_ICON['tra_da']} 
                  alt={celebration.giftName}
                  className="relative z-10 w-20 h-20 object-contain drop-shadow-md animate-bounce-slow"
                />
              </div>
            </div>

            {/* Success title */}
            <h3 className={`text-xl font-black mb-3 tracking-wider uppercase ${
              celebration.tier === 'legendary'
                ? 'bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_1px_4px_rgba(245,158,11,0.2)]'
                : celebration.tier === 'rare'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent'
                : 'text-emerald-500 dark:text-emerald-400'
            }`}>
              {celebration.tier === 'legendary' ? 'Chí Tôn Giáng Lâm! 👑' : celebration.tier === 'rare' ? 'Đại Hiệp Xuất Thủ! 🗡️' : 'Donate Thành Công! 🥤'}
            </h3>

            {/* Message */}
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              {celebration.tier === 'legendary' ? (
                <>Hào khí ngút trời! Xin cảm ơn chí tôn đại hiệp đã ban tặng món quà vô giá <span className="font-extrabold text-amber-500">{celebration.emoji} {celebration.giftName}</span> cho truyện!</>
              ) : celebration.tier === 'rare' ? (
                <>Tình nghĩa giang hồ sâu đậm! Cảm ơn đại hiệp đã hào phóng tặng <span className="font-extrabold text-blue-500">{celebration.emoji} {celebration.giftName}</span>!</>
              ) : (
                <>Cảm ơn tấm lòng vàng của đại hiệp đã khích lệ tác giả bằng <span className="font-bold text-emerald-400">{celebration.emoji} {celebration.giftName}</span>!</>
              )}
            </p>

            {/* Details */}
            <div className="flex items-center justify-between text-xs text-on-surface-variant bg-surface-variant/40 border border-outline-variant/20 rounded-2xl px-4 py-2.5">
              <span>Đã khấu trừ</span>
              <span className={`font-black flex items-center gap-1 ${
                celebration.tier === 'legendary' ? 'text-amber-600 dark:text-amber-400' : celebration.tier === 'rare' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                <ViconicIcon name="paid" size={13} className="shrink-0" />
                {celebration.xu} xu
              </span>
            </div>

            {/* Close button inside card */}
            <button 
              onClick={() => setCelebration(null)}
              className={`mt-6 w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${
                celebration.tier === 'legendary'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 shadow-md shadow-amber-500/20'
                  : celebration.tier === 'rare'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20'
              }`}
            >
              Tuyệt vời
            </button>
          </div>
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

      {/* CSS keyframe animations */}
      <style>{`
        .celebration-glow {
          position: absolute;
          inset: -20px;
          border-radius: 9999px;
          filter: blur(28px);
          opacity: 0.7;
          z-index: 0;
          pointer-events: none;
          animation: auraRotate 10s linear infinite;
        }

        .celebration-card {
          animation: successCardPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-bounce-slow {
          animation: bounceSlow 2.2s ease-in-out infinite;
        }

        @keyframes auraRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes successCardPop {
          0% { transform: scale(0.85); opacity: 0; }
          70% { transform: scale(1.02); }
          100% { transform: none; opacity: 1; }
        }

        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default DonateModal;
