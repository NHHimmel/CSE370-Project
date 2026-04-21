import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Inbox, Star, Trash2, X, Search } from 'lucide-react'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'

function RecommCard({ rec, onDelete, type }) {
  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-4 group animate-fade-in">
      <div className="flex-1 min-w-0">
        <Link to={`/media/${rec.media_id}`}
          className="text-sm font-semibold text-pearl hover:text-white transition-colors line-clamp-1">
          {rec.media_title}
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted capitalize">{rec.media_type}</span>
          {rec.average_rating > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Star size={9} className="fill-white/30 text-white/30" />
              {Number(rec.average_rating).toFixed(1)}
            </span>
          )}
          {rec.release_date && (
            <span className="text-xs text-muted">{new Date(rec.release_date).getFullYear()}</span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        {type === 'received' ? (
          <p className="text-xs text-muted">From <span className="text-silver">{rec.sender_name}</span></p>
        ) : (
          <p className="text-xs text-muted">To <span className="text-silver">{rec.receiver_name}</span></p>
        )}
      </div>

      {type === 'sent' && (
        <button onClick={() => onDelete(rec.receiver_id, rec.media_id)}
          className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all p-1 flex-shrink-0">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function SendModal({ onClose, onSent }) {
  const [receiverId, setReceiverId] = useState('')
  const [mediaSearch, setMediaSearch] = useState('')
  const [mediaResults, setMediaResults] = useState([])
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const searchMedia = async (e) => {
    e.preventDefault()
    if (!mediaSearch.trim()) return
    const { data } = await api.get(`/media?search=${mediaSearch}&limit=10`)
    setMediaResults(data.items)
  }

  const send = async () => {
    if (!receiverId.trim() || !selectedMedia) {
      setError('Please enter a receiver ID and select a title.')
      return
    }
    setSending(true)
    setError('')
    try {
      await api.post('/recommendations', { receiver_id: receiverId, media_id: selectedMedia.media_id })
      onSent()
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to send recommendation.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg glass-card rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Send Recommendation</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1"><X size={18} /></button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-300"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-pearl mb-1.5">Receiver User ID</label>
            <input value={receiverId} onChange={e => setReceiverId(e.target.value)}
              placeholder="Paste the recipient's user ID" className="input-dark" />
            <p className="text-xs text-muted mt-1">You can find a user's ID on their profile page.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-pearl mb-1.5">Search Media</label>
            <form onSubmit={searchMedia} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={mediaSearch} onChange={e => setMediaSearch(e.target.value)}
                  placeholder="Search for a title…" className="input-dark pl-9" />
              </div>
              <button type="submit" className="btn-ghost px-4 py-2 text-sm">Search</button>
            </form>
          </div>

          {mediaResults.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {mediaResults.map(m => (
                <button key={m.media_id} onClick={() => setSelectedMedia(m)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                    selectedMedia?.media_id === m.media_id
                      ? 'bg-white text-black'
                      : 'text-pearl hover:bg-white/5'
                  }`}
                  style={{ border: '1px solid', borderColor: selectedMedia?.media_id === m.media_id ? 'transparent' : 'rgba(255,255,255,0.06)' }}>
                  <span className="font-medium">{m.title}</span>
                  <span className="ml-2 text-xs opacity-60 capitalize">{m.media_type}</span>
                </button>
              ))}
            </div>
          )}

          {selectedMedia && (
            <div className="px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Selected: <span className="text-white font-semibold">{selectedMedia.title}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={send} disabled={sending} className="btn-primary flex-1 py-2.5 text-sm font-semibold disabled:opacity-50">
              {sending ? 'Sending…' : 'Send Recommendation'}
            </button>
            <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Recommendations() {
  const [tab,      setTab]      = useState('received')
  const [received, setReceived] = useState([])
  const [sent,     setSent]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rRes, sRes] = await Promise.all([
        api.get('/recommendations/received'),
        api.get('/recommendations/sent'),
      ])
      setReceived(rRes.data)
      setSent(sRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const deleteRec = async (receiverId, mediaId) => {
    await api.delete(`/recommendations/${receiverId}/${mediaId}`)
    setSent(prev => prev.filter(r => !(r.receiver_id === receiverId && r.media_id === mediaId)))
  }

  const items = tab === 'received' ? received : sent

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      {modal && <SendModal onClose={() => setModal(false)} onSent={fetchData} />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Recommendations</h1>
          <p className="text-muted text-sm mt-1">Media shared with you and by you</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
          <Send size={15} /> Send
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--surface-2)' }}>
        {[
          { id: 'received', label: `Received (${received.length})`, icon: Inbox },
          { id: 'sent',     label: `Sent (${sent.length})`,         icon: Send  },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-black' : 'text-silver hover:text-white'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading…" />
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl font-bold text-silver mb-2">
            {tab === 'received' ? 'No recommendations received yet' : 'No recommendations sent yet'}
          </p>
          {tab === 'sent' && (
            <button onClick={() => setModal(true)} className="btn-primary px-6 py-2.5 text-sm mt-4">
              Send a recommendation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((rec, i) => (
            <RecommCard
              key={`${rec.sender_id}-${rec.receiver_id}-${rec.media_id}-${i}`}
              rec={rec}
              type={tab}
              onDelete={deleteRec}
            />
          ))}
        </div>
      )}
    </div>
  )
}
