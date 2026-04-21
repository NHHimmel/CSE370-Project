import { Link } from 'react-router-dom'
import { Star, Tv, Film, Sparkles } from 'lucide-react'

const TYPE_META = {
  movie: { label: 'Movie', Icon: Film,     gradient: 'linear-gradient(160deg, #1c1c1c 0%, #050505 100%)' },
  tv:    { label: 'TV',    Icon: Tv,       gradient: 'linear-gradient(160deg, #161616 0%, #030303 100%)' },
  anime: { label: 'Anime', Icon: Sparkles, gradient: 'linear-gradient(160deg, #1a1a1a 0%, #040404 100%)' },
}

// Deterministic pattern offset from title char codes
const patternOffset = (title = '') =>
  title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 40

export default function MediaCard({ item }) {
  const { media_id, title, release_date, average_rating, media_type, genres = [] } = item
  const meta  = TYPE_META[media_type] || TYPE_META.movie
  const Icon  = meta.Icon
  const year  = release_date ? new Date(release_date).getFullYear() : '—'
  const offset = patternOffset(title)

  return (
    <Link to={`/media/${media_id}`} className="group block flex-shrink-0 w-44 animate-fade-in">
      {/* Poster */}
      <div className="relative w-full rounded-xl overflow-hidden mb-3 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-glow"
        style={{ aspectRatio: '2/3', background: meta.gradient, border: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Real poster image */}
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <>
            {/* Fallback pattern overlay */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: `radial-gradient(circle at ${20 + offset}% ${30 + offset}%, rgba(255,255,255,0.15) 0%, transparent 50%)` }} />
            {/* Fallback icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Icon size={52} className="text-white" strokeWidth={1} />
            </div>
          </>
        )}

        {/* Rating badge */}
        {average_rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
            <Star size={10} className="text-white fill-white" />
            <span className="text-white">{Number(average_rating).toFixed(1)}</span>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute bottom-2 left-2">
          <span className="badge text-white/60" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {meta.label}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-white/4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      {/* Info */}
      <div>
        <h3 className="text-sm font-semibold text-pearl leading-tight line-clamp-2 group-hover:text-white transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted">{year}</span>
          {genres[0] && (
            <>
              <span className="text-xs text-muted/40">·</span>
              <span className="text-xs text-muted truncate">{genres[0]}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
