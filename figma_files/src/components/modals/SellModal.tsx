import { useMemo, useState } from "react";
import { X, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { toast } from "sonner@2.0.3";
import type { ActionEstimate } from "../../services/pricing";

interface SellModalProps {
  open: boolean;
  onClose: () => void;
  analysis: any;
  pricing: ActionEstimate | null;
  onComplete: () => void;
}

export function SellModal({ open, onClose, analysis, pricing, onComplete }: SellModalProps) {
  const idAttrs = analysis?.identify?.attributes || analysis?.resolution || {};
  const evText: string[] = analysis?.identify?.evidence?.text || analysis?.extractedText || [];
  const hazards: string[] = idAttrs.hazards || [];
  const disableSell = hazards.includes('battery') || hazards.includes('aerosol');

  const [formData, setFormData] = useState({
    title: `${idAttrs.brand || ''} ${idAttrs.model || idAttrs.category || ''}`.trim(),
    category: idAttrs.category || 'misc',
    condition: "good",
    price: String(
      pricing && pricing.price_low != null && pricing.price_high != null
        ? Math.round(((pricing.price_low) + (pricing.price_high)) / 2)
        : 30
    ),
    description: `${idAttrs.brand || ''} ${idAttrs.model || ''} ${idAttrs.category || ''}`.trim() + (evText?.length ? `\n\nNotes: ${evText.join(' ')}` : ''),
  });

  const feeSummary = useMemo(() => {
    if (!pricing) return '—';
    const low = pricing.price_low ?? 0;
    const high = pricing.price_high ?? 0;
    const fees = pricing.fees ?? 0;
    const net = pricing.net ?? 0;
    return `Range: $${low}-${high}. Fees ~ $${fees}. Net ~ $${net}.`;
  }, [pricing]);

  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleSubmit = async () => {
    try {
      const files: File[] = analysis.files || [];
      const photosBase64 = await Promise.all(files.map(fileToBase64));
      const draft = {
        title: formData.title,
        category: formData.category,
        condition: formData.condition,
        price: Number(formData.price),
        description: formData.description,
        identify: analysis.identify || null,
        answers: analysis.answers || {},
        estimate: pricing || null,
        photos: photosBase64,
      };
      const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'listing-draft.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Draft listing created successfully!");
      onComplete();
      onClose();
    } catch (e) {
      toast("Failed to create draft");
    }
  };

  const conditions = [
    { value: "new", label: "New" },
    { value: "like-new", label: "Like New" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
  ];

  const categories = [
    "Electronics",
    "Home & Garden",
    "Clothing",
    "Sports & Outdoors",
    "Books & Media",
    "Toys & Games",
    "Other",
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prefill your listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="sellTitle">Title</Label>
            <Input
              id="sellTitle"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Item title"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div className="space-y-3">
            <Label>Condition</Label>
            <RadioGroup
              value={formData.condition}
              onValueChange={(value) => setFormData({ ...formData, condition: value })}
              className="flex flex-wrap gap-4"
            >
              {conditions.map((condition) => (
                <div key={condition.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={condition.value} id={condition.value} />
                  <Label htmlFor={condition.value} className="text-sm">
                    {condition.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Upload className="w-4 h-4" />
                <span>Photos from upload will be included</span>
              </div>
            </div>
          </div>

          {/* Suggested Price */}
          <div className="space-y-2">
            <Label htmlFor="sellPrice">Suggested price ($)</Label>
            <Input
              id="sellPrice"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="30"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="sellDescription">Description</Label>
            <Textarea
              id="sellDescription"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your item..."
              rows={4}
            />
          </div>

          <Separator />

          {/* Fee Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="text-sm">Fee summary</h4>
            <div id="feeSummary" className="text-sm text-muted-foreground">{feeSummary}</div>
          </div>

          {/* Safety and Actions */}
          {disableSell && (
            <div className="text-sm text-destructive">Selling is disabled for hazardous items (battery/aerosol). Consider recycling.</div>
          )}
          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" data-submit="sell-draft" disabled={disableSell}>
              Create draft
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
