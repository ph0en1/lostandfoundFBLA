import { useEffect, useState } from 'react';
import { Loader2, UserX, UserCheck, Trash2, RefreshCw, Shield, User, UserPlus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '@/utils/supabase/client';

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastSignIn: string | null;
  disabled: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      console.log('[UserManagement] Fetching from URL:', `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/users/list`);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/users/list`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[UserManagement] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[UserManagement] Server error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        toast.error(errorData.error || `Server error: ${response.status}`);
        setUsers([]);
        return;
      }

      const data = await response.json();
      console.log('[UserManagement] Response data:', data);
      console.log('[UserManagement] Number of users:', data.users?.length || 0);
      
      if (data.users) {
        console.log('[UserManagement] Setting', data.users.length, 'users');
        setUsers(data.users);
        toast.success(`Loaded ${data.users.length} student accounts`);
      } else {
        setUsers([]);
        toast.warning('No users found in database');
      }
    } catch (error) {
      console.error('[UserManagement] Load users error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
      toast.error(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleUserStatus = async (user: User) => {
    try {
      setActionUserId(user.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/users/${user.id}/toggle`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      const data = await response.json();
      toast.success(data.message || 'User updated successfully');
      
      // Reload users
      await loadUsers();
    } catch (error) {
      console.error('Toggle user error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setActionUserId(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      setActionUserId(deleteUser.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/users/${deleteUser.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      toast.success('User deleted successfully');
      setDeleteUser(null);
      
      // Reload users
      await loadUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setActionUserId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Only show student users (admins are already filtered out by backend)
  const studentUsers = users.filter(u => u.role === 'student');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage student accounts - Disable accounts to prevent login or delete permanently
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddDialog(true)} variant="default" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
              <Button onClick={loadUsers} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {studentUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No student accounts found</p>
              <p className="text-sm text-gray-400">Student accounts will appear here once created</p>
            </div>
          ) : (
            <div>
              {/* Student Users Section */}
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold">
                  Student Accounts ({studentUsers.length})
                </h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          {user.disabled ? (
                            <Badge variant="destructive">Disabled</Badge>
                          ) : (
                            <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(user.lastSignIn)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleUserStatus(user)}
                              disabled={actionUserId === user.id}
                            >
                              {actionUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.disabled ? (
                                <>
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Enable
                                </>
                              ) : (
                                <>
                                  <UserX className="h-4 w-4 mr-1" />
                                  Disable
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteUser(user)}
                              disabled={actionUserId === user.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Are you sure you want to permanently delete <strong>{deleteUser?.email}</strong>?
                </p>
                <p className="mt-2">
                  This action cannot be undone and will:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Remove the user from Supabase Auth</li>
                  <li>Prevent them from logging in</li>
                  <li>Delete all their authentication data</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionUserId === deleteUser?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionUserId === deleteUser?.id}
            >
              {actionUserId === deleteUser?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add New User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student Account</DialogTitle>
            <DialogDescription>
              Create a new student account. Student emails must follow the format: s[6-digit-number]@school.edu (e.g., s987654@school.edu)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="s123456@school.edu"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <p className="text-xs text-gray-500">Format: s[6-digit-number]@school.edu</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewUserEmail('');
                setNewUserPassword('');
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                try {
                  setCreating(true);

                  const response = await fetch(
                    `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/signup`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${publicAnonKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        email: newUserEmail,
                        password: newUserPassword,
                      }),
                    }
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(data.error || 'Failed to create user');
                  }

                  toast.success('Student account created successfully!');
                  
                  // Reset form and close dialog
                  setShowAddDialog(false);
                  setNewUserEmail('');
                  setNewUserPassword('');
                  
                  // Reload users
                  await loadUsers();
                } catch (error) {
                  console.error('Create user error:', error);
                  toast.error(error instanceof Error ? error.message : 'Failed to create user');
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating || !newUserEmail || !newUserPassword}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}