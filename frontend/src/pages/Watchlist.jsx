import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Star, Film, Tv, Sparkles } from 'lucide-react'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'

const STATUSES = ['all', 'plan_to_watch', 'watching', 'completed', 'dropped']

const STATUS_COLORS = {
  plan_to_watch: 'text-silver border-white/10',
  watching:      'text-emerald-400 border-emerald-400/20',
  completed:     'text-white border-white/25',
  dropped:       'text-red-400 border-red-400/20',
}

const TYPE_ICONS = { movie: Film, tv: Tv, anime: Sparkles }

function WatchlistItemCard({ item, onRemove, onStatusChange }) {
  const TypeIcon = TYPE_ICONS[item.media_type] || Film

  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-4 group animate-fade-in">
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <TypeIcon size={20} className="text-white/30" strokeWidth={1.5} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/media/${item.media_id}`}
          className="text-sm font-semibold text-pearl hover:text-white transition-colors line-clamp-1">
          {item.title}
        </Link>
        <div className="flex items-center gap-3 mt-1">
          {item.average_rating > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Star size={10} className="fill-white/40 text-white/40" />
              {Number(item.average_rating).toFixed(1)}
            </span>
          )}
          {item.release_date && (
            <span className="text-xs text-muted">{new Date(item.release_date).getFullYear()}</span>
          )}
          <span className="text-xs text-muted capitalize">{item.media_type}</span>
        </div>
      </div>

      {/* Status select */}
      <select
        value={item.status}
        onChange={(e) => onStatusChange(item.media_id, e.target.value)}
        className={`text-xs font-medium px-2 py-1.5 rounded-lg bg-transparent transition-colors ${STATUS_COLORS[item.status] || 'text-silver'}`}
        style={{ border: '1px solid', borderColor: 'rgba(255,255,255,0.08)', outline: 'none', minWidth: 130 }}
      >
        {STATUSES.slice(1).map(s => (
          <option key={s} value={s} style={{ background: '#111' }}>
            {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </option>
        ))}
      </select>

      {/* Remove */}
      <button onClick={() => onRemove(item.media_id)}
        className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all p-1 flex-shrink-0">
        <Trash2 size={15} />
      </button>
    </div>
  )
}

export default function Watchlist() {
  const [items,   setItems]   = useState([])
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = filter !== 'all' ? `?status=${filter}` : ''
        const { data } = await api.get(`/watchlist${params}`)
        setItems(data)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [filter])

  const remove = async (mediaId) => {
    await api.delete(`/watchlist/${mediaId}`)
    setItems(prev => prev.filter(i => i.media_id !== mediaId))
  }

  const changeStatus = async (mediaId, status) => {
    await api.put(`/watchlist/${mediaId}`, { status })
    setItems(prev => prev.map(i => i.media_id === mediaId ? { ...i, status } : i))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Watchlist</h1>
          <p className="text-muted text-sm mt-1">{items.length} title{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/browse" className="btn-ghost px-4 py-2 text-sm">+ Add more</Link>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
              filter === s ? 'bg-white text-black' : 'btn-ghost'
            }`}>
            {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading watchlist…" />
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-2xl font-bold text-silver mb-2">Nothing here yet</p>
          <p className="text-muted text-sm mb-6">Browse titles and add them to your watchlist.</p>
          <Link to="/browse" className="btn-primary px-6 py-2.5 text-sm">Browse</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <WatchlistItemCard key={item.media_id} item={item} onRemove={remove} onStatusChange={changeStatus} />
          ))}
        </div>
      )}
    </div>
  )
}
