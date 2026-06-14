import { Loader2 } from 'lucide-react'

const sizes = {
  sm: { spinner: 16, text: 'text-xs' },
  md: { spinner: 24, text: 'text-sm' },
  lg: { spinner: 36, text: 'text-base' },
}

export default function LoadingSpinner({ size = 'md', text = '' }) {
  const config = sizes[size] || sizes.md

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2
        size={config.spinner}
        className="text-teal-500 animate-spin"
      />
      {text && (
        <p className={`text-slate-400 ${config.text} font-medium`}>{text}</p>
      )}
    </div>
  )
}
