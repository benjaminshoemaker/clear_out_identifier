import { HelpCircle } from "lucide-react";
import { Button } from "../ui/button";

interface Step {
  id: number;
  title: string;
  completed: boolean;
  current: boolean;
}

interface TopBarProps {
  currentStep: number;
}

export function TopBar({ currentStep }: TopBarProps) {
  const steps: Step[] = [
    { id: 1, title: "Upload", completed: currentStep > 1, current: currentStep === 1 },
    { id: 2, title: "Review", completed: currentStep > 2, current: currentStep === 2 },
    { id: 3, title: "Action", completed: false, current: currentStep === 3 },
  ];

  return (
    <div className="w-full border-b bg-card">
      <div className="max-w-[1200px] mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl text-primary">ClearOut</h1>
          </div>

          {/* Progress Stepper */}
          <div className="hidden sm:flex items-center space-x-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center space-x-3">
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                      ${
                        step.completed
                          ? "bg-primary border-primary text-primary-foreground"
                          : step.current
                          ? "border-primary text-primary bg-background"
                          : "border-muted-foreground/30 text-muted-foreground bg-background"
                      }
                    `}
                  >
                    <span className="text-sm">{step.id}</span>
                  </div>
                  <span
                    className={`text-sm ${
                      step.current ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 h-px bg-muted-foreground/30 ml-4" />
                )}
              </div>
            ))}
          </div>

          {/* Mobile Progress */}
          <div className="sm:hidden flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 3
            </span>
          </div>

          {/* Help */}
          <Button variant="ghost" size="sm">
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}