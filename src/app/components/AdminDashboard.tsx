import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Package, AlertCircle, Users, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { UserManagement } from '@/app/components/UserManagement';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
  accessToken: string;
}

interface FoundItem {
  id: string;
  itemName: string;
  category: string;
  description: string;
  location: string;
  foundDate: string;
  contactEmail: string;
  photoUrl?: string;
  status: string;
  createdAt: string;
}

interface Claim {
  id: string;
  itemId: string;
  claimerName: string;
  claimerEmail: string;
  claimerPhone: string;
  description: string;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export function AdminDashboard({ onNavigate, accessToken }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'claims' | 'users'>('items');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FoundItem[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('[AdminDashboard] Fetching data...');
      
      // First test if server is reachable
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/health`;
      console.log('[AdminDashboard] Testing health endpoint:', healthUrl);
      
      const healthResponse = await fetch(healthUrl);
      console.log('[AdminDashboard] Health check status:', healthResponse.status);
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/admin/data`;
      console.log('[AdminDashboard] URL:', url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      console.log('[AdminDashboard] Response status:', response.status);
      console.log('[AdminDashboard] Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('[AdminDashboard] Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[AdminDashboard] JSON parse error:', parseError);
        console.error('[AdminDashboard] Raw response:', responseText);
        
        // If we get HTML or plain text, the edge function might not be deployed
        if (responseText.includes('404') || responseText.includes('Not Found')) {
          throw new Error('Edge function endpoint not found. The server may need to be redeployed.');
        }
        
        throw new Error('Invalid response from server: ' + responseText.substring(0, 100));
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      setItems(data.items || []);
      setClaims(data.claims || []);
      setUsers(data.users || []);
      
      console.log('[AdminDashboard] Loaded items:', data.items?.length || 0);
      console.log('[AdminDashboard] Loaded claims:', data.claims?.length || 0);
      console.log('[AdminDashboard] Claims with status:', data.claims?.map((c: Claim) => ({ id: c.id, status: c.status })));
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error('Failed to load data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (itemId: string, status: 'approved' | 'rejected' | 'claimed') => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/admin/items/${itemId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      toast.success(`Item ${status} successfully`);
      loadData();
    } catch (error) {
      console.error('Update item error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update item');
    }
  };

  const updateClaimStatus = async (claimId: string, status: 'approved' | 'rejected' | 'resolved') => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/admin/claims/${claimId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update claim');
      }

      // If claim is approved or resolved, also update the item to mark it as claimed
      if (status === 'approved' || status === 'resolved') {
        const claim = claims.find(c => c.id === claimId);
        if (claim) {
          await updateItemStatus(claim.itemId, 'claimed' as any);
        }
      }

      toast.success(`Claim ${status} successfully`);
      loadData();
    } catch (error) {
      console.error('Update claim error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update claim');
    }
  };

  const deleteClaim = async (claimId: string) => {
    if (!confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/admin/claims/${claimId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete claim');
      }

      toast.success('Claim deleted successfully');
      loadData();
    } catch (error) {
      console.error('Delete claim error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete claim');
    }
  };

  const getItemById = (itemId: string) => {
    return items.find(item => item.id === itemId);
  };

  const pendingItems = items.filter(item => item.status === 'pending');
  const approvedItems = items.filter(item => item.status === 'approved');
  const pendingClaims = claims.filter(claim => claim.status === 'pending');
  
  console.log('[AdminDashboard] Pending claims count:', pendingClaims.length);
  console.log('[AdminDashboard] All claims count:', claims.length);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => onNavigate('home')}
          className="mb-6"
          aria-label="Go back to home page"
          title="Go back to home page"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage found items and review claim requests
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingItems.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Items</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedItems.length}</div>
              <p className="text-xs text-muted-foreground">Publicly visible</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingClaims.length}</div>
              <p className="text-xs text-muted-foreground">Need review</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">
              Found Items
              {pendingItems.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="claims">
              Claims
              {pendingClaims.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingClaims.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Items</CardTitle>
                <CardDescription>
                  Review and approve or reject submitted found items
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : pendingItems.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No pending items to review
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.itemName}
                          </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.location}</TableCell>
                          <TableCell className="text-sm">{item.contactEmail}</TableCell>
                          <TableCell>
                            {new Date(item.foundDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateItemStatus(item.id, 'approved')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateItemStatus(item.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-1 text-red-600" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Claim Requests</CardTitle>
                <CardDescription>
                  Review claim requests and verify ownership
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : claims.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No claims submitted yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {claims.map((claim) => {
                      const item = getItemById(claim.itemId);
                      return (
                        <Card key={claim.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  {item?.itemName || 'Unknown Item'}
                                </CardTitle>
                                <CardDescription>
                                  Claimed by {claim.claimerName}
                                </CardDescription>
                              </div>
                              <Badge
                                variant={
                                  claim.status === 'pending'
                                    ? 'secondary'
                                    : claim.status === 'approved'
                                    ? 'default'
                                    : 'destructive'
                                }
                              >
                                {claim.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-semibold">Email:</span> {claim.claimerEmail}
                              </div>
                              <div>
                                <span className="font-semibold">Phone:</span>{' '}
                                {claim.claimerPhone || 'Not provided'}
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="font-semibold">Verification Details:</span>
                              <p className="mt-1 text-gray-600">{claim.description}</p>
                            </div>
                            {claim.status === 'pending' && (
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateClaimStatus(claim.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateClaimStatus(claim.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => updateClaimStatus(claim.id, 'resolved')}
                                >
                                  Mark as Resolved
                                </Button>
                              </div>
                            )}
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteClaim(claim.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}