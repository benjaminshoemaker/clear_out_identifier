import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Chip } from "../ui/chip";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
import { toast } from "sonner@2.0.3";
import { identify, type IdentifyResponse } from "../../services/identify";
import { pricing } from "../../services/pricing";
import { state } from "../../state";

interface ReviewScreenProps {
  photos: File[];
  context: any;
  onNext: (analysis: any) => void;
  onBack: () => void;
}

export function ReviewScreen({ photos, context, onNext, onBack }: ReviewScreenProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [powerSource, setPowerSource] = useState<string>(state.answers.power || "");
  const [material, setMaterial] = useState<string>(state.answers.material || "");
  const [result, setResult] = useState<IdentifyResponse | null>(state.identify);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    state.files = photos;
  }, [photos]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!result && photos && photos.length) {
        const r = await identify.fromPhotos(photos);
        if (mounted) {
          setResult(r);
          state.identify = r;
        }
      }
    })();
    return () => { mounted = false; };
  }, [photos, result]);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Text copied to clipboard");
  };

  const needsAnswers = useMemo(() => {
    if (!result) return false;
    return result.confidence < 0.4 && result.resolution_level === 'category_only';
  }, [result]);

  const continueDisabled = needsAnswers && (!powerSource || !material);

  const handleContinue = async () => {
    if (!result) return;
    state.answers = {
      power: (powerSource as any) || undefined,
      material: material || undefined,
    };
    const category = result.attributes.category || 'misc';
    const brand = result.attributes.brand;
    const estimate = await pricing.getEstimate({ category, brand });
    state.estimates = estimate;
    const final = {
      identify: result,
      answers: state.answers,
      estimates: estimate,
      context,
      files: photos,
    };
    onNext(final);
  };

  const evidenceChips = useMemo(() => {
    if (!result) return ['None'];
    const keys: string[] = [];
    if (result.evidence.code) keys.push('Barcode');
    if (result.evidence.text && result.evidence.text.length) keys.push('OCR');
    if (result.evidence.logo) keys.push('Logo');
    if (result.evidence.visual_match_ids && result.evidence.visual_match_ids.length) keys.push('Visual');
    if (keys.length === 0) keys.push('None');
    return keys;
  }, [result]);

  const confidencePct = Math.round((result?.confidence ?? 0) * 100);
  const hazards = result?.attributes.hazards || [];

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8" data-screen="review">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Photo Gallery */}
        <div className="space-y-4">
          <h2 tabIndex={-1} ref={headingRef}>Photos ({photos.length})</h2>
          
          {/* Main Photo */}
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            {photos[selectedPhotoIndex] ? (
              <img
                src={URL.createObjectURL(photos[selectedPhotoIndex])}
                alt={photos[selectedPhotoIndex].name}
                className="w-full h-full object-contain rounded"
                onLoad={(e) => URL.revokeObjectURL((e.currentTarget as HTMLImageElement).src)}
              />
            ) : (
              <span className="text-muted-foreground">Photo Preview</span>
            )}
          </div>

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  className={`
                    flex-shrink-0 w-16 h-16 bg-muted rounded border-2 transition-colors
                    ${selectedPhotoIndex === index ? "border-primary" : "border-transparent"}
                  `}
                  onClick={() => setSelectedPhotoIndex(index)}
                >
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={photo.name}
                    className="w-full h-full object-cover rounded"
                    onLoad={(e) => URL.revokeObjectURL((e.currentTarget as HTMLImageElement).src)}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detection Panel */}
        <div className="space-y-6">
          <h2 tabIndex={-1}>Item Analysis</h2>

          {/* Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evidence Found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div id="evidenceChips" className="flex flex-wrap gap-2">
                {evidenceChips.map((label) => (
                  <Chip key={label} selected>
                    {label === 'Barcode' || label === 'OCR' || label === 'Visual' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : null}
                    {label}
                  </Chip>
                ))}
              </div>

              <div>
                <p className="text-sm mb-2">Extracted text:</p>
                <pre id="extractedText" className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">
{(result?.evidence.text && result.evidence.text.length ? result.evidence.text.join('\n') : '—')}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Resolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Item Identified</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge id="resolutionBadge" variant="secondary">{result?.resolution_level || '—'}</Badge>
              
              <div>
                <p className="mb-1">{result?.attributes.brand || ''} {result?.attributes.model || ''}</p>
                <p className="text-sm text-muted-foreground">{result?.attributes.category || 'misc'}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Confidence</span>
                  <span className="text-sm">{confidencePct}%</span>
                </div>
                <div aria-valuenow={confidencePct} id="confidenceBar">
                  <Progress value={confidencePct} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm mb-3">Does it plug in or use batteries?</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Power source">
                  {[
                    { label: 'Plug', value: 'plug' },
                    { label: 'Battery', value: 'battery' },
                    { label: 'None', value: 'none' },
                  ].map((opt) => (
                    <label key={opt.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="powerRadio"
                        value={opt.value}
                        className="sr-only"
                        checked={powerSource === opt.value}
                        onChange={(e) => setPowerSource(e.target.value)}
                      />
                      <Chip selected={powerSource === opt.value}>{opt.label}</Chip>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm mb-3">Primary material?</p>
                <div className="flex flex-wrap gap-2">
                  {["Metal", "Wood", "Plastic", "Fabric", "Glass", "Ceramic", "Mixed"].map((option) => (
                    <label key={option} className="cursor-pointer">
                      <input
                        type="radio"
                        name="materialSelect"
                        value={option}
                        className="sr-only"
                        checked={material === option}
                        onChange={(e) => setMaterial(e.target.value)}
                      />
                      <Chip selected={material === option}>{option}</Chip>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safety Flags */}
          { (result?.attributes.hazards?.length || 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-destructive" />
                  Safety Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div id="safetyFlags" className="flex flex-wrap gap-2">
                  {result?.attributes.hazards?.map((flag, index) => (
                    <Badge key={index} variant="destructive">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:mt-8">
        <div className="max-w-[1200px] mx-auto flex justify-between">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button size="lg" data-nav="to-action" onClick={handleContinue} disabled={continueDisabled}>
            Continue to Actions
          </Button>
        </div>
      </div>
    </div>
  );
}
