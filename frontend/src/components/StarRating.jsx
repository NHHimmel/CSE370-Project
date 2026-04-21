import { useState } from 'react'

// 5 visual stars represent a 0–10 scale (each star = 2 points)
export default function StarRating({ value = 0, onChange, readonly = false, size = 24 }) {
  const [hover, setHover] = useState(0)
  const display = hover || value
  const stars = 5

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: stars }, (_, i) => {
        const starVal = (i + 1) * 2
        const filled  = display >= starVal
        const half    = !filled && display >= starVal - 1

        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(starVal)}
            onMouseEnter={() => !readonly && setHover(starVal)}
            onMouseLeave={() => !readonly && setHover(0)}
            className={`transition-transform duration-100 ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
            style={{ background: 'none', border: 'none', padding: 2 }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id={`star-grad-${i}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="50%"  stopColor={half ? '#ffffff' : (filled ? '#ffffff' : 'transparent')} />
                  <stop offset="50%"  stopColor="transparent" />
                </linearGradient>
              </defs>
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill={filled ? '#ffffff' : (half ? 'url(#star-grad-' + i + ')' : 'none')}
                stroke={filled || half ? '#ffffff' : 'rgba(255,255,255,0.25)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )
      })}
      {value > 0 && (
        <span className="ml-1 text-sm font-semibold text-pearl">{Number(value).toFixed(1)}</span>
      )}
    </div>
  )
}
