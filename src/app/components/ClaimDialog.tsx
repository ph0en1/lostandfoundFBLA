import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface FoundItem {
  id: string;
  itemName: string;
  category: string;
  description: string;
  location: string;
  foundDate: string;
}

interface ClaimDialogProps {
  item: FoundItem;
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function ClaimDialog({ item, isOpen, onClose, userEmail }: ClaimDialogProps) {
  const [formData, setFormData] = useState({
    claimerName: '',
    claimerEmail: userEmail,
    claimerPhone: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.claimerName || !formData.claimerEmail || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/claims`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            itemId: item.id,
            ...formData,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit claim');
      }

      toast.success(
        'Claim submitted successfully! Admin will review and contact you.'
      );

      // Reset form and close dialog
      setFormData({
        claimerName: '',
        claimerEmail: userEmail,
        claimerPhone: '',
        description: '',
      });
      onClose();
    } catch (error) {
      console.error('Claim submission error:', error);
      
      // Check if it's a database schema error
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit claim';
      
      if (errorMessage.includes('claimer_email') || errorMessage.includes('claimer_phone') || errorMessage.includes('item_id')) {
        toast.error('Database not configured. Please contact administrator to run SQL migration.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claim Item: {item.itemName}</DialogTitle>
          <DialogDescription>
            Please provide your information and verification details to claim this
            item. Admin will review your claim and contact you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="claimerName">
              Your Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="claimerName"
              name="claimerName"
              placeholder="Full name"
              value={formData.claimerName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="claimerEmail">
              Your Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="claimerEmail"
              name="claimerEmail"
              type="email"
              placeholder="your.email@school.edu"
              value={formData.claimerEmail}
              onChange={handleInputChange}
              required
              readOnly
              className="bg-gray-50 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="claimerPhone">Phone Number (optional)</Label>
            <Input
              id="claimerPhone"
              name="claimerPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.claimerPhone}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Verification Details <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Please describe any unique features, when you lost it, or other identifying information to verify ownership..."
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              required
            />
            <p className="text-sm text-gray-500">
              This helps admin verify that you are the rightful owner
            </p>
          </div>

          <div className="flex gap-3">
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
                'Submit Claim'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}