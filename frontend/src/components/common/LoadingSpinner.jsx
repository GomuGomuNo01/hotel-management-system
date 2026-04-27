export default function LoadingSpinner({ label = 'Chargement...', size = 'md', fullPage = false }) {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-[3px]',
    xl: 'h-16 w-16 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size] || sizes.md} rounded-full border-brand-200 border-t-brand-600 animate-spin`}
        role="status"
        aria-label={label}
      />
      {label && (
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
          {label}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      {spinner}
    </div>
  );
}
