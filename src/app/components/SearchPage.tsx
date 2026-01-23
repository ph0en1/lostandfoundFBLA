import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { ClaimDialog } from '@/app/components/ClaimDialog';

interface SearchPageProps {
  onNavigate: (page: string) => void;
  userEmail: string;
}

interface FoundItem {
  id: string;
  itemName: string;
  category: string;
  description: string;
  location: string;
  foundDate: string;
  photoUrl?: string;
  createdAt: string;
}

const categories = [
  'All Categories',
  'Electronics',
  'Clothing',
  'Books & Stationery',
  'Keys & ID Cards',
  'Sports Equipment',
  'Bags & Backpacks',
  'Jewelry & Accessories',
  'Other',
];

export function SearchPage({ onNavigate, userEmail }: SearchPageProps) {
  const [items, setItems] = useState<FoundItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedItem, setSelectedItem] = useState<FoundItem | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, selectedCategory, items]);

  const fetchItems = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/items?status=approved`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch items');
      }

      setItems(data.items || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.itemName.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Sort by most recent first
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setFilteredItems(filtered);
  };

  const handleClaimClick = (item: FoundItem) => {
    setSelectedItem(item);
    setIsClaimDialogOpen(true);
  };

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
          <h1 className="text-3xl font-bold mb-2">Search Lost Items</h1>
          <p className="text-gray-600">
            Browse found items or search for your lost belongings
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" aria-hidden="true" />
                <Input
                  placeholder="Search by item name, description, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Search items by name, description, or location"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger aria-label="Filter by category">
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">
                No items found matching your search criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {item.photoUrl && (
                    <div className="aspect-video bg-gray-100">
                      <img
                        src={item.photoUrl}
                        alt={item.itemName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{item.itemName}</CardTitle>
                      <Badge variant="secondary">{item.category}</Badge>
                    </div>
                    <CardDescription>
                      Found on {new Date(item.foundDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="text-sm">
                      <span className="font-semibold">Location:</span> {item.location}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleClaimClick(item)}
                      aria-label={`Claim ${item.itemName}`}
                    >
                      Claim This Item
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedItem && (
        <ClaimDialog
          item={selectedItem}
          isOpen={isClaimDialogOpen}
          onClose={() => {
            setIsClaimDialogOpen(false);
            setSelectedItem(null);
          }}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}