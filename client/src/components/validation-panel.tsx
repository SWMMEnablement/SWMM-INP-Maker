import { type ValidationResult } from "@/lib/inp-validator";
import { CheckCircle2, AlertTriangle, XCircle, Wrench, ChevronDown, Shield, Zap, Cpu, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  result: ValidationResult;
  onDownloadFixed?: () => void;
}

export default function ValidationPanel({ result, onDownloadFixed }: Props) {
  const [showWarnings, setShowWarnings] = useState(false);
  const [showFixes, setShowFixes] = useState(false);

  const unfixedErrors = result.errors.filter(
    (e) => !result.fixes.some((f) => f.issue === e.message)
  );
  const isClean = unfixedErrors.length === 0 && result.warnings.length === 0;
  const hasFixedIssues = result.fixes.length > 0;

  const statusColor = unfixedErrors.length > 0 ? "text-red-400" : isClean ? "text-emerald-400" : "text-amber-400";
  const statusBg = unfixedErrors.length > 0 ? "border-red-500/30 bg-red-500/5" : isClean ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5";
  const StatusIcon = unfixedErrors.length > 0 ? XCircle : isClean ? CheckCircle2 : AlertTriangle;
  const statusText = unfixedErrors.length > 0
    ? `${unfixedErrors.length} Error${unfixedErrors.length > 1 ? "s" : ""} Found`
    : isClean && !hasFixedIssues
      ? "Model Passes All Checks"
      : hasFixedIssues && unfixedErrors.length === 0
        ? "Model Valid After Auto-Repair"
        : `${result.warnings.length} Warning${result.warnings.length > 1 ? "s" : ""}`;

  return (
    <div className={`rounded-lg border ${statusBg} overflow-hidden`} data-testid="validation-panel">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusIcon className={`w-5 h-5 flex-shrink-0 ${statusColor}`} />
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${statusColor}`} data-testid="validation-status">{statusText}</div>
            <div className="text-[10px] text-muted-foreground">
              Validated in {result.totalTime.toFixed(0)}ms &middot; {result.nodeCount} nodes &middot; {result.linkCount} links
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatBadge icon={XCircle} count={unfixedErrors.length} label="Errors" color={unfixedErrors.length > 0 ? "text-red-400" : "text-muted-foreground"} testId="validation-errors" />
          <StatBadge icon={AlertTriangle} count={result.warnings.length} label="Warnings" color={result.warnings.length > 0 ? "text-amber-400" : "text-muted-foreground"} testId="validation-warnings" />
          <StatBadge icon={Wrench} count={result.fixes.length} label="Fixed" color={result.fixes.length > 0 ? "text-sky-400" : "text-muted-foreground"} testId="validation-fixes" />
        </div>
      </div>

      <div className="px-4 py-2 border-t border-border/50 flex gap-2">
        {result.stages.map((stage) => {
          const stageColor = stage.status === "done" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
            : stage.status === "error" ? "text-red-400 border-red-500/20 bg-red-500/5"
              : "text-muted-foreground border-border bg-muted/30";
          const StageIcon = stage.name === "Static Analysis" ? Shield : stage.name === "Auto-Repair" ? Wrench : Cpu;
          return (
            <div key={stage.name} className={`flex-1 rounded-md border px-2.5 py-1.5 text-center ${stageColor}`}>
              <StageIcon className="w-3.5 h-3.5 mx-auto mb-0.5" />
              <div className="text-[10px] font-medium">{stage.name}</div>
              {stage.issues !== undefined && <div className="text-[9px] opacity-70">{stage.issues} issues</div>}
              {stage.fixes !== undefined && <div className="text-[9px] opacity-70">{stage.fixes} fixes</div>}
              {stage.status === "skipped" && stage.name === "Engine Validation" && result.engineNote === 'Running SWMM5 engine...'
                ? <div className="text-[9px] opacity-70 flex items-center justify-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />running</div>
                : stage.status === "skipped" && <div className="text-[9px] opacity-50">skipped</div>
              }
            </div>
          );
        })}
      </div>

      {result.engineResult && (
        <div className={`px-4 py-2.5 border-t border-border/50 text-[11px] ${result.engineResult.success ? 'text-emerald-400 bg-emerald-500/5' : 'text-red-400 bg-red-500/5'}`} data-testid="engine-result">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
            <div>
              <span className="font-medium">SWMM5 v{result.engineResult.version}:</span>{' '}
              {result.engineResult.summary}
              {result.engineResult.wallTimeMs > 0 && (
                <span className="text-muted-foreground ml-1.5">({(result.engineResult.wallTimeMs / 1000).toFixed(1)}s)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {result.fixes.length > 0 && (
        <div className="border-t border-border/50">
          <button
            onClick={() => setShowFixes(!showFixes)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-sky-400 transition-colors"
            data-testid="toggle-fixes"
          >
            <span className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Auto-Repairs Applied ({result.fixes.length})
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFixes ? "rotate-180" : ""}`} />
          </button>
          {showFixes && (
            <div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
              {result.fixes.map((fix, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-foreground">{fix.description}</span>
                    {fix.element && (
                      <span className="text-muted-foreground ml-1.5">
                        [{fix.element}]
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {onDownloadFixed && result.fixedInp && (
                <button
                  onClick={onDownloadFixed}
                  className="mt-2 text-[11px] text-sky-400 hover:text-sky-300 underline underline-offset-2"
                  data-testid="button-download-fixed"
                >
                  Download fixed .inp
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {unfixedErrors.length > 0 && (
        <div className="border-t border-border/50 px-4 py-3 space-y-1.5">
          <div className="text-xs font-semibold text-red-400 mb-2">
            Remaining Errors ({unfixedErrors.length})
          </div>
          {unfixedErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] py-1 px-2.5 rounded bg-red-500/5 border-l-2 border-red-500/40">
              <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-foreground">{err.message}</span>
                {err.line && <span className="text-muted-foreground ml-1.5">line {err.line}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="border-t border-border/50">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-amber-400 transition-colors"
            data-testid="toggle-warnings"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Warnings ({result.warnings.length})
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWarnings ? "rotate-180" : ""}`} />
          </button>
          {showWarnings && (
            <div className="px-4 pb-3 space-y-1 max-h-48 overflow-y-auto">
              {result.warnings.map((warn, i) => (
                <div key={i} className="text-[11px] py-1 px-2.5 rounded bg-amber-500/5 border-l-2 border-amber-500/30 text-foreground">
                  {warn.message}
                  {warn.line && <span className="text-muted-foreground ml-1.5">line {warn.line}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBadge({ icon: Icon, count, label, color, testId }: { icon: typeof XCircle; count: number; label: string; color: string; testId: string }) {
  return (
    <div className="text-center" data-testid={testId}>
      <div className={`text-base font-bold font-mono ${color}`}>{count}</div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
    </div>
  );
}
