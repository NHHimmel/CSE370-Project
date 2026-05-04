import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Globe, Lock, Star, Film, Tv, Sparkles, Trash2 } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const TYPE_ICONS = { movie: Film, tv: Tv, anime: Sparkles }

export default function ListDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [list,    setList]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/lists/${id}`).then(r => setList(r.data)).finally(() => setLoading(false))
  }, [id])

  const removeItem = async (mediaId) => {
    await api.delete(`/lists/${id}/items/${mediaId}`)
    setList(prev => ({ ...prev, items: prev.items.filter(i => i.media_id !== mediaId) }))
  }

  if (loading) return <LoadingSpinner text="Loading list…" />
  if (!list)   return <div className="text-center py-20 text-muted">List not found.</div>

  const isOwner = user?.user_id === list.user_id

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <Link to="/lists" className="flex items-center gap-2 text-sm text-muted hover:text-pearl transition-colors mb-8">
        <ArrowLeft size={16} /> Back to lists
      </Link>

      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {list.is_public
                ? <Globe size={14} className="text-muted" />
                : <Lock size={14} className="text-muted" />
              }
              <span className="text-xs text-muted">{list.is_public ? 'Public' : 'Private'}</span>
            </div>
            <h1 className="text-2xl font-bold gradient-text">{list.title}</h1>
            {list.description && (
              <p className="text-sm text-muted mt-2 leading-relaxed">{list.description}</p>
            )}
            <p className="text-xs text-muted/60 mt-3">
              {list.items.length} item{list.items.length !== 1 ? 's' : ''} · Created {new Date(list.created_at).toLocaleDateString()}
            </p>
          </div>
          {isOwner && (
            <Link to="/browse" className="btn-ghost px-4 py-2 text-sm whitespace-nowrap">+ Add items</Link>
          )}
        </div>
      </div>

      {/* Items */}
      {list.items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl font-bold text-silver mb-2">This list is empty</p>
          {isOwner && (
            <Link to="/browse" className="btn-primary px-6 py-2.5 text-sm mt-4 inline-block">Browse titles</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {list.items.map((item, idx) => {
            const TypeIcon = TYPE_ICONS[item.media_type] || Film
            return (
              <div key={item.media_id} className="glass-card rounded-xl p-4 flex items-center gap-4 group animate-fade-in">
                {item.list_rank != null && (
                  <span className="text-lg font-black text-muted/40 w-7 text-right flex-shrink-0">{item.list_rank}</span>
                )}
                <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <TypeIcon size={17} className="text-white/25" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/media/${item.media_id}`}
                    className="text-sm font-semibold text-pearl hover:text-white transition-colors line-clamp-1">
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-0.5">
                    {item.release_date && (
                      <span className="text-xs text-muted">{new Date(item.release_date).getFullYear()}</span>
                    )}
                    {item.average_rating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Star size={9} className="fill-white/30 text-white/30" />
                        {Number(item.average_rating).toFixed(1)}
                      </span>
                    )}
                    <span className="text-xs text-muted capitalize">{item.media_type}</span>
                  </div>
                </div>
                <span className="text-xs text-muted/50">Added {new Date(item.added_at).toLocaleDateString()}</span>
                {isOwner && (
                  <button onClick={() => removeItem(item.media_id)}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all p-1 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
