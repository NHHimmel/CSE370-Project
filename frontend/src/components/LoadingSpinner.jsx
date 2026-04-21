export default function LoadingSpinner({ size = 40, text = '' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <svg width={size} height={size} viewBox="0 0 40 40" className="animate-spin">
        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3"
          strokeLinecap="round" strokeDasharray="60 40" />
      </svg>
      {text && <p className="text-sm text-muted">{text}</p>}
    </div>
  )
}
