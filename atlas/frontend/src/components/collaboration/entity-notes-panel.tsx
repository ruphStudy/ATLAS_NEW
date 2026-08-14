'use client';

import { useState } from 'react';
import { MessageSquare, Pin, PinOff, Check, RotateCcw, Trash2, Reply as ReplyIcon, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import {
  useArchiveNote,
  useCreateNote,
  useNoteReplies,
  useNotes,
  usePinNote,
  useResolveNote,
  useUnpinNote,
  useUnresolveNote,
  useUpdateNote,
  useUsers,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDistanceToNow } from '@/lib/utils';
import type { Note, NoteVisibility } from '@/types';

const VISIBILITY_OPTIONS: { value: NoteVisibility; label: string }[] = [
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'ENTITY_PARTICIPANTS', label: 'Participants only' },
  { value: 'TEAM', label: 'My team' },
  { value: 'PRIVATE', label: 'Private (only me)' },
];

/**
 * Reusable entity-level collaboration thread — notes/comments with replies, mentions,
 * pin/resolve and visibility controls. Drop into any entity detail page by passing the
 * entity's own type/id (matches the generic `notes-comments` backend API 1:1).
 */
export function EntityNotesPanel({ entityType, entityId, module, title = 'Notes & Comments' }: { entityType: string; entityId: string; module?: string; title?: string }) {
  const notes = useNotes({ entityType, entityId, topLevelOnly: true, status: 'ACTIVE', sortBy: 'createdAt', sortOrder: 'desc', limit: 50 });
  const createNote = useCreateNote();
  const users = useUsers({ limit: 100 });
  const userOptions = (users.data?.items ?? []).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<NoteVisibility>('WORKSPACE');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  function toggleMention(userId: string) {
    setMentionedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a note or comment…" rows={2} />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value as NoteVisibility)} options={VISIBILITY_OPTIONS} className="h-8 w-44 text-xs" />
            {userOptions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {userOptions.slice(0, 8).map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => toggleMention(u.value)}
                    className={
                      mentionedUserIds.includes(u.value)
                        ? 'rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-[10px] text-primary'
                        : 'rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground'
                    }
                  >
                    @{u.label}
                  </button>
                ))}
              </div>
            )}
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => {
                createNote.mutate(
                  { noteType: 'COMMENT', module, entityType, entityId, content, visibility, mentionedUserIds: mentionedUserIds.length ? mentionedUserIds : undefined },
                  { onSuccess: () => { setContent(''); setMentionedUserIds([]); } },
                );
              }}
              disabled={!content || createNote.isPending}
            >
              Post
            </Button>
          </div>
        </div>

        {notes.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !notes.data || notes.data.data.length === 0 ? (
          <EmptyState title="No notes yet" description="Start the conversation on this record." className="border-none py-8" />
        ) : (
          <div className="space-y-3">
            {notes.data.data.map((note) => (
              <NoteThread key={note.id} note={note} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NoteThread({ note }: { note: Note }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const pin = usePinNote();
  const unpin = useUnpinNote();
  const resolve = useResolveNote();
  const unresolve = useUnresolveNote();
  const archive = useArchiveNote();
  const updateNote = useUpdateNote(note.id);
  const createNote = useCreateNote();
  const replies = useNoteReplies(note.id);

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [replyContent, setReplyContent] = useState('');
  const [showReplyBox, setShowReplyBox] = useState(false);

  const isOwn = note.authorId === currentUserId;

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-foreground">{note.authorId}</span>
            {note.isPinned && <Pin className="h-3 w-3 text-primary" />}
            {note.isResolved && (
              <Badge variant="success" className="text-[9px]">
                Resolved
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(note.createdAt)}</span>
            {note.isEdited && <span className="text-xs text-muted-foreground">(edited)</span>}
            {note.visibility !== 'WORKSPACE' && (
              <Badge variant="secondary" className="text-[9px] capitalize">
                {note.visibility.toLowerCase().replace('_', ' ')}
              </Badge>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateNote.mutate({ content: editContent }, { onSuccess: () => setEditing(false) })} disabled={updateNote.isPending}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-foreground">{note.content}</p>
          )}

          {note.mentionedUserIds.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {note.mentionedUserIds.map((id) => (
                <Badge key={id} variant="secondary" className="text-[9px]">
                  @{id}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => (note.isPinned ? unpin.mutate(note.id) : pin.mutate(note.id))} title={note.isPinned ? 'Unpin' : 'Pin'} className="text-muted-foreground hover:text-foreground">
            {note.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => (note.isResolved ? unresolve.mutate(note.id) : resolve.mutate(note.id))}
            title={note.isResolved ? 'Unresolve' : 'Resolve'}
            className="text-muted-foreground hover:text-success"
          >
            {note.isResolved ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          {isOwn && (
            <button onClick={() => setEditing(true)} title="Edit" className="text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {isOwn && (
            <button onClick={() => archive.mutate(note.id)} title="Archive" className="text-muted-foreground hover:text-danger">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs">
        <button
          onClick={() => {
            setExpanded((v) => !v);
            setShowReplyBox(false);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? 'Hide replies' : 'View replies'}
        </button>
        <button onClick={() => setShowReplyBox((v) => !v)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ReplyIcon className="h-3 w-3" />
          Reply
        </button>
      </div>

      {showReplyBox && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          <Textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Write a reply…" rows={2} />
          <Button
            size="sm"
            onClick={() =>
              createNote.mutate(
                { noteType: 'COMMENT', module: note.module ?? undefined, entityType: note.entityType, entityId: note.entityId, parentId: note.id, content: replyContent, visibility: note.visibility },
                { onSuccess: () => { setReplyContent(''); setExpanded(true); } },
              )
            }
            disabled={!replyContent || createNote.isPending}
          >
            Post reply
          </Button>
        </div>
      )}

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-border pt-2 pl-3">
          {replies.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : !replies.data || replies.data.length === 0 ? (
            <p className="text-xs text-muted-foreground">No replies yet.</p>
          ) : (
            replies.data.map((r) => (
              <div key={r.id} className="text-xs">
                <span className="font-medium text-foreground">{r.authorId}</span>{' '}
                <span className="text-muted-foreground">{formatDistanceToNow(r.createdAt)}</span>
                <p className="mt-0.5 text-foreground">{r.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
