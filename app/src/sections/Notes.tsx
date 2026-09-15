import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Save,
  X,
  FileText,
  Clock,
  BookOpen
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getUserProgress, updateNotes } from '@/api/userActions';
import { getAllProblems } from '@/api/content';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface Note {
  id: string;           // UserProgress _id
  problemId: string;    // problem_id ref
  problemTitle: string;
  content: string;
  updatedAt: Date;
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({ content: '' });
  
  interface Problem {
    id: string;
    title: string;
    difficulty?: string;
  }
  const [problems, setProblems] = useState<Problem[]>([]);

  // New note creation state
  const [newNoteProblemId, setNewNoteProblemId] = useState('');
  const [problemSearch, setProblemSearch] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Fetch notes from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [progressData, problemsData] = await Promise.all([
          getUserProgress(),
          getAllProblems()
        ]);
        setProblems(problemsData);

        // Extract notes from progress entries that have non-empty notes
        const notesFromProgress: Note[] = progressData
          .filter((p: any) => p.notes && p.notes.trim() !== '')
          .map((p: any) => {
            const problem = problemsData.find((prob: Problem) => prob.id === p.problem_id);
            return {
              id: p.id,
              problemId: p.problem_id,
              problemTitle: problem?.title || 'Unknown Problem',
              content: p.notes,
              updatedAt: new Date(p.updatedAt)
            };
          })
          .sort((a: Note, b: Note) => b.updatedAt.getTime() - a.updatedAt.getTime());

        setNotes(notesFromProgress);
      } catch (e) {
        console.error('Failed to fetch notes', e);
        toast.error('Failed to load notes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredNotes = notes.filter(note =>
    note.problemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Problems available for new notes (not already having notes)
  const availableProblems = problems.filter(p => {
    const hasNote = notes.some(n => n.problemId === p.id);
    return !hasNote && p.title.toLowerCase().includes(problemSearch.toLowerCase());
  });

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedNote(null);
    setEditForm({ content: '' });
    setNewNoteProblemId('');
    setProblemSearch('');
  };

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(true);
    setIsCreating(false);
    setEditForm({ content: note.content });
  };

  const handleSave = async () => {
    if (isCreating) {
      if (!newNoteProblemId) {
        toast.error('Please select a problem');
        return;
      }
      if (!editForm.content.trim()) {
        toast.error('Note content is required');
        return;
      }

      try {
        const responseData = await updateNotes(newNoteProblemId, editForm.content);
        const realNoteId = responseData?._id || responseData?.id;
        
        if (!realNoteId) {
          throw new Error('Invalid ID returned from backend');
        }

        const problem = problems.find((p: Problem) => p.id === newNoteProblemId);
        const newNote: Note = {
          id: realNoteId,
          problemId: newNoteProblemId,
          problemTitle: problem?.title || 'Unknown Problem',
          content: editForm.content,
          updatedAt: new Date()
        };
        setNotes([newNote, ...notes]);
        toast.success('Note created successfully');
      } catch {
        toast.error('Failed to create note');
        return;
      }
    } else if (selectedNote) {
      if (!editForm.content.trim()) {
        toast.error('Note content is required');
        return;
      }

      try {
        await updateNotes(selectedNote.problemId, editForm.content);
        setNotes(notes.map(n =>
          n.id === selectedNote.id
            ? { ...n, content: editForm.content, updatedAt: new Date() }
            : n
        ));
        toast.success('Note updated successfully');
      } catch {
        toast.error('Failed to update note');
        return;
      }
    }

    setIsEditing(false);
    setIsCreating(false);
    setSelectedNote(null);
  };

  const handleDelete = (note: Note) => {
    setNoteToDelete(note);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      // Delete note by setting it to empty string
      await updateNotes(noteToDelete.problemId, '');
      setNotes(notes.filter(n => n.id !== noteToDelete.id));
      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null);
      }
      toast.success('Note deleted');
    } catch (e) {
      console.error('Failed to delete note', e);
      toast.error('Failed to delete note');
    } finally {
      setNoteToDelete(null);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (isCreating) {
      setSelectedNote(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <p className="text-[#b6b1ad]">Loading notes...</p>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen pt-24 pb-12">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 mb-6 border-b border-[rgba(241,238,234,0.2)]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium text-[#f1eeea] tracking-[-0.015em] mb-2">
              Notes
            </h1>
            <p className="text-[0.9375rem] text-[#b6b1ad]">
              Save and organize your learnings (<span className="tnum">{notes.length}</span> notes)
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="btn-primary text-[0.875rem]"
          >
            <Plus className="w-4 h-4" />
            New note
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Notes List */}
          <div className="lg:col-span-1">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8f8a85]" />
              <Input
                type="text"
                placeholder="Search notes…"
                aria-label="Search notes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#222225] border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] rounded-[6px] focus-visible:border-[#f0997d]"
              />
            </div>

            {/* Notes */}
            <div className="space-y-0 max-h-[600px] overflow-y-auto pr-2 ruled">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => !isEditing && setSelectedNote(note)}
                  className={`w-full text-left px-3 py-3 row-interactive ${
                    selectedNote?.id === note.id
                      ? 'bg-[#2c2b30]'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#f1eeea] truncate mb-1">{note.problemTitle}</h3>
                      <p className="text-[#8f8a85] text-[0.8125rem] line-clamp-2 mb-2">
                        {note.content}
                      </p>
                      <div className="flex items-center gap-2 text-[0.75rem] text-[#8f8a85]">
                        <Clock className="w-3 h-3" />
                        {formatDate(note.updatedAt)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {filteredNotes.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-6 h-6 text-[#3a393e] mx-auto mb-3" />
                  <p className="text-[#8f8a85] text-[0.8125rem]">
                    {notes.length === 0 ? 'No notes yet. Create one.' : 'No notes found'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Note Detail / Editor */}
          <div className="lg:col-span-2">
            {isEditing ? (
              <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[1.125rem] font-medium text-[#f1eeea]">
                    {isCreating ? 'Create note' : 'Edit note'}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      aria-label="Cancel editing"
                      className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#f1eeea]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      aria-label="Save note"
                      className="p-1.5 icon-btn text-[#f0997d] hover:text-[#f5b8a3]"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {isCreating && (
                    <div>
                      <label className="text-[0.75rem] text-[#8f8a85] mb-1 block">Select problem</label>
                      <Input
                        type="text"
                        value={problemSearch}
                        onChange={(e) => setProblemSearch(e.target.value)}
                        placeholder="Search for a problem…"
                        aria-label="Search for a problem"
                        className="bg-[#19191b] border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] rounded-[6px] mb-2 focus-visible:border-[#f0997d]"
                      />
                      {problemSearch && (
                        <div className="max-h-40 overflow-y-auto rounded-[4px] border border-[rgba(241,238,234,0.1)] bg-[#19191b]">
                          {availableProblems.slice(0, 8).map((p: Problem) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setNewNoteProblemId(p.id);
                                setProblemSearch(p.title);
                              }}
                              className={`w-full text-left px-3 py-2 text-[0.8125rem] row-interactive ${
                                newNoteProblemId === p.id
                                  ? 'bg-[#2c2b30] text-[#f0997d]'
                                  : 'text-[#f1eeea]'
                              }`}
                            >
                              <span>{p.title}</span>
                              <span className={`ml-2 text-[0.75rem] difficulty-${p.difficulty?.toLowerCase()}`}>
                                {p.difficulty}
                              </span>
                            </button>
                          ))}
                          {availableProblems.length === 0 && (
                            <p className="px-3 py-2 text-[0.8125rem] text-[#8f8a85]">No matching problems</p>
                          )}
                        </div>
                      )}
                      {newNoteProblemId && !problemSearch.includes(problems.find((p: Problem) => p.id === newNoteProblemId)?.title || '') && (
                        <p className="text-[0.75rem] text-[#f0997d] mt-1">
                          Selected: {problems.find((p: Problem) => p.id === newNoteProblemId)?.title}
                        </p>
                      )}
                    </div>
                  )}

                  {!isCreating && selectedNote && (
                    <div className="px-3 py-2 rounded-[4px] bg-[#2c2b30] text-[0.8125rem] text-[#b6b1ad]">
                      Problem: <span className="text-[#f1eeea]">{selectedNote.problemTitle}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[0.75rem] text-[#8f8a85] mb-1 block">Notes</label>
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      placeholder="Write your notes here… Key insights, approach, time complexity."
                      rows={15}
                      className="w-full px-4 py-3 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] focus:outline-none focus-visible:border-[#f0997d] resize-none font-mono text-[0.8125rem] leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ) : selectedNote ? (
              <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[1.25rem] font-medium text-[#f1eeea] tracking-[-0.015em] mb-1">{selectedNote.problemTitle}</h2>
                    <div className="flex items-center gap-3 text-[0.8125rem] text-[#8f8a85]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Last updated {formatDate(selectedNote.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(selectedNote)}
                      aria-label="Edit note"
                      className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#f1eeea]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedNote)}
                      aria-label="Delete note"
                      className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#d98a76]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none">
                  <div className="markdown-content text-[#f1eeea] text-[0.9375rem] whitespace-pre-wrap">
                    {selectedNote.content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-12 text-center">
                <BookOpen className="w-6 h-6 text-[#3a393e] mx-auto mb-4" />
                <h3 className="text-[1.125rem] font-medium text-[#f1eeea] mb-2">Select a note to view</h3>
                <p className="text-[#8f8a85] text-[0.8125rem] mb-4">Or create a new note to get started</p>
                <button
                  onClick={handleCreate}
                  className="btn-secondary text-[0.8125rem]"
                >
                  Create note
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent className="bg-[#222225] border-[rgba(241,238,234,0.2)] text-[#f1eeea] max-w-md rounded-[10px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[1.125rem] font-medium text-[#f1eeea]">
              Delete note for {noteToDelete?.problemTitle}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#b6b1ad] text-[0.8125rem]">
              This action cannot be undone. Are you sure you want to permanently delete this note?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="bg-transparent border-[rgba(241,238,234,0.2)] text-[#f1eeea] hover:bg-[#2c2b30] hover:text-[#f1eeea] rounded-[4px] transition-colors duration-[var(--af-dur-fast)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#d98a76] text-[#19191b] hover:bg-[#e0755f] rounded-[4px] transition-colors duration-[var(--af-dur-fast)]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
