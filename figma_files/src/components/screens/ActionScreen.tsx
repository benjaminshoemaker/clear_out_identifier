import { useEffect, useRef, useState } from "react";
import { ArrowLeft, DollarSign, Heart, Recycle, ExternalLink, Map } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { SellModal } from "../modals/SellModal";
import { GiveModal } from "../modals/GiveModal";
import { RecycleModal } from "../modals/RecycleModal";
import { state } from "../../state";

interface ActionScreenProps {
  analysis: any;
  onBack: () => void;
  onComplete: () => void;
}

export function ActionScreen({ analysis, onBack, onComplete }: ActionScreenProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const giveOptions = [
    { name: "Buy Nothing", description: "Local community sharing", type: "community" },
    { name: "Freecycle", description: "Gift to neighbors", type: "community" },
    { name: "Goodwill", description: "Donation drop-off", type: "charity" },
  ];

  const recycleLocations = [
    { name: "City EcoDrop", distance: "0.8 mi" },
    { name: "GreenCycle Center", distance: "2.1 mi" },
    { name: "Municipal Facility", distance: "6.2 mi" },
  ];

  return (
    <>
      <div className="max-w-[800px] mx-auto px-4 py-8" data-screen="action">
        <div className="mb-8">
          <h2 className="mb-2" tabIndex={-1} ref={headingRef}>Choose what to do with your item</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>{analysis.identify?.attributes.brand || ''} {analysis.identify?.attributes.model || ''}</span>
            <Badge variant="outline">{analysis.identify?.attributes.category || 'misc'}</Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Sell Card */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" data-card="sell">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Sell</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Turn your item into cash with online marketplaces.
              </p>
              
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Est. value: </span>
                  <span>{state.estimates ? `$${state.estimates.price_low}-${state.estimates.price_high}` : '—'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">After fees: </span>
                  <span>{state.estimates ? `$${state.estimates.net}` : '—'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 justify-center">
                {['eBay','Mercari','Facebook Marketplace'].map((platform) => (
                  <Badge key={platform} variant="outline" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>

              <Button 
                className="w-full"
                data-open="sell-modal"
                onClick={() => setActiveModal('sell')}
              >
                Prefill listing
              </Button>
            </CardContent>
          </Card>

          {/* Give Card */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" data-card="give">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Give</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Share with your community or donate to a good cause.
              </p>

              <div className="space-y-2 text-sm">
                {giveOptions.slice(0, 2).map((option) => (
                  <div key={option.name} className="flex items-center justify-between">
                    <span>{option.name}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </div>
                ))}
                <div className="text-muted-foreground">+1 more</div>
              </div>

              <Button 
                variant="secondary" 
                className="w-full"
                data-open="give-modal"
                onClick={() => setActiveModal('give')}
              >
                Open posting
              </Button>
            </CardContent>
          </Card>

          {/* Recycle Card */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" data-card="recycle">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Recycle className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg">Recycle</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Dispose of safely at nearby recycling centers.
              </p>

              <div className="space-y-2 text-sm">
                {recycleLocations.slice(0, 2).map((location) => (
                  <div key={location.name} className="flex items-center justify-between">
                    <span>{location.name}</span>
                    <span className="text-muted-foreground">{location.distance}</span>
                  </div>
                ))}
                <div className="text-muted-foreground">+1 more</div>
              </div>

              <Button 
                variant="secondary" 
                className="w-full"
                data-open="recycle-modal"
                onClick={() => setActiveModal('recycle')}
              >
                <Map className="w-4 h-4 mr-2" />
                Get directions
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground mb-8">
          We pick the best option by value and rules in your area.
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-between">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Modals */}
      <SellModal
        open={activeModal === 'sell'}
        onClose={() => setActiveModal(null)}
        analysis={analysis}
        pricing={state.estimates}
        onComplete={onComplete}
      />
      
      <GiveModal
        open={activeModal === 'give'}
        onClose={() => setActiveModal(null)}
        analysis={analysis}
        options={giveOptions}
        onComplete={onComplete}
      />
      
      <RecycleModal
        open={activeModal === 'recycle'}
        onClose={() => setActiveModal(null)}
        analysis={analysis}
        locations={[]}
        onComplete={onComplete}
      />
    </>
  );
}
