import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Browse from './pages/Browse'
import MediaDetail from './pages/MediaDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Watchlist from './pages/Watchlist'
import CustomLists from './pages/CustomLists'
import ListDetail from './pages/ListDetail'
import Recommendations from './pages/Recommendations'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/"              element={<Home />} />
          <Route path="/browse"        element={<Browse />} />
          <Route path="/media/:id"     element={<MediaDetail />} />
          <Route path="/login"         element={<Login />} />
          <Route path="/register"      element={<Register />} />
          <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/watchlist"     element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
          <Route path="/lists"         element={<ProtectedRoute><CustomLists /></ProtectedRoute>} />
          <Route path="/lists/:id"     element={<ProtectedRoute><ListDetail /></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
