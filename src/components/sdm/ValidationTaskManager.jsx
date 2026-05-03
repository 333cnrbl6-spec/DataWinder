import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Calendar,
  Edit2,
  Send,
  Loader2
} from 'lucide-react';

/**
 * VALIDATION TASK MANAGER
 * Displays and manages field validation tasks
 */

export default function ValidationTaskManager({
  sdmRunId,
  projectId,
  selectedTask,
  teamMembers,
  onTaskUpdate
}) {
  const [task, setTask] = useState(selectedTask);
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    description: '',
    priority: 'medium',
    expected_field_visits: 5,
    notes: ''
  });

  useEffect(() => {
    setTask(selectedTask);
    if (selectedTask) {
      setEditData({
        description: selectedTask.description || '',
        priority: selectedTask.priority || 'medium',
        expected_field_visits: selectedTask.expected_field_visits || 5,
        notes: selectedTask.notes || ''
      });
    }
    base44.auth.me().then(setCurrentUser);
  }, [selectedTask]);

  const handleAssignTask = async (teamMemberEmail, teamMemberName) => {
    if (!task) return;

    try {
      setLoading(true);
      const response = await base44.functions.invoke('manageSdmValidationTask', {
        action: 'assign',
        taskId: task.id,
        data: {
          assignee_email: teamMemberEmail,
          assignee_name: teamMemberName
        }
      });

      if (response.data.success) {
        setTask(response.data.task);
        onTaskUpdate?.(response.data.task);
        setIsAssigning(false);
      }
    } catch (error) {
      console.error('Failed to assign task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!task) return;

    try {
      setLoading(true);
      const response = await base44.functions.invoke('manageSdmValidationTask', {
        action: 'update',
        taskId: task.id,
        data: editData
      });

      if (response.data.success) {
        setTask(response.data.task);
        onTaskUpdate?.(response.data.task);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkProgress = async () => {
    if (!task) return;

    try {
      setLoading(true);
      const response = await base44.functions.invoke('manageSdmValidationTask', {
        action: 'markProgress',
        taskId: task.id,
        data: {
          completed_field_visits: task.completed_field_visits + 1
        }
      });

      if (response.data.success) {
        setTask(response.data.task);
        onTaskUpdate?.(response.data.task);
      }
    } catch (error) {
      console.error('Failed to mark progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a task on the map to view details</p>
        </div>
      </div>
    );
  }

  const progressPct = Math.round(
    (task.completed_field_visits / task.expected_field_visits) * 100
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 sticky top-0 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-slate-900">{task.species_name}</h2>
            <p className="text-xs text-slate-500 mt-1 capitalize">
              {task.task_type.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="flex gap-1">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              task.status === 'completed' ? 'bg-green-100 text-green-800' :
              task.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
              task.status === 'open' ? 'bg-red-100 text-red-800' :
              'bg-slate-100 text-slate-800'
            }`}>
              {task.status.toUpperCase()}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
              task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {task.priority.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-900">
              Field Visits Progress
            </label>
            <span className="text-sm text-slate-600">
              {task.completed_field_visits}/{task.expected_field_visits}
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
          {currentUser?.email === task.assigned_to_email && task.status !== 'completed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkProgress}
              disabled={loading}
              className="mt-2 w-full gap-2 text-xs"
            >
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              Log Field Visit
            </Button>
          )}
        </div>

        {/* Assignment */}
        <div>
          <label className="text-sm font-semibold text-slate-900 block mb-2">
            Assigned To
          </label>
          {task.assigned_to_name ? (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <User className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-sm font-medium text-slate-900">{task.assigned_to_name}</div>
                <div className="text-xs text-slate-500">{task.assigned_to_email}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic mb-2">Unassigned</div>
          )}
          {(currentUser?.role === 'admin' || currentUser?.email === task.created_by_email) && (
            <div className="space-y-2">
              {isAssigning ? (
                <div className="space-y-2">
                  {teamMembers?.map(member => (
                    <Button
                      key={member.email}
                      size="sm"
                      variant="outline"
                      onClick={() => handleAssignTask(member.email, member.name)}
                      disabled={loading}
                      className="w-full text-xs justify-start gap-2"
                    >
                      <User className="w-3 h-3" />
                      {member.name}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAssigning(false)}
                    className="w-full text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsAssigning(true)}
                  className="w-full gap-2 text-xs"
                >
                  <Send className="w-3 h-3" />
                  Assign Task
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-semibold text-slate-900 block mb-2">
            Validation Area
          </label>
          <div className="text-xs text-slate-600 space-y-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>Latitude: {task.grid_bounds.min_lat.toFixed(3)}° to {task.grid_bounds.max_lat.toFixed(3)}°</div>
            <div>Longitude: {task.grid_bounds.min_lon.toFixed(3)}° to {task.grid_bounds.max_lon.toFixed(3)}°</div>
          </div>
        </div>

        {/* Suitability Range */}
        {task.suitability_range && (
          <div>
            <label className="text-sm font-semibold text-slate-900 block mb-2">
              Suitability Range
            </label>
            <div className="text-xs text-slate-600 space-y-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>Min: {task.suitability_range.min.toFixed(3)}</div>
              <div>Max: {task.suitability_range.max.toFixed(3)}</div>
              <div>Mean: {task.suitability_range.mean.toFixed(3)}</div>
            </div>
          </div>
        )}

        {/* Due Date */}
        {task.due_date && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div className="text-sm text-slate-700">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Description / Notes */}
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Description
              </label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full text-xs p-2 border border-slate-200 rounded"
                rows="3"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Notes
              </label>
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                className="w-full text-xs p-2 border border-slate-200 rounded"
                rows="2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateTask}
                disabled={loading}
                className="flex-1 gap-2 text-xs"
              >
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {task.description && (
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Description
                </label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {task.description}
                </p>
              </div>
            )}
            {task.notes && (
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Notes
                </label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {task.notes}
                </p>
              </div>
            )}
            {(currentUser?.role === 'admin' || currentUser?.email === task.assigned_to_email) && (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full gap-2 text-xs"
              >
                <Edit2 className="w-3 h-3" />
                Edit Task
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}