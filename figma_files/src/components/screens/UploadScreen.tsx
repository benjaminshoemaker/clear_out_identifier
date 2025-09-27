import { useEffect, useRef, useState } from "react";
import { Upload, Camera, Info } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Chip } from "../ui/chip";

interface UploadScreenProps {
  onNext: (photos: File[], context: any) => void;
}

export function UploadScreen({ onNext }: UploadScreenProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    setPhotos(prev => [...prev, ...files]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...files]);
    }
  };

  const handleContinue = () => {
    const context = {
      room: selectedRoom,
      size: selectedSize,
      material: selectedMaterial,
    };
    onNext(photos, context);
  };

  const rooms = ["Kitchen", "Closet", "Garage", "Living Room", "Bedroom", "Bathroom"];
  const sizes = ["Hand", "Shoe box", "Backpack", "Chair", "Table", "Large"];
  const materials = ["Metal", "Wood", "Plastic", "Fabric", "Glass", "Ceramic"];

  return (
    <div className="max-w-[800px] mx-auto px-4 py-8 space-y-8" data-screen="upload">
      {/* Hero Upload Card */}
      <Card className="border-2 border-dashed transition-colors">
        <CardContent className="p-8">
          <div
            className={`
              relative flex flex-col items-center justify-center space-y-4 p-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer
              ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50"}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h2 tabIndex={-1} ref={headingRef} className="text-lg">Drop photos or tap to upload</h2>
              <p className="text-sm text-muted-foreground">
                JPEG, PNG up to 10MB each
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="min-w-[120px]">
                Add photos
              </Button>
              <Button variant="secondary" size="lg" className="min-w-[120px]" data-action="use-camera">
                <Camera className="w-4 h-4 mr-2" />
                Use camera
              </Button>
            </div>

            <input
              id="fileInput"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {photos.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-sm">Photos selected: {photos.length}</p>
              <div id="thumbs" className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((photo, index) => {
                  const url = URL.createObjectURL(photo);
                  return (
                    <div key={index} className="relative">
                      <img src={url} alt={photo.name} className="w-full h-24 object-cover rounded" onLoad={() => URL.revokeObjectURL(url)} />
                      <div className="sr-only">{photo.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="mb-2">Tips for better results</h3>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm bg-muted px-3 py-1 rounded-full">Front view</span>
                <span className="text-sm bg-muted px-3 py-1 rounded-full">Back/underside</span>
                <span className="text-sm bg-muted px-3 py-1 rounded-full">Close-up of text</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Context Options */}
      <div className="space-y-6">
        <div>
          <h3 className="mb-3">Room (optional)</h3>
          <div className="flex flex-wrap gap-2">
            {rooms.map((room) => (
              <Chip
                key={room}
                selected={selectedRoom === room}
                onClick={() => setSelectedRoom(selectedRoom === room ? "" : room)}
              >
                {room}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3">Size (optional)</h3>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <Chip
                key={size}
                selected={selectedSize === size}
                onClick={() => setSelectedSize(selectedSize === size ? "" : size)}
              >
                {size}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3">Material (optional)</h3>
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
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground">
          Photos are private until you choose an action
        </p>
        
        {photos.length > 0 && (
          <Button 
            size="lg" 
            className="mt-4 min-w-[200px]"
            data-nav="to-review"
            onClick={handleContinue}
          >
            Continue to Review
          </Button>
        )}
      </div>
    </div>
  );
}
