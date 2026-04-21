import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import api from '../api/axios'
import MediaCard from '../components/MediaCard'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'

const TYPES   = ['all', 'movie', 'tv', 'anime']
const SORTS   = [{ value: 'rating', label: 'Top Rated' }, { value: 'release_date', label: 'Newest' }, { value: 'title', label: 'A–Z' }]
const GENRES  = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi & Fantasy', 'Thriller']

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items,   setItems]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [loading, setLoading] = useState(true)

  const search = searchParams.get('search') || ''
  const type   = searchParams.get('type')   || 'all'
  const genre  = searchParams.get('genre')  || ''
  const sort   = searchParams.get('sort')   || 'rating'
  const page   = parseInt(searchParams.get('page') || '1', 10)

  const [searchInput, setSearchInput] = useState(search)

  const updateParam = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.set('page', '1')
    setSearchParams(p)
  }

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort, page, limit: 20 })
      if (type && type !== 'all') params.set('type', type)
      if (genre)  params.set('genre', genre)
      if (search) params.set('search', search)

      const { data } = await api.get(`/media?${params}`)
      setItems(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [type, genre, sort, search, page])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const handleSearch = (e) => {
    e.preventDefault()
    updateParam('search', searchInput)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Browse</h1>
        <p className="text-muted text-sm">
          {total > 0 ? `${total.toLocaleString()} titles found` : 'Explore the full catalogue'}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search titles…"
            className="input-dark pl-9"
          />
        </div>
        <button type="submit" className="btn-primary px-4 py-2.5 text-sm">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearchInput(''); updateParam('search', '') }}
            className="btn-ghost px-4 py-2.5 text-sm">Clear</button>
        )}
      </form>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-4 mb-8 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        {/* Type tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => updateParam('type', t === 'all' ? '' : t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                type === t || (t === 'all' && !type)
                  ? 'bg-white text-black'
                  : 'text-silver hover:text-white'
              }`}>
              {t === 'all' ? 'All' : t === 'tv' ? 'TV' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-muted" />
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="input-dark py-1.5 text-sm"
            style={{ width: 'auto', paddingRight: '2rem' }}
          >
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Genre chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => updateParam('genre', '')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            !genre ? 'bg-white text-black' : 'btn-ghost'
          }`}>
          All Genres
        </button>
        {GENRES.map(g => (
          <button key={g} onClick={() => updateParam('genre', genre === g ? '' : g)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              genre === g ? 'bg-white text-black' : 'btn-ghost'
            }`}>
            {g}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingSpinner text="Loading titles…" />
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-2xl font-bold text-silver mb-2">No results</p>
          <p className="text-muted text-sm">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {items.map(item => (
            <MediaCard key={item.media_id} item={item} />
          ))}
        </div>
      )}

      <Pagination page={page} pages={pages} onPageChange={(p) => updateParam('page', p)} />
    </div>
  )
}
