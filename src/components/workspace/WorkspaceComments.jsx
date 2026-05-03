import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Trash2, CheckCircle2, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ProcessingFeedback from '@/components/ui/ProcessingFeedback';

export default function WorkspaceComments({ projectId, sdmRunId, occurrenceId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filter, setFilter] = useState('all');

  // Load comments and user on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Build query filter
        const queryFilter = { project_id: projectId };
        if (sdmRunId) queryFilter.sdm_run_id = sdmRunId;
        if (occurrenceId) queryFilter.occurrence_id = occurrenceId;

        const fetchedComments = await base44.entities.WorkspaceComment.filter(
          queryFilter,
          '-created_date',
          100
        );
        setComments(fetchedComments);
      } catch (error) {
        console.error('Failed to load comments:', error);
      }
    };

    loadData();

    // Subscribe to real-time updates
    const unsubscribe = base44.entities.WorkspaceComment.subscribe((event) => {
      if (event.type === 'create') {
        setComments(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setComments(prev => prev.map(c => c.id === event.id ? event.data : c));
      } else if (event.type === 'delete') {
        setComments(prev => prev.filter(c => c.id !== event.id));
      }
    });

    return unsubscribe;
  }, [projectId, sdmRunId, occurrenceId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const commentData = {
        project_id: projectId,
        ...(sdmRunId && { sdm_run_id: sdmRunId }),
        ...(occurrenceId && { occurrence_id: occurrenceId }),
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        content: newComment,
        comment_type: 'general'
      };

      await base44.entities.WorkspaceComment.create(commentData);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await base44.entities.WorkspaceComment.delete(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleResolveComment = async (commentId, resolved) => {
    try {
      await base44.entities.WorkspaceComment.update(commentId, {
        resolved: !resolved,
        resolved_by: !resolved ? currentUser.email : null
      });
    } catch (error) {
      console.error('Failed to resolve comment:', error);
    }
  };

  const filteredComments = filter === 'all'
    ? comments
    : comments.filter(c => c.resolved === (filter === 'resolved'));

  const typeColors = {
    general: 'bg-blue-100 text-blue-800',
    question: 'bg-purple-100 text-purple-800',
    concern: 'bg-red-100 text-red-800',
    suggestion: 'bg-green-100 text-green-800',
    result_feedback: 'bg-amber-100 text-amber-800'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Team Comments ({filteredComments.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={filter === 'resolved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('resolved')}
              className="text-xs"
            >
              Resolved
            </Button>
            <Button
              variant={filter === 'open' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('open')}
              className="text-xs"
            >
              Open
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        <div className="flex gap-2 pb-4 border-b">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            disabled={loading}
            className="text-sm"
          />
          <Button
            onClick={handleAddComment}
            disabled={loading || !newComment.trim()}
            className="bg-bangor-red hover:bg-bangor-red/90"
          >
            Post
          </Button>
        </div>

        {/* Comments List */}
        {filteredComments.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No comments yet</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredComments.map(comment => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${
                  comment.resolved
                    ? 'bg-slate-50 border-slate-200 opacity-75'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {comment.author_name}
                      </span>
                      <Badge className={typeColors[comment.comment_type]}>
                        {comment.comment_type}
                      </Badge>
                      {comment.resolved && (
                        <Badge className="bg-green-100 text-green-800">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDistanceToNow(new Date(comment.created_date), {
                        addSuffix: true
                      })}
                    </p>
                  </div>
                  {currentUser?.email === comment.author_email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-700" />
                    </Button>
                  )}
                </div>

                <p className="text-sm text-slate-700 mb-2">{comment.content}</p>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleResolveComment(comment.id, comment.resolved)}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 mr-1 ${
                      comment.resolved ? 'text-green-600' : 'text-slate-400'
                    }`} />
                    {comment.resolved ? 'Unresolve' : 'Resolve'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}