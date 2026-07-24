import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import { Spinner } from './components/ui/spinner'
import './App.css'

import ScrollToTop from './components/ScrollToTop'
import { AudioPlayerProvider } from './contexts/AudioPlayerContext'

const HomePage = lazy(() => import('./pages/HomePage'))
const NewUpdatePage = lazy(() => import('./pages/NewUpdatePage'))
const DetailPage = lazy(() => import('./pages/DetailPage'))
const ChapterPage = lazy(() => import('./pages/ChapterPage'))
const GenrePage = lazy(() => import('./pages/GenrePage'))
const AuthorPage = lazy(() => import('./pages/AuthorPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const RankingPage = lazy(() => import('./pages/RankingPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
const CoinPage = lazy(() => import('./pages/CoinPage'))
const CompletedNovelsPage = lazy(() => import('./pages/CompletedNovelsPage'))
const DonationLeaderboardPage = lazy(() => import('./pages/DonationLeaderboardPage'))
const AdminDonationDashboardPage = lazy(() => import('./pages/AdminDonationDashboardPage'))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner className="size-8 text-primary" />
    </div>
  )
}

// Signed out remotely because the account hit its device limit. api.ts has
// already cleared the stored token; this only explains why, once, and reloads
// so no stale logged-in UI is left on screen.
function useSessionRevokedNotice() {
  useEffect(() => {
    let handled = false
    const onRevoked = () => {
      if (handled) return
      handled = true
      import('./lib/dialog').then(({ showCustomAlert }) => {
        showCustomAlert(
          'Phiên đăng nhập đã kết thúc',
          'Tài khoản của bạn vừa đăng nhập trên thiết bị khác. Mỗi tài khoản chỉ dùng được trên 2 thiết bị cùng lúc.',
          () => { window.location.href = '/' }
        )
      })
    }
    window.addEventListener('session-revoked', onRevoked)
    return () => window.removeEventListener('session-revoked', onRevoked)
  }, [])
}

function App() {
  useSessionRevokedNotice()
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/*" element={
            <AudioPlayerProvider>
              <MainLayout>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/new-update" element={<NewUpdatePage />} />
                    <Route path="/detail/:id" element={<DetailPage />} />
                    <Route path="/chapter/:chapterId" element={<ChapterPage />} />
                    <Route path="/genres/:genreId?" element={<GenrePage />} />
                    <Route path="/author/:slug" element={<AuthorPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/ranking" element={<RankingPage />} />
                    <Route path="/coins" element={<CoinPage />} />
                    <Route path="/completed" element={<CompletedNovelsPage />} />
                    <Route path="/leaderboard" element={<DonationLeaderboardPage />} />
                    <Route path="/admin/donations" element={<AdminDonationDashboardPage />} />
                  </Routes>
                </Suspense>
              </MainLayout>
            </AudioPlayerProvider>
          } />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
