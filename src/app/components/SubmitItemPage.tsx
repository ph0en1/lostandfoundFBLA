import { useState } from 'react';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
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
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface SubmitItemPageProps {
  onNavigate: (page: string) => void;
  userEmail: string;
}

const categories = [
  'Electronics',
  'Clothing',
  'Books & Stationery',
  'Keys & ID Cards',
  'Sports Equipment',
  'Bags & Backpacks',
  'Jewelry & Accessories',
  'Other',
];

export function SubmitItemPage({ onNavigate, userEmail }: SubmitItemPageProps) {
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    description: '',
    location: '',
    foundDate: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    
    // Only validate if we have a complete date (YYYY-MM-DD format)
    if (selectedDate && selectedDate.length === 10) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      oneYearAgo.setHours(0, 0, 0, 0);
      
      const selected = new Date(selectedDate + 'T00:00:00'); // Parse as local date
      
      if (selected > today) {
        toast.error('Date cannot be in the future');
        return;
      }
      
      if (selected < oneYearAgo) {
        toast.error('Date cannot be more than 1 year ago');
        return;
      }
    }
    
    setFormData({
      ...formData,
      foundDate: selectedDate,
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemName || !formData.category || !formData.location || !formData.foundDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            ...formData,
            contactEmail: userEmail, // Use logged-in user's email
            photoData: photoPreview,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit item');
      }

      toast.success('Item submitted successfully! Awaiting admin approval.');
      
      // Reset form
      setFormData({
        itemName: '',
        category: '',
        description: '',
        location: '',
        foundDate: '',
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      
      setTimeout(() => {
        onNavigate('home');
      }, 1500);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
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

        <Card>
          <CardHeader>
            <CardTitle>Report Found Item</CardTitle>
            <CardDescription>
              Help reunite lost items with their owners. Your submission will be
              reviewed before appearing publicly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Display logged-in user info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Reporting as:</strong> {userEmail}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="itemName">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="itemName"
                  name="itemName"
                  placeholder="e.g., Blue water bottle, iPhone 12, Red backpack"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Add any distinguishing features or details"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  Where was it found? <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g., Library 3rd floor, Cafeteria, Gym locker room"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="foundDate">
                  Date Found <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="foundDate"
                  name="foundDate"
                  type="date"
                  value={formData.foundDate}
                  onChange={handleDateChange}
                  required
                />
                <p className="text-xs text-gray-500">
                  Date must be within the last year and cannot be in the future
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Upload Photo</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {photoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                      >
                        Remove Photo
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <Label
                        htmlFor="photo"
                        className="cursor-pointer text-blue-600 hover:text-blue-700"
                      >
                        Click to upload a photo
                      </Label>
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Found Item'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onNavigate('home')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}