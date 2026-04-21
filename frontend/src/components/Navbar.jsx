import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Film, Menu, X, LogOut, User, BookMarked, List, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: '/',       label: 'Home' },
    { to: '/browse', label: 'Browse' },
  ]

  const userLinks = [
    { to: '/watchlist',      label: 'Watchlist',      icon: BookMarked },
    { to: '/lists',          label: 'My Lists',        icon: List },
    { to: '/recommendations',label: 'Recommendations', icon: Sparkles },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b" style={{ background: 'rgba(5,5,5,0.85)', borderColor: 'var(--border)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Film size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">MediaHive</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(to)
                    ? 'text-white bg-white/8'
                    : 'text-silver hover:text-white hover:bg-white/5'
                }`}
                style={isActive(to) ? { background: 'rgba(255,255,255,0.08)' } : {}}
              >
                {label}
              </Link>
            ))}
            {user && userLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(to) ? 'text-white' : 'text-silver hover:text-white hover:bg-white/5'
                }`}
                style={isActive(to) ? { background: 'rgba(255,255,255,0.08)' } : {}}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-silver hover:text-white transition-all"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                    {user.FName?.[0]?.toUpperCase()}
                  </div>
                  {user.FName}
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden shadow-glow-lg animate-fade-in"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <Link to="/profile" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-pearl hover:text-white hover:bg-white/5 transition-colors">
                      <User size={15} /> Profile
                    </Link>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-pearl hover:text-white hover:bg-white/5 transition-colors">
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost px-4 py-2 text-sm">Sign in</Link>
                <Link to="/register" className="btn-primary px-4 py-2 text-sm">Get started</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-silver hover:text-white transition-colors p-2">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 pt-2 space-y-1 animate-fade-in" style={{ borderTop: '1px solid var(--border)' }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 rounded-lg text-sm text-silver hover:text-white hover:bg-white/5 transition-colors">
              {label}
            </Link>
          ))}
          {user && userLinks.map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 rounded-lg text-sm text-silver hover:text-white hover:bg-white/5 transition-colors">
              {label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="btn-ghost px-4 py-2 text-sm text-center">Profile</Link>
                <button onClick={handleLogout} className="btn-primary px-4 py-2 text-sm">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login"    onClick={() => setMenuOpen(false)} className="btn-ghost px-4 py-2 text-sm text-center">Sign in</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary px-4 py-2 text-sm text-center">Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
