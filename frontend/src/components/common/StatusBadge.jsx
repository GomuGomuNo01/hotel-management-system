import { getStatusConfig } from '../../utils/getStatusColor';
import { cn } from '../../utils/cn';

export default function StatusBadge({ status, className }) {
  const config = getStatusConfig(status);
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
