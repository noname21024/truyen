import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CoinService, type CoinPackage, type CoinDepositResult, type CoinTx } from '@/lib/api'
import ViconicIcon from '@/components/ui/ViconicIcon'
import { showCustomAlert, showCustomConfirm } from '@/lib/dialog'

const VND_FORMAT = new Intl.NumberFormat('vi-VN')
const VIP_PRICE = 49000

function formatVND(n: number) {
  return VND_FORMAT.format(n) + ' đ'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function useCountdown(expiresAt: string | null): string {
  const [display, setDisplay] = useState('')
  useEffect(() => {
    if (!expiresAt) { setDisplay(''); return }
    const target = new Date(expiresAt).getTime()
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setDisplay('00:00'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDisplay(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return display
}

export default function CoinPage() {
  const [user, setUser] = useState<any | null>(null)
  const [coinBalance, setCoinBalance] = useState(0)
  const [isVIPMember, setIsVIPMember] = useState(false)
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null)
  const [packages, setPackages] = useState<CoinPackage[]>([])
  const [transactions, setTransactions] = useState<CoinTx[]>([])
  const [loadingTxns, setLoadingTxns] = useState(false)
  const [selectedPkg, setSelectedPkg] = useState<CoinPackage | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [deposit, setDeposit] = useState<CoinDepositResult | null>(null)
  const [depositStatus, setDepositStatus] = useState<null | 'success' | 'expired' | 'cancelled'>(null)
  const [reporting, setReporting] = useState(false)
  const [reported, setReported] = useState(false)
  const [showVipNotification, setShowVipNotification] = useState(false)
  const [creatingDeposit, setCreatingDeposit] = useState(false)
  const [subscribingVIP, setSubscribingVIP] = useState(false)
  const [activeTab, setActiveTab] = useState<'coins' | 'vip'>('coins')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [expandedTxId, setExpandedTxId] = useState<number | null>(null)
  const [reportingTxId, setReportingTxId] = useState<number | null>(null)
  const [cancellingTxId, setCancellingTxId] = useState<number | null>(null)
  const [reportedTxIds, setReportedTxIds] = useState<Set<number>>(new Set())

  const countdown = useCountdown(deposit?.expires_at ?? null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Expiration calculation helper
  const getDaysRemaining = (expiryStr: string) => {
    if (!expiryStr) return 0;
    const expiryDate = new Date(expiryStr);
    const today = new Date();
    // Normalize dates to midnight to calculate pure day differences
    const expDateOnly = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = expDateOnly.getTime() - todayOnly.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = vipExpiresAt ? getDaysRemaining(vipExpiresAt) : 0;

  useEffect(() => {
    const saved = localStorage.getItem('user')
    if (saved) {
      try {
        const u = JSON.parse(saved)
        setUser(u)
        setCoinBalance(u.coin_balance ?? 0)
      } catch { }
    }
    CoinService.getPackages().then(setPackages).catch(() => { })

    // Restore pending deposit across page refresh
    const savedDeposit = localStorage.getItem('pending_deposit')
    if (savedDeposit) {
      try {
        const d = JSON.parse(savedDeposit) as CoinDepositResult
        if (d.expires_at && new Date(d.expires_at).getTime() > Date.now()) {
          setDeposit(d)
        } else {
          localStorage.removeItem('pending_deposit')
        }
      } catch {
        localStorage.removeItem('pending_deposit')
      }
    }
  }, [])

  useEffect(() => {
    if (!user) return
    CoinService.getBalance()
      .then(data => {
        setCoinBalance(data.coin_balance)
        setIsVIPMember(data.is_vip)
        setVipExpiresAt(data.vip_expires_at)
        try {
          const u = JSON.parse(localStorage.getItem('user') || '{}')
          u.coin_balance = data.coin_balance
          u.is_vip = data.is_vip
          localStorage.setItem('user', JSON.stringify(u))
          window.dispatchEvent(new Event('balance-updated'))
        } catch { }
      })
      .catch(() => { })
    setLoadingTxns(true)
    CoinService.getTransactions()
      .then(setTransactions)
      .catch(() => { })
      .finally(() => setLoadingTxns(false))
  }, [user])

  // Poll for deposit confirmation when QR is shown
  useEffect(() => {
    if (!deposit || depositStatus) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }

    const check = async () => {
      // Stop if expired
      if (deposit.expires_at && new Date(deposit.expires_at).getTime() < Date.now()) {
        setDepositStatus('expired')
        localStorage.removeItem('pending_deposit')
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        return
      }
      try {
        const txns = await CoinService.getTransactions()
        setTransactions(txns)
        const matched = txns.find(t => t.id === deposit.transaction_id)
        if (matched?.status === 'cancelled') {
          setDepositStatus('cancelled')
          localStorage.removeItem('pending_deposit')
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        } else if (matched?.status === 'completed') {
          setDepositStatus('success')
          localStorage.removeItem('pending_deposit')
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          // Refresh balance
          const bal = await CoinService.getBalance()
          setCoinBalance(bal.coin_balance)
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}')
            u.coin_balance = bal.coin_balance
            u.is_vip = bal.is_vip
            localStorage.setItem('user', JSON.stringify(u))
            window.dispatchEvent(new Event('balance-updated'))
          } catch { }
        }
      } catch { }
    }

    check()
    pollRef.current = setInterval(check, 5000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [deposit, depositStatus])

  const handleSelectPackage = (pkg: CoinPackage) => {
    setSelectedPkg(pkg)
    setIsCustom(false)
    setCustomAmount('')
    setDeposit(null)
    setDepositStatus(null)
    setReported(false)
    localStorage.removeItem('pending_deposit')
  }

  const handleSelectCustom = () => {
    setSelectedPkg(null)
    setIsCustom(true)
    setDeposit(null)
    setDepositStatus(null)
    setReported(false)
    localStorage.removeItem('pending_deposit')
  }

  const customAmountNum = parseInt(customAmount.replace(/\D/g, ''), 10) || 0
  const customAmountError: string | null =
    customAmount && customAmountNum < 5000 ? 'Tối thiểu 5.000 VND' :
      customAmount && customAmountNum % 1000 !== 0 ? 'Phải là bội số của 1.000 (vd: 5.000, 10.000, 50.000)' :
        customAmount && customAmountNum > 10_000_000 ? 'Tối đa 10.000.000 VND' :
          null

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 1500)
      })
      .catch(() => { })
  }

  const handleReportPayment = async () => {
    if (!deposit || reporting) return
    setReporting(true)
    try {
      await CoinService.reportPayment(deposit.transaction_id)
      setReported(true)
    } catch {
      showCustomAlert('Lỗi hệ thống', 'Không thể gửi thông báo đối soát. Vui lòng thử lại.')
    } finally {
      setReporting(false)
    }
  }

  const handleCancelActiveDeposit = async () => {
    if (!deposit || cancellingTxId !== null) return
    setCancellingTxId(deposit.transaction_id)
    try {
      await CoinService.cancelDeposit(deposit.transaction_id)
      setDeposit(null)
      setSelectedPkg(null)
      setDepositStatus(null)
      setReported(false)
      localStorage.removeItem('pending_deposit')
      setLoadingTxns(true)
      CoinService.getTransactions().then(setTransactions).catch(() => {}).finally(() => setLoadingTxns(false))
    } catch {
      showCustomAlert('Lỗi', 'Không thể hủy giao dịch. Vui lòng thử lại.')
    } finally {
      setCancellingTxId(null)
    }
  }

  const handleReportFromList = async (txId: number) => {
    if (reportingTxId !== null) return
    setReportingTxId(txId)
    try {
      await CoinService.reportPayment(txId)
      setReportedTxIds(prev => new Set([...prev, txId]))
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Không thể gửi thông báo. Vui lòng thử lại.'
      showCustomAlert('Lỗi', msg)
    } finally {
      setReportingTxId(null)
    }
  }

  const handleCancelFromList = async (txId: number) => {
    if (cancellingTxId !== null) return
    setCancellingTxId(txId)
    try {
      await CoinService.cancelDeposit(txId)
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'cancelled' as const } : t))
      setExpandedTxId(null)
      if (deposit?.transaction_id === txId) {
        setDeposit(null)
        setSelectedPkg(null)
        setDepositStatus(null)
        setReported(false)
        localStorage.removeItem('pending_deposit')
      }
    } catch {
      showCustomAlert('Lỗi', 'Không thể hủy giao dịch. Vui lòng thử lại.')
    } finally {
      setCancellingTxId(null)
    }
  }

  const handleCreateDeposit = async () => {
    if (!selectedPkg && !isCustom) return
    if (isCustom && (customAmountError || !customAmount)) return
    setCreatingDeposit(true)
    setDepositStatus(null)
    try {
      const result = isCustom
        ? await CoinService.createCustomDeposit(customAmountNum)
        : await CoinService.createDeposit(selectedPkg!.id)
      setDeposit(result)
      localStorage.setItem('pending_deposit', JSON.stringify(result))
      setLoadingTxns(true)
      CoinService.getTransactions()
        .then(setTransactions)
        .catch(() => { })
        .finally(() => setLoadingTxns(false))
    } catch {
      showCustomAlert('Lỗi giao dịch', 'Không thể tạo yêu cầu nạp tiền. Vui lòng thử lại.')
    } finally {
      setCreatingDeposit(false)
    }
  }

  const handleSubscribeVIP = async () => {
    if (coinBalance < VIP_PRICE) {
      showCustomAlert(
        'Số dư không đủ',
        `Số dư không đủ. Cần ${VIP_PRICE.toLocaleString('vi-VN')} xu, bạn có ${coinBalance.toLocaleString('vi-VN')} xu.\nHãy nạp thêm xu trước.`
      )
      setActiveTab('coins')
      return
    }

    showCustomConfirm(
      'Đăng ký Hội Viên VIP',
      `Bạn có chắc chắn muốn đăng ký hội viên VIP 30 ngày với ${VIP_PRICE.toLocaleString('vi-VN')} xu?`,
      async () => {
        setSubscribingVIP(true)
        try {
          const result = await CoinService.subscribeVIP()
          setCoinBalance(result.coin_balance)
          setIsVIPMember(true)
          setVipExpiresAt(result.vip_expires_at)
          setShowVipNotification(true)
          setTimeout(() => setShowVipNotification(false), 5000)
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}')
            u.coin_balance = result.coin_balance
            u.is_vip = true
            localStorage.setItem('user', JSON.stringify(u))
            window.dispatchEvent(new Event('balance-updated'))
          } catch { }
          setLoadingTxns(true)
          CoinService.getTransactions()
            .then(setTransactions)
            .catch(() => { })
            .finally(() => setLoadingTxns(false))
        } catch (err: any) {
          const msg = err?.response?.data?.error || 'Đăng ký thất bại. Vui lòng thử lại.'
          showCustomAlert('Lỗi đăng ký', msg)
        } finally {
          setSubscribingVIP(false)
        }
      },
      undefined,
      'u4:vip-crown-queen-1-bold'
    )
  }

  const txStatusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: 'Chờ xác nhận', color: 'text-amber-700 bg-amber-50 border border-amber-500/30' },
    completed: { label: 'Hoàn thành', color: 'text-emerald-700 bg-emerald-50 border border-emerald-500/30' },
    cancelled: { label: 'Đã hủy', color: 'text-red-600 bg-red-50 border border-red-500/30' },
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto pt-24 pb-20 px-6 text-center space-y-6">
        <div className="w-20 h-20 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-center mx-auto shadow-md">
          <ViconicIcon name="fehc:coin" size={38} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Ví Xu & VIP Pub Nih Truyện</h1>
          <p className="text-sm text-on-surface-variant">
            Hãy đăng nhập tài khoản để quản lý ví xu, mở khóa các chương truyện VIP đặc sắc và tham gia hội viên VIP.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-login-dialog'))}
            className="bg-primary text-on-primary hover:bg-primary/95 px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <ViconicIcon name="login" size={16} />
            <span>Đăng nhập ngay</span>
          </button>
          <Link
            to="/"
            className="bg-surface border border-outline-variant/30 text-on-surface hover:bg-surface-variant/20 px-6 py-3 rounded-xl font-bold text-sm transition-all"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-20 space-y-8 font-sans">
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">Ví Của Bạn</h1>
          <p className="text-sm text-on-surface-variant mt-1">Quản lý số dư xu, đăng ký hội viên VIP và theo dõi lịch sử giao dịch.</p>
        </div>
      </div>

      {/* Balance + VIP status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Balance Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-on-primary-fixed-variant p-6 text-white shadow-lg border border-primary/20">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/5 blur-xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-24 h-24 rounded-full bg-white/10 blur-lg pointer-events-none" />

          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wider uppercase text-white/70">Số dư khả dụng</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight">{coinBalance.toLocaleString('vi-VN')}</span>
                <span className="text-sm font-semibold opacity-85">xu</span>
              </div>
            </div>
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <ViconicIcon name="fehc:coin" size={26} className="text-amber-400" />
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-white/70">
            <div>1 xu = 1 VND</div>
            <div className="flex items-center gap-1">
              <ViconicIcon name="lock_open" size={13} />
              <span>Mở khóa được ~{Math.floor(coinBalance / 100)} chương</span>
            </div>
          </div>
        </div>

        {/* VIP Member Status Card */}
        {isVIPMember ? (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-neutral-900 via-stone-900 to-amber-950 p-6 text-white shadow-lg border border-amber-500/40 transition-all duration-300">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
            <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-amber-500/20">
              Active Member
            </div>

            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-wider uppercase text-amber-400/80">Thành Viên VIP</span>
                <div className="text-2xl font-black text-amber-100 tracking-tight">Đang Hoạt Động</div>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <ViconicIcon name="u4:vip-crown-queen-1-bold" size={26} className="text-amber-400" />
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-neutral-400">
              <div>Hết hạn: <span className="text-amber-400 font-bold">{vipExpiresAt ? formatDateShort(vipExpiresAt) : '--/--/----'}</span></div>
              <div className="flex items-center gap-1 text-emerald-400 font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Đọc không giới hạn
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-surface border border-outline-variant/30 p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-wider uppercase text-on-surface-variant/80">Thành Viên VIP</span>
                <div className="text-2xl font-black text-on-surface/85 tracking-tight">Chưa kích hoạt</div>
              </div>
              <div className="p-3 bg-surface-variant/40 rounded-xl text-on-surface-variant">
                <ViconicIcon name="u4:vip-crown-queen-1-bold" size={26} />
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-outline-variant/15 flex justify-between items-center text-xs text-on-surface-variant">
              <div>49.000 xu / 30 ngày</div>
              <button
                onClick={() => setActiveTab('vip')}
                className="text-primary hover:text-primary/80 font-bold flex items-center gap-1 group transition-colors"
              >
                <span>Khám phá quyền lợi</span>
                <ViconicIcon name="arrow_forward" size={14} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications & System Announcements Section */}
      <div className="bg-surface-variant/10 border border-outline-variant/30 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-sm text-on-surface flex items-center gap-2">
          <ViconicIcon name="notifications_active" size={18} className="text-primary" />
          <span>Thông Báo & Nhắc Nhở Hệ Thống</span>
        </h2>

        <div className="space-y-3.5">
          {/* Expiry / VIP alert notification */}
          {isVIPMember ? (
            daysRemaining <= 7 && daysRemaining > 0 ? (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
                <ViconicIcon name="warning" size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black text-amber-600 dark:text-amber-400 block mb-0.5">CẢNH BÁO HẾT HẠN VIP</strong>
                  Gói Hội Viên VIP của bạn chỉ còn lại <span className="font-extrabold">{daysRemaining} ngày</span> sử dụng (sẽ hết hạn vào ngày {vipExpiresAt ? formatDateShort(vipExpiresAt) : '--/--/----'}). Bạn hãy nhanh chóng gia hạn để tránh bị ngắt quãng quyền đọc không giới hạn và thu hồi khung viền cầu vồng.
                </div>
              </div>
            ) : daysRemaining <= 0 ? (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
                <ViconicIcon name="error" size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black text-red-600 dark:text-red-400 block mb-0.5">GÓI VIP HẾT HẠN</strong>
                  Gói Hội Viên VIP của bạn đã hết hạn. Hãy đăng ký gói mới để kích hoạt lại đặc quyền đọc không giới hạn và nhận lại viền avatar cầu vồng.
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                <ViconicIcon name="check_circle" size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black text-emerald-600 dark:text-emerald-400 block mb-0.5">HỘI VIÊN VIP ĐANG HOẠT ĐỘNG</strong>
                  Gói VIP của bạn còn hiệu lực <span className="font-extrabold">{daysRemaining} ngày</span> (đến hết ngày {vipExpiresAt ? formatDateShort(vipExpiresAt) : '--/--/----'}). Chúc bạn có những giây phút đọc truyện tuyệt vời nhất tại Pub Nih Truyện!
                </div>
              </div>
            )
          ) : (
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3 text-xs text-blue-800 dark:text-blue-300">
              <ViconicIcon name="info" size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-black text-blue-600 dark:text-blue-400 block mb-0.5">THƯ NGỎ VIP MEMBER</strong>
                Tài khoản của bạn hiện là Độc giả thường. Đăng ký VIP ngay hôm nay để tận hưởng đặc quyền đọc trọn bộ hơn 1000+ đầu truyện VIP không giới hạn, không quảng cáo và sở hữu ngay khung viền Avatar 5 màu cầu vồng sặc sỡ!
              </div>
            </div>
          )}

          {/* System Announcement 1 */}
          <div className="p-3.5 bg-surface-variant/20 border border-outline-variant/30 rounded-lg flex items-start gap-3 text-xs text-on-surface-variant">
            <ViconicIcon name="campaign" size={16} className="text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="font-black text-on-surface block mb-0.5">
                [28/06/2026] CẬP NHẬT CỔNG NẠP TIỀN QR CODE 24/7 TỰ ĐỘNG
              </strong>
              Kể từ hôm nay, Pub Nih Truyện chính thức ra mắt cổng quét mã QR tự động. Tất cả các giao dịch nạp tiền sẽ được xử lý và cộng xu vào tài khoản của bạn hoàn toàn tự động trong vòng 30 giây. Nếu gặp bất kỳ sự cố nào, xin vui lòng gửi phản hồi liên hệ với chúng tôi.
            </div>
          </div>

          {/* System Announcement 2 */}
          <div className="p-3.5 bg-surface-variant/20 border border-outline-variant/30 rounded-lg flex items-start gap-3 text-xs text-on-surface-variant">
            <ViconicIcon name="policy" size={16} className="text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="font-black text-on-surface block mb-0.5">
                [25/06/2026] CẬP NHẬT CHÍNH SÁCH ĐỌC CHƯƠNG VIP & ỦNG HỘ DỊCH GIẢ
              </strong>
              Để tri ân đóng góp của các dịch giả dịch truyện trên hệ thống, Pub Nih Truyện cam kết chuyển giao 70% doanh thu mở khóa chương VIP trực tiếp đến ví của dịch giả tương ứng. Đồng thời hội viên VIP sẽ được quyền truy cập đọc sớm từ 5 đến 10 chương truyện dịch mới nhất so với độc giả thường.
            </div>
          </div>
        </div>
      </div>

      {/* Pill-shaped Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-surface-variant/30 border border-outline-variant/20 rounded-full w-full max-w-md">
          <button
            onClick={() => setActiveTab('coins')}
            className={`flex-1 py-2.5 px-4 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'coins'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
              }`}
          >
            <ViconicIcon name="fehc:coin" size={16} />
            <span>Nạp Xu</span>
          </button>
          <button
            onClick={() => setActiveTab('vip')}
            className={`flex-1 py-2.5 px-4 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'vip'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
              }`}
          >
            <ViconicIcon name="u4:vip-crown-queen-1-bold" size={16} />
            <span>Hội viên VIP</span>
          </button>
        </div>
      </div>

      {/* Tab: Nạp xu */}
      {activeTab === 'coins' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
                <ViconicIcon name="shopping_cart" size={18} className="text-primary" />
                <span>Chọn gói nạp xu</span>
              </h2>
              <span className="text-xs text-on-surface-variant bg-surface-variant/30 px-3 py-1 rounded-full border border-outline-variant/10">
                Tỉ lệ: 1 xu = 1 VND
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {packages.map(pkg => {
                const isSelected = selectedPkg?.id === pkg.id;
                const isPopular = pkg.price === 50000 || pkg.price === 100000;

                return (
                  <button
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    className={`group relative flex flex-col items-center p-5 rounded-xl border transition-all duration-300 text-center ${isSelected
                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                        : isPopular
                          ? 'border-amber-400 bg-amber-500/5 hover:border-primary/50 hover:bg-surface-variant/10'
                          : 'border-outline-variant/40 hover:border-primary/50 hover:bg-surface-variant/10'
                      }`}
                  >
                    {pkg.discount > 0 && (
                      <span className="absolute -top-2.5 -right-1 bg-red-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                        -{pkg.discount}%
                      </span>
                    )}

                    {isPopular && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-neutral-950 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-sm tracking-wider uppercase whitespace-nowrap">
                        Khuyên Dùng
                      </span>
                    )}

                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'bg-surface-variant/40 text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'
                      }`}>
                      <ViconicIcon name="fehc:coin" size={24} />
                    </div>

                    <span className="font-black text-xl text-primary">{pkg.label}</span>

                    <div className="flex flex-col items-center mt-1">
                      <span className="font-bold text-sm text-on-surface">{formatVND(pkg.price)}</span>
                      {pkg.original_price > pkg.price && (
                        <span className="text-[10px] text-on-surface-variant line-through opacity-70">
                          {formatVND(pkg.original_price)}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-outline-variant/20 w-full text-[11px] font-bold text-on-surface-variant">
                      Đọc ~{Math.floor(pkg.coins / 100)} chương VIP
                    </div>

                    {isSelected && (
                      <div className="absolute bottom-2 right-2 text-primary">
                        <ViconicIcon name="check_circle" size={16} />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Custom amount card */}
              <button
                onClick={handleSelectCustom}
                className={`group relative flex flex-col items-center p-5 rounded-xl border transition-all duration-300 text-center ${isCustom
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                    : 'border-dashed border-outline-variant/60 hover:border-primary/50 hover:bg-surface-variant/10'
                  }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${isCustom ? 'bg-primary/10 text-primary' : 'bg-surface-variant/40 text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'
                  }`}>
                  <ViconicIcon name="edit" size={24} />
                </div>
                <span className="font-black text-xl text-primary">Tùy chọn</span>
                <span className="font-bold text-sm text-on-surface mt-1">Nhập số tiền</span>
                <div className="mt-3 pt-2.5 border-t border-outline-variant/20 w-full text-[11px] font-bold text-on-surface-variant">
                  Bội số 1.000 VND
                </div>
                {isCustom && (
                  <div className="absolute bottom-2 right-2 text-primary">
                    <ViconicIcon name="check_circle" size={16} />
                  </div>
                )}
              </button>
            </div>

            {/* Custom amount input */}
            {isCustom && !deposit && (
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl space-y-3 animate-in fade-in duration-200">
                <p className="text-sm font-semibold">
                  Nhập số tiền <span className="text-on-surface-variant font-normal">(VND, bội số 1.000, tối thiểu 5.000)</span>
                </p>
                <div className="space-y-1.5 w-full">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      min={5000}
                      step={1000}
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="Ví dụ: 50000"
                      className="flex-grow px-4 py-3 rounded-xl border border-outline-variant/40 bg-surface text-on-surface font-bold text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleCreateDeposit}
                      disabled={creatingDeposit || !!customAmountError || !customAmount}
                      className="w-full sm:w-auto bg-primary text-on-primary hover:bg-primary/95 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 shrink-0"
                    >
                      {creatingDeposit ? (
                        <><span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />Đang tạo...</>
                      ) : (
                        <><ViconicIcon name="qr_code" size={16} />Tạo QR</>
                      )}
                    </button>
                  </div>
                  {customAmountError ? (
                    <p className="text-xs text-red-500 font-bold mt-0.5">{customAmountError}</p>
                  ) : customAmountNum >= 5000 ? (
                    <p className="text-xs text-emerald-600 font-bold mt-0.5">
                      = {customAmountNum.toLocaleString('vi-VN')} xu · đọc ~{Math.floor(customAmountNum / 100)} chương VIP
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {selectedPkg && !deposit && (
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
                <div>
                  <p className="text-sm font-semibold">
                    Gói đã chọn: <span className="text-primary font-black">{selectedPkg.label}</span>
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Số tiền thanh toán: <strong className="text-on-surface">{formatVND(selectedPkg.price)}</strong>
                    {selectedPkg.original_price > selectedPkg.price && (
                      <span className="text-red-500 font-bold ml-2">
                        (Tiết kiệm {formatVND(selectedPkg.original_price - selectedPkg.price)})
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleCreateDeposit}
                  disabled={creatingDeposit}
                  className="w-full sm:w-auto bg-primary text-on-primary hover:bg-primary/95 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60"
                >
                  {creatingDeposit ? (
                    <><span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Đang tạo...</>
                  ) : (
                    <><ViconicIcon name="qr_code" size={16} />Tạo lệnh chuyển khoản</>
                  )}
                </button>
              </div>
            )}
          </section>

          {/* Payment Status Banners */}
          {deposit && depositStatus === 'success' && (
            <section className="p-8 border border-emerald-250 bg-emerald-50/40 rounded-xl text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <ViconicIcon name="check_circle" size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-2xl text-emerald-800">Nạp xu thành công!</h3>
                <p className="text-emerald-700 text-sm">
                  Giao dịch nạp <strong className="text-lg font-black">{deposit.coins.toLocaleString('vi-VN')} xu</strong> đã được cộng vào tài khoản.
                </p>
                <p className="text-emerald-600 text-xs font-semibold">
                  Số dư hiện tại: {coinBalance.toLocaleString('vi-VN')} xu
                </p>
              </div>
              <button
                onClick={() => { setDeposit(null); setSelectedPkg(null); setDepositStatus(null); localStorage.removeItem('pending_deposit') }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
              >
                Tiếp tục nạp xu
              </button>
            </section>
          )}

          {deposit && depositStatus === 'expired' && (
            <section className="p-8 border border-red-200/50 bg-red-50/40 rounded-xl text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-red-500 text-white rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                <ViconicIcon name="error" size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xl text-red-800">Mã giao dịch đã hết hạn</h3>
                <p className="text-red-700 text-sm">
                  Thời gian chờ thanh toán đã trôi qua. Nếu bạn đã chuyển khoản, hãy liên hệ Admin để được hỗ trợ.
                </p>
              </div>
              <button
                onClick={() => { setDeposit(null); setSelectedPkg(null); setDepositStatus(null); setReported(false); localStorage.removeItem('pending_deposit') }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
              >
                Tạo lệnh mới
              </button>
            </section>
          )}

          {deposit && depositStatus === 'cancelled' && (
            <section className="p-8 border border-red-200/50 bg-red-50/40 rounded-xl text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-red-500 text-white rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                <ViconicIcon name="cancel" size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xl text-red-800">Giao dịch đã bị từ chối</h3>
                <p className="text-red-700 text-sm">
                  Yêu cầu nạp xu này đã bị từ chối bởi hệ thống hoặc quản trị viên. Nếu bạn đã chuyển khoản, hãy liên hệ Admin.
                </p>
              </div>
              <button
                onClick={() => { setDeposit(null); setSelectedPkg(null); setDepositStatus(null); setReported(false); localStorage.removeItem('pending_deposit') }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
              >
                Tạo lệnh mới
              </button>
            </section>
          )}

          {/* Pending Deposit QR Card */}
          {deposit && !depositStatus && (
            <section className="p-6 border border-emerald-200/40 bg-emerald-50/10 rounded-xl space-y-6 animate-in fade-in duration-300 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/5">
                    <ViconicIcon name="qr_code" size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-emerald-900">Thông tin chuyển khoản</h3>
                    <p className="text-xs text-on-surface-variant">Thực hiện chuyển khoản theo các thông tin bên dưới</p>
                  </div>
                </div>
                {countdown && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono tabular-nums shadow-sm border ${countdown <= '03:00'
                      ? 'bg-red-50 text-red-600 border-red-200/60 animate-pulse'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    }`}>
                    <span>⏱ Hết hạn sau:</span>
                    <span>{countdown}</span>
                  </div>
                )}
              </div>

              {/* Numbered Flow Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-white border border-emerald-100/60 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">1</span>
                  <span className="text-on-surface font-semibold">Quét mã QR bằng App ngân hàng</span>
                </div>
                <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-emerald-100/60 pt-2 sm:pt-0 sm:pl-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">2</span>
                  <span className="text-on-surface font-semibold">Kiểm tra Số tiền & Nội dung chính xác</span>
                </div>
                <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-emerald-100/60 pt-2 sm:pt-0 sm:pl-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">3</span>
                  <span className="text-on-surface font-semibold">Hệ thống đối soát cộng xu tự động</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* QR Code column */}
                <div className="md:col-span-4 flex flex-col items-center">
                  <div className="relative p-2.5 rounded-xl bg-white border border-emerald-200/60 shadow-sm overflow-hidden">
                    <img
                      src={deposit.qr_url}
                      alt="VietQR"
                      width={200}
                      height={200}
                      className="block rounded-lg"
                    />
                    {countdown <= '03:00' && (
                      <div className="absolute inset-0 bg-black/5 pointer-events-none border-2 border-red-500/50 rounded-xl animate-pulse" />
                    )}
                  </div>
                  <p className="text-[10px] text-center text-on-surface-variant mt-2 max-w-[200px]">
                    Quét bằng app ngân hàng của bạn. Nội dung và số tiền sẽ được điền tự động.
                  </p>
                </div>

                {/* Details column */}
                <div className="md:col-span-8 space-y-3">
                  {/* Coins received */}
                  <div className="flex items-center justify-between p-3 bg-white border border-emerald-100/60 rounded-xl text-sm shadow-sm">
                    <span className="text-on-surface-variant font-medium">Số xu nhận</span>
                    <span className="font-black text-primary text-base">{deposit.coins.toLocaleString('vi-VN')} xu</span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between p-3 bg-white border border-emerald-100/60 rounded-xl text-sm shadow-sm">
                    <span className="text-on-surface-variant font-medium">Số tiền chuyển khoản</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-on-surface">{formatVND(deposit.vnd_amount)}</span>
                      <button
                        onClick={() => handleCopy(deposit.vnd_amount.toString(), 'amount')}
                        className="p-1.5 hover:bg-surface-variant/40 rounded-lg transition-colors text-on-surface-variant"
                        title="Sao chép số tiền"
                      >
                        <ViconicIcon name={copiedField === 'amount' ? 'check' : 'content_copy'} size={14} className={copiedField === 'amount' ? 'text-emerald-600' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Account number */}
                  {deposit.account_number && (
                    <div className="flex items-center justify-between p-3 bg-white border border-emerald-100/60 rounded-xl text-sm shadow-sm">
                      <span className="text-on-surface-variant font-medium">Số tài khoản</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-on-surface">{deposit.account_number}</span>
                        <button
                          onClick={() => handleCopy(deposit.account_number!, 'account')}
                          className="p-1.5 hover:bg-surface-variant/40 rounded-lg transition-colors text-on-surface-variant"
                          title="Sao chép số tài khoản"
                        >
                          <ViconicIcon name={copiedField === 'account' ? 'check' : 'content_copy'} size={14} className={copiedField === 'account' ? 'text-emerald-600' : ''} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Account name */}
                  {deposit.account_name && (
                    <div className="flex items-center justify-between p-3 bg-white border border-emerald-100/60 rounded-xl text-sm shadow-sm">
                      <span className="text-on-surface-variant font-medium">Chủ tài khoản</span>
                      <span className="font-bold text-on-surface">{deposit.account_name}</span>
                    </div>
                  )}

                  {/* Description note */}
                  <div className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-sm shadow-sm">
                    <span className="text-amber-800 font-bold">Nội dung CK bắt buộc</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-955 select-all">{deposit.description}</span>
                      <button
                        onClick={() => handleCopy(deposit.description, 'desc')}
                        className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors text-amber-800"
                        title="Sao chép nội dung chuyển khoản"
                      >
                        <ViconicIcon name={copiedField === 'desc' ? 'check' : 'content_copy'} size={14} className={copiedField === 'desc' ? 'text-emerald-600' : ''} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-550/5 rounded-xl border border-amber-500/20 text-[11px] text-amber-900 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <ViconicIcon name="warning" size={13} className="text-amber-600 shrink-0" />
                      <span>Lưu ý đặc biệt:</span>
                    </p>
                    <p>• Nhập <strong>đúng nội dung chuyển khoản</strong> ở trên để hệ thống tự động đối soát và cộng xu trong 1 - 2 phút.</p>
                  </div>

                  {/* Report action button */}
                  {!reported ? (
                    <button
                      onClick={handleReportPayment}
                      disabled={reporting}
                      className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-60"
                    >
                      {reporting ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang đối soát...</>
                      ) : (
                        <><ViconicIcon name="check_circle" size={16} />Tôi đã chuyển khoản thành công</>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2.5 w-full bg-emerald-50 border border-emerald-250 text-emerald-800 py-3.5 px-4 rounded-xl text-sm font-bold shadow-inner">
                      <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      Đã gửi thông báo đối soát — vui lòng kiểm tra ví sau ít phút...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => { setDeposit(null); setSelectedPkg(null); setDepositStatus(null); setReported(false); localStorage.removeItem('pending_deposit') }}
                  className="text-xs text-on-surface-variant hover:text-primary hover:underline transition-colors"
                >
                  ← Chọn gói nạp khác
                </button>
                <button
                  onClick={handleCancelActiveDeposit}
                  disabled={cancellingTxId !== null}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors disabled:opacity-60"
                >
                  {cancellingTxId !== null ? 'Đang hủy...' : 'Hủy mã QR này'}
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab: VIP membership */}
      {activeTab === 'vip' && (
        <section className="space-y-6 animate-in fade-in duration-300">
          <div className="relative overflow-hidden border border-amber-300/60 bg-gradient-to-br from-amber-500/5 to-amber-600/10 rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/10">
                    <ViconicIcon name="u4:vip-crown-queen-1-bold" size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-amber-900">Quyền Lợi Hội Viên VIP</h3>
                    <p className="text-xs text-amber-800">Trải nghiệm đọc truyện hoàn hảo, không giới hạn.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {[
                    { title: 'Không giới hạn chapter', desc: 'Đọc tất cả chapter VIP của mọi bộ truyện' },
                    { title: 'Tối ưu chi phí', desc: 'Tiết kiệm hơn so với mua lẻ từng chương' },
                    { title: 'Không quảng cáo', desc: 'Trải nghiệm đọc mượt mà, tập trung' },
                    { title: 'Nhận chương mới sớm', desc: 'Đọc trước các chương vừa dịch sớm nhất' }
                  ].map((perk, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                        <ViconicIcon name="check" size={12} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-amber-900">{perk.title}</h4>
                        <p className="text-[11px] text-amber-800/80 leading-snug">{perk.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end justify-center p-6 bg-white/60 border border-amber-500/30 rounded-xl shrink-0 space-y-4 min-w-[220px]">
                <div className="text-center md:text-right">
                  <span className="text-[10px] font-bold text-amber-800 tracking-wider uppercase">Gói 30 ngày</span>
                  <div className="flex items-baseline gap-1 justify-center md:justify-end mt-0.5">
                    <span className="text-3xl font-black text-amber-955">{VIP_PRICE.toLocaleString('vi-VN')}</span>
                    <span className="text-sm font-semibold text-amber-900">xu</span>
                  </div>
                  <p className="text-[10px] text-amber-800/70 mt-1">~ 1.633 xu / ngày</p>
                </div>

                {isVIPMember ? (
                  <div className="space-y-2 w-full">
                    <div className="w-full bg-emerald-50/10 text-emerald-700 text-xs font-bold py-2 rounded-xl text-center flex items-center justify-center gap-1.5 border border-emerald-500/35">
                      <ViconicIcon name="check_circle" size={14} />
                      <span>Đang hoạt động</span>
                    </div>
                    <button
                      onClick={handleSubscribeVIP}
                      disabled={subscribingVIP || coinBalance < VIP_PRICE}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {subscribingVIP ? (
                        <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang gia hạn...</>
                      ) : (
                        <><ViconicIcon name="autorenew" size={14} />Gia hạn thêm 30 ngày</>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSubscribeVIP}
                    disabled={subscribingVIP}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-black text-xs shadow-md shadow-amber-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {subscribingVIP ? (
                      <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang đăng ký...</>
                    ) : (
                      <><ViconicIcon name="u4:vip-crown-queen-1-bold" size={14} />Đăng ký ngay</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {coinBalance < VIP_PRICE && !isVIPMember && (
              <div className="mt-5 p-3.5 bg-amber-550/5 border border-amber-300/50 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-4">
                <span>
                  Số dư hiện tại của bạn: <strong>{coinBalance.toLocaleString('vi-VN')} xu</strong> (thiếu <strong>{(VIP_PRICE - coinBalance).toLocaleString('vi-VN')} xu</strong>)
                </span>
                <button
                  onClick={() => setActiveTab('coins')}
                  className="font-bold underline hover:text-amber-900 shrink-0"
                >
                  Nạp thêm xu ngay →
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-surface-variant/20 border border-outline-variant/30 rounded-xl text-xs text-on-surface-variant space-y-2">
            <p className="font-bold text-on-surface">Lưu ý quan trọng về Hội viên VIP:</p>
            <p>• <strong>Mua chương lẻ:</strong> Bạn sở hữu chương đó vĩnh viễn, kể cả sau khi hết hạn hội viên VIP.</p>
            <p>• <strong>Hội viên VIP theo tháng:</strong> Khi hết hạn, bạn sẽ không thể tiếp tục đọc các chương VIP (trừ những chương bạn đã mua lẻ từ trước).</p>
            <p>• <strong>Cộng dồn thời hạn:</strong> Nếu đăng ký/gia hạn nhiều lần, thời gian sử dụng sẽ được cộng dồn (thêm 30 ngày cho mỗi lần đăng ký), không bị mất ngày cũ.</p>
          </div>
        </section>
      )}

      {/* Buying Decisions Comparison Table */}
      <section className="space-y-4">
        <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
          <ViconicIcon name="compare_arrows" size={18} className="text-primary" />
          <span>So sánh: Nên nạp xu mua lẻ hay Đăng ký VIP?</span>
        </h3>
        <div className="border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm bg-white">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-surface-variant/35 border-b border-outline-variant/20 font-bold text-on-surface">
                <th className="p-3">Đặc tính</th>
                <th className="p-3">Mua lẻ chương bằng xu</th>
                <th className="p-3">Đăng ký Hội viên VIP (49k/tháng)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-on-surface-variant">
              <tr>
                <td className="p-3 font-semibold text-on-surface">Quyền sở hữu</td>
                <td className="p-3">Sở hữu vĩnh viễn (kể cả khi hết VIP vẫn đọc lại được)</td>
                <td className="p-3">Chỉ đọc trong thời gian VIP hoạt động</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-on-surface">Phạm vi áp dụng</td>
                <td className="p-3">Mở khóa từng chương cụ thể bạn chọn</td>
                <td className="p-3">Đọc toàn bộ kho truyện VIP trên hệ thống</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-on-surface">Tần suất phù hợp</td>
                <td className="p-3">Thích hợp đọc ít truyện, đọc chậm, lưu trữ lâu dài</td>
                <td className="p-3">Thích hợp mọt sách đọc nhiều bộ truyện cùng lúc</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Transaction history */}
      <section className="space-y-4 pt-4">
        <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
          <ViconicIcon name="receipt_long" size={18} className="text-primary" />
          <span>Lịch sử giao dịch</span>
        </h2>

        {loadingTxns ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-surface-variant/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center text-sm text-on-surface-variant py-12 border border-dashed border-outline-variant/30 rounded-xl bg-surface-variant/10">
            <div className="w-12 h-12 rounded-full bg-surface-variant/30 flex items-center justify-center mx-auto mb-3 text-on-surface-variant">
              <ViconicIcon name="receipt_long" size={20} />
            </div>
            <span>Chưa phát sinh giao dịch nào.</span>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary/80 [scrollbar-width:thin] [scrollbar-color:#78555e_transparent]">
            {transactions.map(tx => {
              const st = txStatusLabel[tx.status] ?? { label: tx.status, color: 'text-on-surface-variant' }
              const isDeposit = tx.type === 'deposit'
              const isExpanded = expandedTxId === tx.id
              const isPending = tx.status === 'pending'
              const isReported = reportedTxIds.has(tx.id)
              const within24h = new Date(tx.created_at).getTime() + 24 * 60 * 60 * 1000 > Date.now()
              const txDescription = `YUME${String(tx.id).padStart(6, '0')}`
              return (
                <div
                  key={tx.id}
                  className="border border-outline-variant/30 rounded-xl bg-surface shadow-sm overflow-hidden"
                >
                  {/* Row header */}
                  <div
                    onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-variant/10 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDeposit ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                      <ViconicIcon name={isDeposit ? 'fehc:coin' : 'lock_open'} size={20} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{tx.note || (isDeposit ? 'Nạp xu vào ví' : 'Mở khóa chương truyện')}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant">
                        <span>{formatDate(tx.created_at)}</span>
                        {tx.ref_code && (
                          <><span>•</span><span className="font-mono bg-surface-variant/50 px-1.5 py-0.5 rounded text-[10px]">{tx.ref_code}</span></>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1.5">
                      <span className={`font-black text-sm ${isDeposit ? 'text-emerald-600' : 'text-primary'}`}>
                        {isDeposit ? '+' : '-'}{tx.coins.toLocaleString('vi-VN')} xu
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${st.color} shadow-sm`}>
                        {st.label}
                      </span>
                    </div>
                    <ViconicIcon name={isExpanded ? 'expand_less' : 'expand_more'} size={16} className="text-on-surface-variant shrink-0" />
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-outline-variant/20 bg-surface-variant/5 space-y-3">
                      {/* Pending deposit with action buttons */}
                      {isPending && isDeposit && within24h && (
                        <>
                          <div className="pt-2 space-y-1.5 text-xs text-on-surface-variant">
                            <div className="flex justify-between">
                              <span>Số tiền chuyển khoản</span>
                              <span className="font-bold text-on-surface">{formatVND(tx.vnd_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Nội dung CK bắt buộc</span>
                              <span className="font-mono font-bold text-amber-700">{txDescription}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Xu sẽ nhận</span>
                              <span className="font-bold text-primary">{tx.coins.toLocaleString('vi-VN')} xu</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-amber-800 bg-amber-50/60 border border-amber-200/60 rounded-lg px-3 py-2">
                            Nếu bạn đã chuyển khoản, nhấn xác nhận để thông báo admin duyệt. Đơn sẽ tự hủy sau 24h nếu không xác nhận.
                          </p>
                          <div className="flex gap-2">
                            {isReported ? (
                              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                                <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
                                Đã gửi — chờ admin xác nhận...
                              </div>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); handleReportFromList(tx.id) }}
                                disabled={reportingTxId !== null}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-60"
                              >
                                {reportingTxId === tx.id
                                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang gửi...</>
                                  : <><ViconicIcon name="check_circle" size={14} />Tôi đã chuyển khoản thành công</>
                                }
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); handleCancelFromList(tx.id) }}
                              disabled={cancellingTxId !== null}
                              className="py-2.5 px-3 text-xs font-bold border border-red-300 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-60 shrink-0"
                            >
                              {cancellingTxId === tx.id ? 'Đang hủy...' : 'Hủy đơn'}
                            </button>
                          </div>
                        </>
                      )}

                      {/* Pending but past 24h — will be auto-cancelled next fetch */}
                      {isPending && isDeposit && !within24h && (
                        <p className="pt-2 text-xs text-red-600 font-semibold">Đơn đã quá 24h và sẽ tự động bị hủy.</p>
                      )}

                      {/* Completed */}
                      {tx.status === 'completed' && (
                        <div className="pt-2 space-y-1.5 text-xs text-on-surface-variant">
                          {tx.completed_at && (
                            <div className="flex justify-between">
                              <span>Hoàn thành lúc</span>
                              <span className="font-bold text-on-surface">{formatDate(tx.completed_at)}</span>
                            </div>
                          )}
                          {isDeposit && (
                            <div className="flex justify-between">
                              <span>Đã cộng vào ví</span>
                              <span className="font-bold text-emerald-600">+{tx.coins.toLocaleString('vi-VN')} xu</span>
                            </div>
                          )}
                          <p className="text-emerald-700 font-semibold">✓ Giao dịch đã được ghi nhận thành công.</p>
                        </div>
                      )}

                      {/* Cancelled */}
                      {tx.status === 'cancelled' && (
                        <div className="pt-2 space-y-1 text-xs text-on-surface-variant">
                          <p className="text-red-600 font-semibold">✕ Giao dịch đã bị hủy.</p>
                          {isDeposit && tx.expires_at && new Date(tx.expires_at) < new Date() && (
                            <p>Lý do: Không xác nhận chuyển khoản trong thời hạn cho phép.</p>
                          )}
                          <p>Không có xu nào bị trừ hoặc cộng cho đơn này.</p>
                        </div>
                      )}

                      {/* Spend transaction */}
                      {!isDeposit && tx.status === 'completed' && (
                        <div className="pt-2 space-y-1.5 text-xs text-on-surface-variant">
                          {tx.completed_at && (
                            <div className="flex justify-between">
                              <span>Thời gian</span>
                              <span className="font-bold text-on-surface">{formatDate(tx.completed_at)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Xu đã dùng</span>
                            <span className="font-bold text-primary">-{tx.coins.toLocaleString('vi-VN')} xu</span>
                          </div>
                          {tx.note && <p className="text-on-surface/70 leading-relaxed">{tx.note}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Toast Notification for Successful VIP subscription */}
      {showVipNotification && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto sm:w-80 bg-neutral-950 dark:bg-neutral-900 text-white border border-neutral-850 rounded-xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-amber-400">Đăng ký VIP thành công</h4>
              <p className="text-xs text-neutral-300 leading-normal">
                Chào mừng bạn đến với hội viên VIP! Quyền lợi đọc truyện không giới hạn đã kích hoạt thành công.
              </p>
            </div>
            <button
              onClick={() => setShowVipNotification(false)}
              className="text-neutral-400 hover:text-white transition-colors text-xs font-bold shrink-0"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
