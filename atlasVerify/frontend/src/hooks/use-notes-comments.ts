import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as notesService from '@/services/notes-comments.service';
import { useToast } from './use-toast';
import type { CreateNotePayload, NoteFilterParams, UpdateNotePayload } from '@/types';

const NOTES_KEY = 'notes-comments';

export function useNotes(params: NoteFilterParams) {
  return useQuery({
    queryKey: [NOTES_KEY, 'list', params],
    queryFn: () => notesService.listNotes(params),
    enabled: !!params.entityType && !!params.entityId,
    staleTime: 15 * 1000,
  });
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: [NOTES_KEY, 'detail', id],
    queryFn: () => notesService.getNoteById(id as string),
    enabled: !!id,
  });
}

export function useNoteReplies(id: string | undefined) {
  return useQuery({
    queryKey: [NOTES_KEY, 'replies', id],
    queryFn: () => notesService.listNoteReplies(id as string),
    enabled: !!id,
  });
}

export function useNoteEditHistory(id: string | undefined) {
  return useQuery({
    queryKey: [NOTES_KEY, 'history', id],
    queryFn: () => notesService.getNoteEditHistory(id as string),
    enabled: !!id,
  });
}

export function useNoteAttachments(id: string | undefined) {
  return useQuery({
    queryKey: [NOTES_KEY, 'attachments', id],
    queryFn: () => notesService.listNoteAttachments(id as string),
    enabled: !!id,
  });
}

function invalidateNotes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [NOTES_KEY] });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateNotePayload) => notesService.createNote(payload),
    onSuccess: () => invalidateNotes(queryClient),
    onError: () => toast.error('Could not post', 'Please try again.'),
  });
}

export function useUpdateNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateNotePayload) => notesService.updateNote(id, payload),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useRemoveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesService.removeNote(id),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

function useNoteActionMutation(fn: (id: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function usePinNote() {
  return useNoteActionMutation(notesService.pinNote);
}

export function useUnpinNote() {
  return useNoteActionMutation(notesService.unpinNote);
}

export function useResolveNote() {
  return useNoteActionMutation(notesService.resolveNote);
}

export function useUnresolveNote() {
  return useNoteActionMutation(notesService.unresolveNote);
}

export function useArchiveNote() {
  return useNoteActionMutation(notesService.archiveNote);
}

export function useRestoreNote() {
  return useNoteActionMutation(notesService.restoreNote);
}
