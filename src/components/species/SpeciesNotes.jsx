import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StickyNote, Plus, Trash2, Calendar, MapPin, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function SpeciesNotes({ species, onClose }) {
  const [note, setNote] = useState('');
  const [observationDate, setObservationDate] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['speciesNotes', species.scientific_name],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.SpeciesNote.filter({
        species_scientific_name: species.scientific_name,
        created_by: user.email,
      }, '-created_date', 50);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.SpeciesNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speciesNotes', species.scientific_name] });
      setNote('');
      setObservationDate('');
      setLocation('');
      setTags('');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.SpeciesNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speciesNotes', species.scientific_name] });
    },
  });

  const handleAddNote = () => {
    if (!note.trim()) return;

    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
    
    addNoteMutation.mutate({
      species_scientific_name: species.scientific_name,
      note: note,
      observation_date: observationDate || undefined,
      location: location || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          <Card>
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-600" />
                Notes for {species.scientific_name}
              </CardTitle>
              {species.common_name && (
                <p className="text-sm text-slate-500">{species.common_name}</p>
              )}
            </CardHeader>

            <CardContent className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto space-y-6">
              {/* Add New Note */}
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h3 className="font-semibold text-slate-900 mb-3">Add New Note</h3>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Your observations, notes, or comments..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-24"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Observation Date
                      </label>
                      <Input
                        type="date"
                        value={observationDate}
                        onChange={(e) => setObservationDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Location
                      </label>
                      <Input
                        placeholder="e.g., Amazon Rainforest"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Tags (comma-separated)
                    </label>
                    <Input
                      placeholder="e.g., field study, behavior, habitat"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleAddNote}
                    disabled={!note.trim() || addNoteMutation.isPending}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>

              {/* Existing Notes */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Your Notes ({notes.length})
                </h3>
                {notes.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No notes yet. Add your first observation above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((noteItem) => (
                      <Card key={noteItem.id} className="bg-white">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {noteItem.note}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 mt-3">
                                {noteItem.observation_date && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(noteItem.observation_date), 'MMM d, yyyy')}
                                  </span>
                                )}
                                {noteItem.location && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {noteItem.location}
                                  </span>
                                )}
                                {noteItem.tags?.map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-xs text-slate-400 mt-2">
                                Added {format(new Date(noteItem.created_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNoteMutation.mutate(noteItem.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={onClose} variant="outline" className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}