import { getStatusConfig } from '../../utils/getStatusColor';
import { cn } from '../../utils/cn';

export default function StatusBadge({ status, className }) {
  const config = getStatusConfig(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        config.color,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </span>
  );
}
