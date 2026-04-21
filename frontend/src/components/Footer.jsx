import { Link } from 'react-router-dom'
import { Film } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-20 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Film size={14} className="text-white" />
            </div>
            <span className="font-bold gradient-text">MediaHive</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted">
            <Link to="/"       className="hover:text-pearl transition-colors">Home</Link>
            <Link to="/browse" className="hover:text-pearl transition-colors">Browse</Link>
            <Link to="/login"  className="hover:text-pearl transition-colors">Sign In</Link>
          </div>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} MediaHive. CSE370 Project.
          </p>
        </div>
      </div>
    </footer>
  )
}
