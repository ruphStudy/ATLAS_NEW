interface AttachmentLike {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

export function AttachmentsList({ attachments }: { attachments?: AttachmentLike[] | null }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="sm:col-span-2">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Attachments</p>
      <ul className="space-y-1">
        {attachments.map((a, i) => (
          <li key={i}>
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              {a.name}
            </a>
            {a.sizeBytes != null && <span className="ml-1 text-xs text-muted-foreground">({Math.round(a.sizeBytes / 1024)} KB)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
