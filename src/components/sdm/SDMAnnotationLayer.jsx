import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Rectangle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * SDM ANNOTATION LAYER
 * Renders validation task polygons on top of SDM prediction map
 * Supports task creation and selection
 */

export default function SDMAnnotationLayer({
  sdmRunId,
  projectId,
  onSelectTask,
  onCreateTask,
  editMode = false
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const map = useMap();
  const [drawingBox, setDrawingBox] = useState(null);

  // Load tasks
  useEffect(() => {
    loadTasks();

    // Subscribe to real-time updates
    const unsubscribe = base44.entities.SDMValidationTask.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        if (event.data.sdm_run_id === sdmRunId) {
          loadTasks();
        }
      }
    });

    return unsubscribe;
  }, [sdmRunId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('manageSdmValidationTask', {
        action: 'list',
        data: { sdm_run_id: sdmRunId }
      });

      if (response.data.success) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Drawing mode
  useEffect(() => {
    if (!editMode || !map) return;

    let isDrawing = false;
    let startLat = null;
    let startLng = null;
    let tempRectangle = null;

    const handleMouseDown = (e) => {
      isDrawing = true;
      startLat = e.latlng.lat;
      startLng = e.latlng.lng;
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;

      if (tempRectangle) {
        map.removeLayer(tempRectangle);
      }

      const bounds = [
        [Math.min(startLat, e.latlng.lat), Math.min(startLng, e.latlng.lng)],
        [Math.max(startLat, e.latlng.lat), Math.max(startLng, e.latlng.lng)]
      ];

      tempRectangle = L.rectangle(bounds, {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.7,
        fill: true,
        fillOpacity: 0.2
      }).addTo(map);
    };

    const handleMouseUp = (e) => {
      if (!isDrawing) return;
      isDrawing = false;

      if (tempRectangle) {
        map.removeLayer(tempRectangle);
      }

      const bounds = [
        [Math.min(startLat, e.latlng.lat), Math.min(startLng, e.latlng.lng)],
        [Math.max(startLat, e.latlng.lat), Math.max(startLng, e.latlng.lng)]
      ];

      const gridBounds = {
        min_lat: bounds[0][0],
        min_lon: bounds[0][1],
        max_lat: bounds[1][0],
        max_lon: bounds[1][1]
      };

      onCreateTask?.(gridBounds);
      startLat = null;
      startLng = null;
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
    };
  }, [editMode, map, onCreateTask]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'in_progress': return '#f59e0b';
      case 'open': return '#ef4444';
      case 'cancelled': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  return (
    <>
      {tasks.map(task => (
        <Rectangle
          key={task.id}
          bounds={[
            [task.grid_bounds.min_lat, task.grid_bounds.min_lon],
            [task.grid_bounds.max_lat, task.grid_bounds.max_lon]
          ]}
          color={task.color || getStatusColor(task.status)}
          weight={2}
          opacity={0.8}
          fill={true}
          fillOpacity={0.2}
          eventHandlers={{
            click: () => onSelectTask?.(task)
          }}
        >
          <Popup closeButton={true}>
            <div className="text-xs max-w-xs">
              <div className="font-bold text-slate-900">{task.species_name}</div>
              <div className="text-slate-600 text-[11px] mt-1">
                {task.task_type.replace(/_/g, ' ').toUpperCase()}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  task.status === 'completed' ? 'bg-green-100 text-green-800' :
                  task.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                  task.status === 'open' ? 'bg-red-100 text-red-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {task.status.toUpperCase()}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.priority.toUpperCase()}
                </span>
              </div>
              {task.assigned_to_name && (
                <div className="text-slate-600 text-[11px] mt-2">
                  Assigned: {task.assigned_to_name}
                </div>
              )}
              {task.expected_field_visits && (
                <div className="text-slate-600 text-[11px] mt-1">
                  Progress: {task.completed_field_visits}/{task.expected_field_visits} visits
                </div>
              )}
            </div>
          </Popup>
        </Rectangle>
      ))}
    </>
  );
}