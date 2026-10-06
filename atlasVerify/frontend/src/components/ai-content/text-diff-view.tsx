import { diffWords } from '@/lib/text-diff';
import { cn } from '@/lib/utils';

interface TextDiffViewProps {
  before?: string | null;
  after?: string | null;
  className?: string;
}

/** Inline word-level diff highlighting — added text in green, removed text struck through in red. */
export function TextDiffView({ before, after, className }: TextDiffViewProps) {
  const beforeText = before ?? '';
  const afterText = after ?? '';

  if (!beforeText && !afterText) {
    return <p className={cn('text-sm text-muted-foreground', className)}>—</p>;
  }
  if (!beforeText) {
    return <p className={cn('text-sm text-foreground', className)}>{afterText}</p>;
  }
  if (beforeText === afterText) {
    return <p className={cn('text-sm text-foreground', className)}>{afterText}</p>;
  }

  const ops = diffWords(beforeText, afterText);

  return (
    <p className={cn('text-sm leading-relaxed', className)}>
      {ops.map((op, i) => {
        if (op.type === 'same') return <span key={i}>{op.text}</span>;
        if (op.type === 'added') return (
          <span key={i} className="rounded-sm bg-success/15 text-success">{op.text}</span>
        );
        return (
          <span key={i} className="rounded-sm bg-danger/15 text-danger line-through">{op.text}</span>
        );
      })}
    </p>
  );
}
