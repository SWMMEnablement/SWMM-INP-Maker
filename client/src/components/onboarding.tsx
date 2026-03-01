import { useState, useEffect, useCallback } from "react";
import { Droplets, Sliders, Download, BarChart3, Map, TrendingUp, X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "swmm-onboarding-complete";

const STEPS = [
  {
    icon: Droplets,
    title: "Welcome to SWMM5 INP MAKER",
    description: "Generate realistic EPA SWMM5 input files using physics-based network synthesis. Every parameter is derived from 338 real-world models containing over 3 million elements.",
    color: "#38bdf8",
    detail: "No installation needed -- everything runs right here in your browser.",
  },
  {
    icon: Sliders,
    title: "Configure Your Model",
    description: "Set the number of junctions, model type (sanitary, stormwater, combined, and more), terrain, detail level, and land use. Or pick from 12 ready-made example presets.",
    color: "#818cf8",
    detail: "The ReSWMM discretization option lets you split conduits for more accurate hydraulic modeling.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Element Preview",
    description: "As you adjust parameters, the element cards update instantly -- showing junction counts, conduits, subcatchments, pumps, and more before you generate.",
    color: "#34d399",
    detail: "Computed from the same ratio engine behind the 338-model statistical analysis.",
  },
  {
    icon: Map,
    title: "Interactive Network Map",
    description: "After generating, explore your drainage network on an interactive canvas. Pan, zoom, and hover over nodes to inspect junctions, outfalls, and storage units.",
    color: "#fb923c",
    detail: "The layout uses Barnes-Hut quadtree force simulation for naturally dendritic networks.",
  },
  {
    icon: TrendingUp,
    title: "Longitudinal Profile View",
    description: "See the hydraulic grade line from each outfall upstream. The profile shows invert and crown elevations, pipe sizes, and junction depths along the trunk line.",
    color: "#f472b6",
    detail: "Hover over nodes in the profile for detailed elevation and station data.",
  },
  {
    icon: Download,
    title: "Download & Use",
    description: "Download the generated .inp file or copy it to your clipboard. Open it directly in EPA SWMM5, PySWMM, PCSWMM, or any compatible modeling tool.",
    color: "#34d399",
    detail: "Check the App Docs tab for detailed documentation on the generation pipeline and statistics.",
  },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [entering, setEntering] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setEntering(true);
    const t = setTimeout(() => setEntering(false), 400);
    return () => clearTimeout(t);
  }, [step]);

  const next = useCallback(() => {
    if (step === STEPS.length - 1) {
      finish();
    } else {
      setExiting(true);
      setTimeout(() => {
        setStep((s) => s + 1);
        setExiting(false);
      }, 250);
    }
  }, [step]);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setExiting(true);
    setTimeout(() => onComplete(), 350);
  }, [onComplete]);

  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
      style={{ background: "rgba(2,6,18,0.85)", backdropFilter: "blur(12px)" }}
      data-testid="onboarding-overlay"
    >
      <div
        className={`relative w-full max-w-lg mx-4 rounded-2xl border overflow-hidden transition-all duration-400 ${entering ? "scale-95 opacity-0" : "scale-100 opacity-100"} ${exiting ? "scale-95 opacity-0" : ""}`}
        style={{
          background: "linear-gradient(145deg, hsl(222 33% 9%), hsl(222 40% 7%))",
          borderColor: `${current.color}30`,
          boxShadow: `0 0 80px ${current.color}15, 0 20px 60px rgba(0,0,0,0.5)`,
        }}
      >
        <button
          onClick={finish}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors z-10"
          data-testid="button-skip-onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="h-1 bg-muted/20">
          <div
            className="h-full transition-all duration-500 ease-out rounded-r"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${current.color}, ${current.color}80)` }}
          />
        </div>

        <div className="px-8 pt-8 pb-3">
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{
                  background: i <= step ? current.color : "rgba(148,163,184,0.15)",
                  opacity: i === step ? 1 : i < step ? 0.5 : 0.3,
                }}
              />
            ))}
          </div>

          <div
            className="w-14 h-14 rounded-xl grid place-items-center mb-5"
            style={{
              background: `linear-gradient(135deg, ${current.color}25, ${current.color}10)`,
              border: `1px solid ${current.color}30`,
            }}
          >
            <Icon className="w-7 h-7" style={{ color: current.color }} />
          </div>

          <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: current.color }}>
            Step {step + 1} of {STEPS.length}
          </div>

          <h2 className="text-xl font-serif font-bold text-card-foreground mb-3">{current.title}</h2>
          <p className="text-sm text-foreground leading-relaxed mb-3">{current.description}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{current.detail}</p>
        </div>

        <div className="px-8 pb-8 pt-4 flex items-center justify-between gap-3">
          <button
            onClick={finish}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-skip-tour"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setExiting(true); setTimeout(() => { setStep(s => s - 1); setExiting(false); }, 250); }}
                data-testid="button-onboarding-back"
              >
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={next}
              className="gap-1.5 font-semibold"
              style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)` }}
              data-testid="button-onboarding-next"
            >
              {step === STEPS.length - 1 ? (
                <><Sparkles className="w-3.5 h-3.5" /> Get Started</>
              ) : (
                <>Next <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) setShow(true);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setShow(true);
  }, []);

  return { showOnboarding: show, dismissOnboarding: () => setShow(false), resetOnboarding: reset };
}
