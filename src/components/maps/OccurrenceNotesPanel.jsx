import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, AlertCircle, CheckCircle2, HelpCircle, Trash2 } from 'lucide-react';

export default function OccurrenceNotesPanel({ speciesId, lat, lon, speciesName, source, occurrenceDate }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [validationStatus, setValidationStatus] = useState('unreviewed');
  const [confidence, setConfidence] = useState(75);
  const [tags, setTags] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchNotes();
    loadUser();
  }, [speciesId, lat, lon]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const allNotes = await base44.entities.OccurrenceNote.filter({
        species_id: speciesId,
        latitude: lat,
        longitude: lon
      });
      setNotes(allNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      
      await base44.entities.OccurrenceNote.create({
        species_id: speciesId,
        species_name: speciesName,
        latitude: lat,
        longitude: lon,
        source: source || 'Manual',
        occurrence_date: occurrenceDate,
        note_text: newNote,
        validation_status: validationStatus,
        confidence_score: confidence,
        tags: tagArray,
        expert_email: user.email,
        expert_name: user.full_name
      });

      setNewNote('');
      setValidationStatus('unreviewed');
      setConfidence(75);
      setTags('');
      await fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await base44.entities.OccurrenceNote.delete(noteId);
      await fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'questionable':
        return <HelpCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <MessageCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const statusColors = {
    valid: 'bg-green-100 text-green-800',
    invalid: 'bg-red-100 text-red-800',
    questionable: 'bg-yellow-100 text-yellow-800',
    unreviewed: 'bg-slate-100 text-slate-800'
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-slate-600" />
          <CardTitle className="text-base">Expert Notes</CardTitle>
          <Badge variant="outline" className="ml-auto">{notes.length}</Badge>
        </div>
        <div className="text-xs text-slate-500 mt-2">
          {source && <span>Source: {source}</span>}
          {occurrenceDate && <span className="ml-2">Date: {occurrenceDate}</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Existing Notes */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {notes.map(note => (
            <div key={note.id} className="border rounded-lg p-3 bg-slate-50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(note.validation_status)}
                  <Badge className={statusColors[note.validation_status]} variant="outline">
                    {note.validation_status}
                  </Badge>
                </div>
                {user?.email === note.expert_email && (
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-slate-500" />
                  </button>
                )}
              </div>

              <p className="text-sm text-slate-700">{note.note_text}</p>

              {note.tags && note.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {note.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{note.expert_name}</span>
                {note.confidence_score !== undefined && (
                  <span>Confidence: {note.confidence_score}%</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Note */}
        {user && (
          <div className="border-t pt-4 space-y-3">
            <Textarea
              placeholder="Add your expert observation or validation note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="text-sm h-20 resize-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <Select value={validationStatus} onValueChange={setValidationStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unreviewed">Unreviewed</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="questionable">Questionable</SelectItem>
                  <SelectItem value="invalid">Invalid</SelectItem>
                </SelectContent>
              </Select>

              <input
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="h-8"
                title="Confidence score"
              />
            </div>

            <div className="text-xs text-slate-500 text-center">
              Confidence: {confidence}%
            </div>

            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="text-xs w-full px-2 py-1.5 border rounded-md"
            />

            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || loading}
              size="sm"
              className="w-full"
            >
              <Send className="w-3 h-3 mr-1" />
              Add Note
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}