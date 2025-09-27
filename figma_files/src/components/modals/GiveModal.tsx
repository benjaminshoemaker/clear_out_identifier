import { ExternalLink, Users, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent } from "../ui/card";
import { toast } from "sonner@2.0.3";

interface GiveModalProps {
  open: boolean;
  onClose: () => void;
  analysis: any;
  options: any[];
  onComplete: () => void;
}

export function GiveModal({ open, onClose, analysis, options, onComplete }: GiveModalProps) {
  const handleOptionClick = (optionName: string) => {
    toast(`Opening ${optionName}...`);
    onComplete();
    onClose();
  };

  const communityOptions = options.filter(opt => opt.type === 'community');
  const charityOptions = [
    ...options.filter(opt => opt.type === 'charity'),
    { name: "Salvation Army", description: "Clothing and household items", type: "charity" },
    { name: "Habitat ReStore", description: "Building materials and furniture", type: "charity" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share or donate</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="community" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="charities">Charities</TabsTrigger>
          </TabsList>

          <TabsContent value="community" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share with neighbors and local community groups
            </p>
            
            <div className="space-y-3">
              {communityOptions.map((option) => (
                <Card key={option.name} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm">{option.name}</h4>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOptionClick(option.name)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-sm">Local Facebook Groups</h4>
                        <p className="text-xs text-muted-foreground">Neighborhood sharing groups</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOptionClick("Facebook Groups")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div id="giveList" className="flex items-center gap-4 pt-2">
              <a href="#" className="text-sm underline">Open community group</a>
              <a href="#" className="text-sm underline">Local charity guide</a>
            </div>
          </TabsContent>

          <TabsContent value="charities" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Donate to organizations that can put your item to good use
            </p>
            
            <div className="space-y-3">
              {charityOptions.map((option) => (
                <Card key={option.name} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="text-sm">{option.name}</h4>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOptionClick(option.name)}
                      >
                        Schedule pickup
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
