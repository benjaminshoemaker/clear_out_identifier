import { MapPin, Clock, AlertTriangle, Navigation } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Chip } from "../ui/chip";
import { toast } from "sonner@2.0.3";
import { useEffect, useState } from "react";
import { locations as locationsService, type RecyclingLocation } from "../../services/locations";

interface RecycleModalProps {
  open: boolean;
  onClose: () => void;
  analysis: any;
  locations: any[];
  onComplete: () => void;
}

export function RecycleModal({ open, onClose, analysis, locations, onComplete }: RecycleModalProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<string>(analysis?.answers?.material || "");
  const [selectedHazard, setSelectedHazard] = useState<string>("");
  const [zip, setZip] = useState<string>("");
  const [results, setResults] = useState<RecyclingLocation[]>([]);

  const handleDirections = (locationName: string) => {
    toast(`Opening directions to ${locationName}...`);
    onComplete();
    onClose();
  };

  const materials = ["Metal", "Plastic", "Glass", "Electronics", "Batteries", "Textiles"];
  const hazards = ["None", "Batteries", "Chemicals", "Sharp edges"];

  const filteredLocations = (results.length ? results : locations).filter(location => {
    if (selectedMaterial === "Batteries" || selectedHazard === "Batteries") {
      return location.notes.toLowerCase().includes("batter");
    }
    if (selectedMaterial === "Electronics") {
      return location.notes.toLowerCase().includes("electron");
    }
    return true;
  });

  useEffect(() => {
    // When zip changes, look up mock locations
    let ignore = false;
    (async () => {
      if (zip && zip.length >= 3) {
        const list = await locationsService.findRecycling(zip, selectedMaterial);
        if (!ignore) setResults(list.map(l => ({...l, notes: (selectedMaterial || 'Recycling')} as any)) as any);
      } else {
        setResults([]);
      }
    })();
    return () => { ignore = true; };
  }, [zip, selectedMaterial]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recycle or dispose safely</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm mb-3">Material type</h4>
              <div className="flex flex-wrap gap-2">
                {materials.map((material) => (
                  <Chip
                    key={material}
                    selected={selectedMaterial === material}
                    onClick={() => setSelectedMaterial(selectedMaterial === material ? "" : material)}
                  >
                    {material}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm mb-3">Safety considerations</h4>
              <div className="flex flex-wrap gap-2">
                {hazards.map((hazard) => (
                  <Chip
                    key={hazard}
                    selected={selectedHazard === hazard}
                    onClick={() => setSelectedHazard(selectedHazard === hazard ? "" : hazard)}
                  >
                    {hazard}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {/* Safety warnings */}
          {analysis.safetyFlags && analysis.safetyFlags.length > 0 && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm mb-2">Special handling required</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.safetyFlags.map((flag: string, index: number) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ZIP input */}
          <div className="space-y-2">
            <label htmlFor="zipInput" className="text-sm">ZIP code</label>
            <input
              id="zipInput"
              className="w-full border rounded px-3 py-2"
              placeholder="Enter ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              inputMode="numeric"
            />
          </div>

          {/* Map placeholder */}
          <div className="bg-muted rounded-lg h-48 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Map showing {filteredLocations.length} nearby locations</p>
            </div>
          </div>

          {/* Locations list */}
          <div id="recycleList" className="space-y-3">
            <h4 className="text-sm">Recycling locations ({filteredLocations.length})</h4>
            
            {filteredLocations.map((location, index) => (
              <Card key={index} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm">{location.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {location.distance}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{location.hours}</span>
                        </div>
                        <span>{(location as any).notes || 'Recycling drop-off'}</span>
                      </div>
                    </div>
                    
                    <a
                      className="inline-flex items-center border rounded px-3 py-1 text-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name + ' near ' + (zip || ''))}`}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Directions
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="text-sm mb-2">Before you go</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Call ahead to confirm they accept this item type</li>
                <li>• Remove batteries if possible</li>
                <li>• Bring ID for hazardous waste disposal</li>
                <li>• Some locations may charge disposal fees</li>
              </ul>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
