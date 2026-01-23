import { Search, Package, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

interface Stats {
  totalItems: number;
  claimedItems: number;
  pendingClaims: number;
  successRate: number;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    claimedItems: 0,
    pendingClaims: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/stats`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            School Lost & Found
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Find what you've lost, return what you've found
          </p>
          {/*Search Button*/}
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => onNavigate('search')}
              className="bg-blue-600 hover:bg-blue-700"
              aria-label="Navigate to search lost items page"
              title="Navigate to search lost items page"
            >
              <Search className="mr-2 h-5 w-5" />
              Search Lost Items
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate('submit')}
              aria-label="Navigate to report found item page"
              title="Navigate to report found item page"
            >
              <Package className="mr-2 h-5 w-5" />
              Report Found Item
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Found</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.totalItems}
              </div>
              <p className="text-xs text-muted-foreground">This semester</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Reunited with Owners
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.claimedItems}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? '...' : `${stats.successRate}% success rate`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Claims
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.pendingClaims}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting verification
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Report Found Item</h3>
              <p className="text-gray-600">
                Found something? Submit it with a photo and description. Your
                submission will be reviewed by admin.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Search & Browse</h3>
              <p className="text-gray-600">
                Lost something? Search our database by category, location, or
                item name.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Claim Your Item</h3>
              <p className="text-gray-600">
                Found your item? Submit a claim with verification details to
                retrieve it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}