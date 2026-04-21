import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Globe, Lock, ChevronRight } from 'lucide-react'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'

function CreateListModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', description: '', is_public: true })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.post('/lists', form)
      onCreate(data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md glass-card rounded-2xl p-6 animate-slide-up">
        <h2 className="text-lg font-bold text-white mb-5">Create New List</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-pearl mb-1.5">Title</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="My favourite films…" className="input-dark" />
          </div>
          <div>
            <label className="block text-sm font-medium text-pearl mb-1.5">Description <span className="text-muted">(optional)</span></label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What's this list about?" rows={2} className="input-dark resize-none" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-9 h-5 rounded-full transition-colors relative ${form.is_public ? 'bg-white' : 'bg-steel'}`}
              onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}>
              <div className={`absolute top-0.5 w-4 h-4 bg-black rounded-full transition-transform ${form.is_public ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <span className="text-sm font-medium text-pearl">{form.is_public ? 'Public' : 'Private'}</span>
              <p className="text-xs text-muted">{form.is_public ? 'Anyone can see this list' : 'Only you can see this list'}</p>
            </div>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm font-semibold disabled:opacity-50">
              {saving ? 'Creating…' : 'Create List'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CustomLists() {
  const [lists,   setLists]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)

  useEffect(() => {
    api.get('/lists').then(r => setLists(r.data)).finally(() => setLoading(false))
  }, [])

  const deleteList = async (id) => {
    if (!confirm('Delete this list?')) return
    await api.delete(`/lists/${id}`)
    setLists(prev => prev.filter(l => l.list_id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      {modal && (
        <CreateListModal
          onClose={() => setModal(false)}
          onCreate={(list) => setLists(prev => [list, ...prev])}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">My Lists</h1>
          <p className="text-muted text-sm mt-1">{lists.length} list{lists.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus size={16} /> New List
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading lists…" />
      ) : lists.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-2xl font-bold text-silver mb-2">No lists yet</p>
          <p className="text-muted text-sm mb-6">Create your first curated list of media.</p>
          <button onClick={() => setModal(true)} className="btn-primary px-6 py-2.5 text-sm">
            Create a list
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lists.map(list => (
            <div key={list.list_id} className="glass-card rounded-2xl p-5 group">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {list.is_public
                      ? <Globe size={13} className="text-muted flex-shrink-0" />
                      : <Lock size={13} className="text-muted flex-shrink-0" />
                    }
                    <h3 className="text-sm font-semibold text-pearl truncate">{list.title}</h3>
                  </div>
                  {list.description && (
                    <p className="text-xs text-muted line-clamp-2">{list.description}</p>
                  )}
                </div>
                <button onClick={() => deleteList(list.list_id)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all p-1 flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted">{list.item_count} item{list.item_count !== 1 ? 's' : ''}</span>
                <Link to={`/lists/${list.list_id}`}
                  className="flex items-center gap-1 text-xs text-silver hover:text-white transition-colors">
                  View <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
