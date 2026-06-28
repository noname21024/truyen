import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import NewUpdatePage from './pages/NewUpdatePage'
import DetailPage from './pages/DetailPage'
import ChapterPage from './pages/ChapterPage'
import GenrePage from './pages/GenrePage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'
import RankingPage from './pages/RankingPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import CoinPage from './pages/CoinPage'
import DonationLeaderboardPage from './pages/DonationLeaderboardPage'
import './App.css'

import ScrollToTop from './components/ScrollToTop'

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/*" element={
          <MainLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/new-update" element={<NewUpdatePage />} />
              <Route path="/detail/:id" element={<DetailPage />} />
              <Route path="/chapter/:novelId/:chapterIndex" element={<ChapterPage />} />
              <Route path="/genres/:genreId?" element={<GenrePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/coins" element={<CoinPage />} />
              <Route path="/leaderboard" element={<DonationLeaderboardPage />} />
            </Routes>
          </MainLayout>
        } />
      </Routes>
    </Router>
  )
}

export default App
