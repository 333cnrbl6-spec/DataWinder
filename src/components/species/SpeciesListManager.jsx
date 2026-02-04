import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Share2, Copy, Check, List } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SpeciesListManager({ selectedSpecies, onClose }) {
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const queryClient = useQueryClient();

  const { data: myLists = [] } = useQuery({
    queryKey: ['speciesLists'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.SpeciesList.filter({ created_by: user.email }, '-created_date', 50);
    },
  });

  const createListMutation = useMutation({
    mutationFn: async (data) => {
      const shareToken = isPublic ? Math.random().toString(36).substring(2, 15) : null;
      return base44.entities.SpeciesList.create({
        ...data,
        share_token: shareToken,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speciesLists'] });
      setListName('');
      setDescription('');
      setIsPublic(false);
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (id) => base44.entities.SpeciesList.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speciesLists'] });
    },
  });

  const handleCreateList = () => {
    if (!listName.trim() || selectedSpecies.length === 0) return;
    
    createListMutation.mutate({
      name: listName,
      description: description,
      is_public: isPublic,
      species_ids: selectedSpecies.map(sp => sp.scientific_name),
    });
  };

  const copyShareLink = (token) => {
    const url = `${window.location.origin}${window.location.pathname}?list=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        <Card>
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5 text-emerald-600" />
              Manage Species Lists
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto space-y-6">
            {/* Create New List */}
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <h3 className="font-semibold text-slate-900 mb-3">
                Create New List ({selectedSpecies.length} species selected)
              </h3>
              <div className="space-y-3">
                <Input
                  placeholder="List name (e.g., Endangered Primates 2026)"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-20"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                  <span className="text-sm text-slate-700">
                    Make this list public and shareable
                  </span>
                </label>
                <Button
                  onClick={handleCreateList}
                  disabled={!listName.trim() || selectedSpecies.length === 0 || createListMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create List
                </Button>
              </div>
            </div>

            {/* My Lists */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">My Lists ({myLists.length})</h3>
              {myLists.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No lists created yet. Select species and create your first list above.
                </p>
              ) : (
                <div className="space-y-3">
                  {myLists.map((list) => (
                    <Card key={list.id} className="bg-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{list.name}</h4>
                            {list.description && (
                              <p className="text-sm text-slate-500 mt-1">{list.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-slate-400">
                                {list.species_ids?.length || 0} species
                              </span>
                              {list.is_public && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  Public
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {list.is_public && list.share_token && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyShareLink(list.share_token)}
                              >
                                {copiedToken === list.share_token ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Share2 className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteListMutation.mutate(list.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
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
  );
}