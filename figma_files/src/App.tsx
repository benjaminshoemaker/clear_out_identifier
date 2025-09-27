import { useState } from "react";
import { TopBar } from "./components/layout/TopBar";
import { UploadScreen } from "./components/screens/UploadScreen";
import { ReviewScreen } from "./components/screens/ReviewScreen";
import { ActionScreen } from "./components/screens/ActionScreen";
import { Toaster } from "./components/ui/sonner";

type Screen = "upload" | "review" | "action";

interface AppData {
  photos: File[];
  context: any;
  analysis: any;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("upload");
  const [appData, setAppData] = useState<AppData>({
    photos: [],
    context: null,
    analysis: null,
  });

  const getCurrentStep = () => {
    switch (currentScreen) {
      case "upload": return 1;
      case "review": return 2;
      case "action": return 3;
      default: return 1;
    }
  };

  const handleUploadNext = (photos: File[], context: any) => {
    setAppData(prev => ({ ...prev, photos, context }));
    setCurrentScreen("review");
  };

  const handleReviewNext = (analysis: any) => {
    setAppData(prev => ({ ...prev, analysis }));
    setCurrentScreen("action");
  };

  const handleReviewBack = () => {
    setCurrentScreen("upload");
  };

  const handleActionBack = () => {
    setCurrentScreen("review");
  };

  const handleComplete = () => {
    // Reset the app or show success message
    setCurrentScreen("upload");
    setAppData({ photos: [], context: null, analysis: null });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar currentStep={getCurrentStep()} />
      
      <main className="pb-8">
        {currentScreen === "upload" && (
          <UploadScreen onNext={handleUploadNext} />
        )}
        
        {currentScreen === "review" && (
          <ReviewScreen
            photos={appData.photos}
            context={appData.context}
            onNext={handleReviewNext}
            onBack={handleReviewBack}
          />
        )}
        
        {currentScreen === "action" && (
          <ActionScreen
            analysis={appData.analysis}
            onBack={handleActionBack}
            onComplete={handleComplete}
          />
        )}
      </main>

      <Toaster />
    </div>
  );
}