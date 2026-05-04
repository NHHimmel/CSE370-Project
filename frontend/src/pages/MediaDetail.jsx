import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Clock, Tv, Sparkles, Star, BookMarked, BookmarkCheck,
  MessageSquare, Trash2, Pencil, CheckCircle, ChevronDown
} from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'
import LoadingSpinner from '../components/LoadingSpinner'

const TYPE_ICONS = { movie: Clock, tv: Tv, anime: Sparkles }

function ReviewItem({ review, currentUser, onDelete }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments]         = useState([])
  const [commentBody, setCommentBody]   = useState('')
  const [posting, setPosting]           = useState(false)

  const loadComments = async () => {
    if (!showComments) {
      const { data } = await api.get(`/comments/by-review/${review.review_id}`)
      setComments(data)
    }
    setShowComments(!showComments)
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentBody.trim()) return
    setPosting(true)
    try {
      const { data } = await api.post(`/comments/by-review/${review.review_id}`, { body: commentBody })
      setComments(prev => [...prev, data])
      setCommentBody('')
    } finally {
      setPosting(false)
    }
  }

  const deleteComment = async (cid) => {
    await api.delete(`/comments/${cid}`)
    setComments(prev => prev.filter(c => c.comment_id !== cid))
  }

  return (
    <div className="glass-card rounded-2xl p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            {review.reviewer_name[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-pearl">{review.reviewer_name}</p>
            <p className="text-xs text-muted">{new Date(review.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        {currentUser?.user_id === review.user_id && (
          <button onClick={() => onDelete(review.review_id)} className="text-muted hover:text-white transition-colors p-1">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p className="mt-3 text-sm text-pearl leading-relaxed">{review.body}</p>

      <button onClick={loadComments}
        className="flex items-center gap-1.5 mt-4 text-xs text-muted hover:text-silver transition-colors">
        <MessageSquare size={13} />
        {review.comment_count} comment{review.comment_count !== 1 ? 's' : ''}
        <ChevronDown size={12} className={`transition-transform ${showComments ? 'rotate-180' : ''}`} />
      </button>

      {showComments && (
        <div className="mt-3 pl-4 space-y-3" style={{ borderLeft: '1px solid var(--border)' }}>
          {comments.map(c => (
            <div key={c.comment_id} className="flex items-start gap-2 group">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                {c.commenter_name[0]}
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-silver">{c.commenter_name} </span>
                <span className="text-xs text-pearl">{c.body}</span>
              </div>
              {currentUser?.user_id === c.user_id && (
                <button onClick={() => deleteComment(c.comment_id)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-white transition-all p-0.5">
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
          {currentUser && (
            <form onSubmit={submitComment} className="flex gap-2 mt-2">
              <input value={commentBody} onChange={e => setCommentBody(e.target.value)}
                placeholder="Add a comment…" className="input-dark py-1.5 text-xs flex-1" />
              <button type="submit" disabled={posting} className="btn-primary px-3 py-1.5 text-xs whitespace-nowrap">
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default function MediaDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [media,     setMedia]     = useState(null)
  const [reviews,   setReviews]   = useState([])
  const [myRating,  setMyRating]  = useState(0)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [watchStatus, setWatchStatus] = useState('plan_to_watch')
  const [reviewBody, setReviewBody]   = useState('')
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/media/${id}`)
        setMedia(data)
        const rRes = await api.get(`/reviews/by-media/${id}`)
        setReviews(rRes.data)

        if (user) {
          try {
            const ratingRes = await api.get(`/ratings/media/${id}/mine`)
            setMyRating(Number(ratingRes.data.score))
          } catch {}
          try {
            const wlRes = await api.get(`/watchlist`)
            const entry = wlRes.data.find(w => w.media_id === id)
            if (entry) { setInWatchlist(true); setWatchStatus(entry.status) }
          } catch {}
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, user])

  const handleRate = async (score) => {
    setMyRating(score)
    await api.post(`/ratings/media/${id}`, { score })
    const { data } = await api.get(`/media/${id}`)
    setMedia(data)
  }

  const toggleWatchlist = async () => {
    if (inWatchlist) {
      await api.delete(`/watchlist/${id}`)
      setInWatchlist(false)
    } else {
      await api.post(`/watchlist`, { media_id: id, status: 'plan_to_watch' })
      setInWatchlist(true)
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    if (!reviewBody.trim()) return
    const { data } = await api.post(`/reviews/by-media/${id}`, { body: reviewBody })
    setReviews(prev => [data, ...prev])
    setReviewBody('')
  }

  const deleteReview = async (reviewId) => {
    await api.delete(`/reviews/${reviewId}`)
    setReviews(prev => prev.filter(r => r.review_id !== reviewId))
  }

  if (loading) return <LoadingSpinner text="Loading…" />
  if (!media)  return <div className="text-center py-20 text-muted">Media not found.</div>

  const TypeIcon = TYPE_ICONS[media.media_type] || Star

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* ── Hero banner ── */}
      <div className="relative rounded-2xl overflow-hidden mb-10 p-8 sm:p-12"
        style={{ background: 'linear-gradient(135deg, #141414 0%, #0a0a0a 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)' }} />

        <div className="relative flex flex-col sm:flex-row gap-6 sm:items-end">
          {/* Poster */}
          {media.poster_url ? (
            <img
              src={media.poster_url}
              alt={media.title}
              className="w-28 h-40 rounded-xl flex-shrink-0 object-cover shadow-glow"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div className="w-28 h-40 rounded-xl flex-shrink-0 items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: media.poster_url ? 'none' : 'flex' }}>
            <TypeIcon size={36} className="text-white/20" strokeWidth={1} />
          </div>

          <div className="flex-1">
            {/* Type + genres */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="badge text-white/50" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {media.media_type.toUpperCase()}
              </span>
              {media.genres.slice(0, 3).map(g => (
                <span key={g} className="badge text-muted" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {g}
                </span>
              ))}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black gradient-text-hero leading-tight mb-2">{media.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted mb-4">
              {media.release_date && <span>{new Date(media.release_date).getFullYear()}</span>}
              {media.runtime      && <span>{media.runtime} min</span>}
              {media.total_seasons && <span>{media.total_seasons} season{media.total_seasons > 1 ? 's' : ''}</span>}
              {media.total_episodes && <span>{media.total_episodes} episodes</span>}
              {media.tv_status    && <span className="text-silver">{media.tv_status}</span>}
              {media.source_material && <span>{media.source_material}</span>}
            </div>

            {/* Community rating */}
            <div className="flex items-center gap-2">
              <Star size={16} className="text-white fill-white" />
              <span className="text-xl font-bold text-white">
                {media.average_rating > 0 ? Number(media.average_rating).toFixed(1) : 'N/A'}
              </span>
              <span className="text-muted text-sm">/10 community rating</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Synopsis */}
          {media.synopsis && (
            <section>
              <h2 className="section-title">Synopsis</h2>
              <p className="text-sm text-pearl leading-7">{media.synopsis}</p>
            </section>
          )}

          {/* Tags */}
          {media.tags?.length > 0 && (
            <section>
              <h2 className="section-title">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {media.tags.map(t => (
                  <span key={t} className="badge text-muted" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section>
            <h2 className="section-title">
              <MessageSquare size={16} className="text-silver" />
              Reviews ({reviews.length})
            </h2>

            {user && (
              <form onSubmit={submitReview} className="glass-card rounded-2xl p-4 mb-5">
                <textarea
                  value={reviewBody}
                  onChange={e => setReviewBody(e.target.value)}
                  placeholder="Share your thoughts about this title…"
                  rows={3}
                  className="input-dark resize-none mb-3"
                />
                <button type="submit" className="btn-primary px-4 py-2 text-sm">
                  Post Review
                </button>
              </form>
            )}

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted py-4">No reviews yet. Be the first!</p>
              ) : (
                reviews.map(r => (
                  <ReviewItem key={r.review_id} review={r} currentUser={user} onDelete={deleteReview} />
                ))
              )}
            </div>
          </section>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          {user && (
            <>
              {/* Rate */}
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-pearl mb-4">Your Rating</h3>
                <StarRating value={myRating} onChange={handleRate} size={28} />
                {myRating > 0 && (
                  <p className="text-xs text-muted mt-2 flex items-center gap-1">
                    <CheckCircle size={12} /> Rated {myRating}/10
                  </p>
                )}
              </div>

              {/* Watchlist */}
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-pearl mb-4">Watchlist</h3>
                <button
                  onClick={toggleWatchlist}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                    inWatchlist ? 'bg-white/10 text-white border border-white/20 hover:bg-red-900/30 hover:border-red-500/30 hover:text-red-300' : 'btn-primary'
                  }`}
                >
                  {inWatchlist
                    ? <><BookmarkCheck size={16} /> In Watchlist</>
                    : <><BookMarked size={16} /> Add to Watchlist</>
                  }
                </button>
                {inWatchlist && (
                  <select
                    value={watchStatus}
                    onChange={async (e) => {
                      setWatchStatus(e.target.value)
                      await api.put(`/watchlist/${id}`, { status: e.target.value })
                    }}
                    className="input-dark mt-3 text-sm"
                  >
                    {['plan_to_watch','watching','completed','dropped'].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}

          {/* Details */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-pearl mb-4">Details</h3>
            <div className="space-y-3">
              {[
                ['Type',       media.media_type.charAt(0).toUpperCase() + media.media_type.slice(1)],
                ['Release',    media.release_date ? new Date(media.release_date).toLocaleDateString() : null],
                ['Runtime',    media.runtime ? `${media.runtime} min` : null],
                ['Seasons',    media.total_seasons],
                ['Episodes',   media.total_episodes],
                ['Status',     media.tv_status],
                ['Source',     media.source_material],
                ['Box Office', media.box_office ? `$${Number(media.box_office).toLocaleString()}` : null],
              ].filter(([, v]) => v != null).map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted">{label}</span>
                  <span className="text-pearl font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {!user && (
            <div className="glass-card rounded-2xl p-5 text-center">
              <p className="text-sm text-muted mb-3">Sign in to rate, review, and track this title.</p>
              <Link to="/login" className="btn-primary px-4 py-2 text-sm inline-block">Sign in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
