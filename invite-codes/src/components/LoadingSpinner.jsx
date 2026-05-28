/**
 * Loading Spinner Component
 *
 * Reusable loading indicator with glassmorphism style.
 */
export default function LoadingSpinner({ size = 'md', text = 'Carregando...' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className={`${sizes[size]} relative`}>
        {/* Outer ring */}
        <div className={`${sizes[size]} rounded-full border-2 border-white/10 animate-[spin_1.5s_linear_infinite]`} />
        {/* Inner spinner */}
        <div
          className={`${sizes[size]} absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 animate-[spin_1s_cubic-bezier(0.68, -0.55, 0.27, 1.55)_infinite]`}
        />
      </div>
      {text && (
        <p className="text-sm text-white/60 font-medium tracking-wide">{text}</p>
      )}
    </div>
  );
}