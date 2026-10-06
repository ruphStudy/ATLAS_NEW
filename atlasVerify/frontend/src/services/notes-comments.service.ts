import { apiClient } from '@/lib/api/axios';
import type { CreateNotePayload, Note, NoteAttachment, NoteEditHistoryEntry, NoteFilterParams, PaginatedResult, UpdateNotePayload } from '@/types';

const BASE = '/notes-comments';

export async function createNote(payload: CreateNotePayload): Promise<Note> {
  const { data } = await apiClient.post<Note>(`${BASE}/notes`, payload);
  return data;
}

export async function listNotes(params: NoteFilterParams = {}): Promise<PaginatedResult<Note>> {
  const { data } = await apiClient.get<PaginatedResult<Note>>(`${BASE}/notes`, { params });
  return data;
}

export async function getNoteById(id: string): Promise<Note> {
  const { data } = await apiClient.get<Note>(`${BASE}/notes/${id}`);
  return data;
}

export async function updateNote(id: string, payload: UpdateNotePayload): Promise<Note> {
  const { data } = await apiClient.patch<Note>(`${BASE}/notes/${id}`, payload);
  return data;
}

export async function removeNote(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/notes/${id}`);
}

export async function listNoteReplies(id: string): Promise<Note[]> {
  const { data } = await apiClient.get<Note[]>(`${BASE}/notes/${id}/replies`);
  return data;
}

export async function getNoteEditHistory(id: string): Promise<NoteEditHistoryEntry[]> {
  const { data } = await apiClient.get<NoteEditHistoryEntry[]>(`${BASE}/notes/${id}/history`);
  return data;
}

export async function pinNote(id: string): Promise<Note> {
  const { data } = await apiClient.post<Note>(`${BASE}/notes/${id}/pin`);
  return data;
}

export async function unpinNote(id: string): Promise<Note> {
  const { data } = await apiClient.post<Note>(`${BASE}/notes/${id}/unpin`);
  return data;
}

export async function resolveNote(id: string): Promise<Note> {
  const { data } = await apiClient.post<Note>(`${BASE}/notes/${id}/resolve`);
  return data;
}

export async function unresolveNote(id: string): Promise<Note> {
  const { data } = await apiClient.post<Note>(`${BASE}/notes/${id}/unresolve`);
  return data;
}

export async function archiveNote(id: string): Promise<Note> {
  const { data } = await apiClient.post<Note>(`${BASE}/notes/${id}/archive`);
  return data;
}

export async function restoreNote(id: string): Promise<Note> {
  const { data } = await apiClient.post<Note>(`${BASE}/notes/${id}/restore`);
  return data;
}

export async function listNoteAttachments(id: string): Promise<NoteAttachment[]> {
  const { data } = await apiClient.get<NoteAttachment[]>(`${BASE}/notes/${id}/attachments`);
  return data;
}

export async function addNoteAttachment(id: string, fileId: string): Promise<NoteAttachment> {
  const { data } = await apiClient.post<NoteAttachment>(`${BASE}/notes/${id}/attachments`, { fileId });
  return data;
}

export async function removeNoteAttachment(id: string, attachmentId: string): Promise<void> {
  await apiClient.delete(`${BASE}/notes/${id}/attachments/${attachmentId}`);
}
