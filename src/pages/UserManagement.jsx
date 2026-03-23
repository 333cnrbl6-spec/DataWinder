import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Search, Trash2, SnowflakeIcon, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ROLE_STYLES = {
  admin: 'bg-bangor-red/10 text-bangor-red border-bangor-red/30',
  user: 'bg-green-100 text-green-700 border-green-200',
  frozen: 'bg-slate-200 text-slate-500 border-slate-300',
};

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'freeze'|'remove', ids: [] }
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all_users'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  );

  const toggleAll = () => {
    const selectableIds = filtered.filter(u => u.id !== currentUser?.id).map(u => u.id);
    if (selectedIds.length === selectableIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableIds);
    }
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      const { type, ids } = confirmAction;
      if (type === 'freeze') {
        await Promise.all(ids.map(id => base44.entities.User.update(id, { role: 'frozen' })));
        toast.success(`${ids.length} user(s) frozen`);
      } else if (type === 'unfreeze') {
        await Promise.all(ids.map(id => base44.entities.User.update(id, { role: 'user' })));
        toast.success(`${ids.length} user(s) unfrozen`);
      } else if (type === 'remove') {
        await Promise.all(ids.map(id => base44.entities.User.delete(id)));
        toast.success(`${ids.length} user(s) removed`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['all_users'] });
    } catch (e) {
      toast.error('Action failed: ' + e.message);
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const selectedUsers = users.filter(u => selectedIds.includes(u.id));
  const allFrozen = selectedUsers.every(u => u.role === 'frozen');
  const selectableCount = filtered.filter(u => u.id !== currentUser?.id).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-bangor-red/10 rounded-xl">
            <Users className="w-5 h-5 text-bangor-red" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">User Management</h1>
            <p className="text-sm text-slate-500">{users.length} registered users</p>
          </div>
        </div>

        {/* Search + bulk actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {selectedIds.length > 0 && (
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-400 text-slate-600"
                onClick={() => setConfirmAction({ type: allFrozen ? 'unfreeze' : 'freeze', ids: selectedIds })}
              >
                <SnowflakeIcon className="w-3.5 h-3.5 mr-1.5" />
                {allFrozen ? 'Unfreeze' : 'Freeze'} ({selectedIds.length})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmAction({ type: 'remove', ids: selectedIds })}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove ({selectedIds.length})
              </Button>
            </div>
          )}
        </div>

        {/* User table */}
        <Card>
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIds.length === selectableCount && selectableCount > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">User</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading users…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No users found</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map(user => {
                  const isSelf = user.id === currentUser?.id;
                  const isSelected = selectedIds.includes(user.id);
                  const isFrozen = user.role === 'frozen';
                  return (
                    <li
                      key={user.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-slate-50' : ''} ${isFrozen ? 'opacity-60' : ''}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isSelf}
                        onCheckedChange={() => toggleSelect(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 truncate">{user.full_name || '(no name)'}</span>
                          {isSelf && <Badge variant="outline" className="text-xs shrink-0">You</Badge>}
                          {isFrozen && (
                            <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                              <SnowflakeIcon className="w-3 h-3" /> Frozen
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <Badge className={`text-xs border shrink-0 ${ROLE_STYLES[user.role] || ROLE_STYLES.user}`}>
                        {user.role === 'admin' && <ShieldCheck className="w-3 h-3 mr-1" />}
                        {user.role || 'user'}
                      </Badge>
                      {!isSelf && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-slate-500 hover:text-slate-800"
                            title={isFrozen ? 'Unfreeze user' : 'Freeze user'}
                            onClick={() => setConfirmAction({ type: isFrozen ? 'unfreeze' : 'freeze', ids: [user.id] })}
                          >
                            <SnowflakeIcon className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-400 hover:text-red-600"
                            title="Remove user"
                            onClick={() => setConfirmAction({ type: 'remove', ids: [user.id] })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {confirmAction?.type === 'remove' ? 'Remove users?' :
               confirmAction?.type === 'freeze' ? 'Freeze users?' : 'Unfreeze users?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'remove'
                ? `This will permanently delete ${confirmAction?.ids.length} user(s). This cannot be undone.`
                : confirmAction?.type === 'freeze'
                ? `This will suspend ${confirmAction?.ids.length} user(s) by setting their role to "frozen".`
                : `This will restore ${confirmAction?.ids.length} user(s) to the standard "user" role.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              className={confirmAction?.type === 'remove' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800'}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {confirmAction?.type === 'remove' ? 'Remove' : confirmAction?.type === 'freeze' ? 'Freeze' : 'Unfreeze'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}