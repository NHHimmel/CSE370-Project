import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Pencil, Check, X } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Profile() {
  const { user: authUser, logout } = useAuth()

  const [profile,  setProfile]  = useState(null)
  const [stats,    setStats]    = useState({ reviews: 0, watchlist: 0, lists: 0 })
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState({ FName: '', LName: '' })
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [pRes, rRes, wRes, lRes] = await Promise.all([
          api.get('/users/me'),
          api.get(`/reviews/by-media/none`).catch(() => ({ data: [] })),
          api.get('/watchlist'),
          api.get('/lists'),
        ])
        setProfile(pRes.data)
        setForm({ FName: pRes.data.FName, LName: pRes.data.LName })
        setStats({ watchlist: wRes.data.length, lists: lRes.data.length })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    setError('')
    try {
      const { data } = await api.put('/users/me', form)
      setProfile(data)
      localStorage.setItem('user', JSON.stringify(data))
      setEditing(false)
    } catch (e) {
      setError(e.response?.data?.detail || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading profile…" />

  const initials = `${profile?.FName?.[0] || ''}${profile?.LName?.[0] || ''}`.toUpperCase()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      {/* Avatar + name */}
      <div className="glass-card rounded-2xl p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2a2a2a, #111111)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {initials || <User size={28} />}
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex gap-3">
                  <input value={form.FName} onChange={e => setForm(f => ({ ...f, FName: e.target.value }))}
                    placeholder="First name" className="input-dark" />
                  <input value={form.LName} onChange={e => setForm(f => ({ ...f, LName: e.target.value }))}
                    placeholder="Last name" className="input-dark" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={saving}
                    className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50">
                    <Check size={14} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-ghost flex items-center gap-1.5 px-4 py-2 text-sm">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white">{profile?.FName} {profile?.LName}</h1>
                  <button onClick={() => setEditing(true)}
                    className="text-muted hover:text-silver transition-colors p-1">
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="text-sm text-muted">{profile?.email}</p>
                <p className="text-xs text-muted/60 mt-1">
                  Member since {new Date(profile?.created_at).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-muted/50 font-mono truncate max-w-[220px]">{profile?.user_id}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(profile?.user_id)}
                    className="text-xs text-muted hover:text-silver transition-colors whitespace-nowrap flex-shrink-0"
                    title="Copy user ID">
                    Copy ID
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'Watchlist',    value: stats.watchlist, to: '/watchlist' },
            { label: 'Custom Lists', value: stats.lists,     to: '/lists' },
          ].map(({ label, value, to }) => (
            <Link key={label} to={to}
              className="text-center p-4 rounded-xl transition-all hover:bg-white/5"
              style={{ border: '1px solid var(--border)' }}>
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="text-xs text-muted mt-1">{label}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/watchlist',       label: 'Watchlist',        desc: 'Manage what you\'re watching' },
          { to: '/lists',           label: 'My Lists',          desc: 'Create and manage custom lists' },
          { to: '/recommendations', label: 'Recommendations',   desc: 'Media shared by friends' },
        ].map(({ to, label, desc }) => (
          <Link key={to} to={to} className="glass-card rounded-xl p-5 group">
            <p className="text-sm font-semibold text-pearl group-hover:text-white transition-colors">{label}</p>
            <p className="text-xs text-muted mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center">
        <button onClick={logout}
          className="btn-ghost px-6 py-2.5 text-sm text-red-400/70 hover:text-red-400 border-red-500/10 hover:border-red-500/30">
          Sign out
        </button>
      </div>
    </div>
  )
}
