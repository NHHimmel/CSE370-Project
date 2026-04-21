import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, TrendingUp, Tv, Sparkles, ChevronRight } from 'lucide-react'
import api from '../api/axios'
import MediaCard from '../components/MediaCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'

function Section({ title, icon: Icon, items, loading }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-title">
          <Icon size={18} className="text-silver" />
          {title}
        </h2>
        <Link to={`/browse?type=${title === 'Top Movies' ? 'movie' : title === 'Top TV Series' ? 'tv' : 'anime'}`}
          className="flex items-center gap-1 text-xs text-muted hover:text-pearl transition-colors">
          See all <ChevronRight size={12} />
        </Link>
      </div>
      {loading ? (
        <LoadingSpinner size={28} />
      ) : (
        <div className="scroll-row">
          {items.map(item => <MediaCard key={item.media_id} item={item} />)}
        </div>
      )}
    </section>
  )
}

export default function Home() {
  const { user } = useAuth()
  const [movies, setMovies]   = useState([])
  const [tv, setTv]           = useState([])
  const [anime, setAnime]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [mRes, tRes, aRes] = await Promise.all([
          api.get('/media/movies?limit=12'),
          api.get('/media/tv?limit=12'),
          api.get('/media/anime?limit=12'),
        ])
        setMovies(mRes.data.items)
        setTv(tRes.data.items)
        setAnime(aRes.data.items)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0d0d0d 0%, #000000 60%)' }}>
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-5"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-silver mb-6"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse-slow" />
            Community-Driven Media Discovery
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-none">
            <span className="gradient-text-hero">Discover.</span>{' '}
            <span className="gradient-text-hero">Discuss.</span>{' '}
            <span className="gradient-text-hero">Connect.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Your intelligent platform for discovering movies, TV series, and anime —
            with real community reviews, ratings, and personalized lists.
          </p>

          {/* Search */}
          <form
            onSubmit={(e) => { e.preventDefault(); window.location.href = `/browse?search=${search}` }}
            className="flex items-center gap-2 max-w-md mx-auto"
          >
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search movies, shows, anime…"
                className="input-dark pl-10"
              />
            </div>
            <button type="submit" className="btn-primary px-5 py-2.5 text-sm whitespace-nowrap">
              Search
            </button>
          </form>

          <div className="flex items-center justify-center gap-8 mt-12">
            {[['200+', 'Movies'], ['200+', 'TV Series'], ['250+', 'Anime']].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-white">{num}</div>
                <div className="text-xs text-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {!user && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <Link to="/register" className="btn-primary px-6 py-2.5 text-sm">
                Join for free
              </Link>
              <Link to="/browse" className="btn-ghost px-6 py-2.5 text-sm">
                Browse content
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Content Sections ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-14">
        <Section title="Top Movies"     icon={TrendingUp} items={movies} loading={loading} />
        <Section title="Top TV Series"  icon={Tv}         items={tv}     loading={loading} />
        <Section title="Top Anime"      icon={Sparkles}   items={anime}  loading={loading} />
      </div>
    </div>
  )
}
