import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertCircle, Users, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SAMPLE_ALERTS = [
  {
    id: 1,
    type: 'deadline',
    title: 'Survey Deadline Approaching',
    message: 'Your "Woodland Bird Survey" is due in 3 days',
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    timestamp: '2 hours ago'
  },
  {
    id: 2,
    type: 'team',
    title: 'New Observation Added',
    message: 'Sarah Jones recorded a Great Crested Newt at Sherwood Forest',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    timestamp: '4 hours ago'
  },
  {
    id: 3,
    type: 'status',
    title: 'Species Status Updated',
    message: 'Hawfinch conservation status changed to Vulnerable',
    icon: TrendingUp,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    timestamp: '1 day ago'
  }
];

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_ALERTS);

  const handleDismiss = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-bangor-red text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 z-50"
          >
            <Card className="shadow-lg">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              {/* Notifications List */}
              <CardContent className="p-0 max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map(notification => {
                      const Icon = notification.icon;
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 ${notification.bgColor} hover:opacity-80 transition cursor-pointer`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-5 h-5 ${notification.color} flex-shrink-0 mt-0.5`} />
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 text-sm">
                                {notification.title}
                              </p>
                              <p className="text-xs text-slate-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-500 mt-2">
                                {notification.timestamp}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDismiss(notification.id)}
                              className="p-1 hover:bg-white rounded opacity-50 hover:opacity-100"
                            >
                              <X className="w-3 h-3 text-slate-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-slate-200 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    View all notifications
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}