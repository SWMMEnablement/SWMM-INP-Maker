export interface ValidationIssue {
  source: "static";
  severity: "error" | "warning";
  message: string;
  line?: number;
  fixable: boolean;
  fixAction?: string;
  element?: string;
  data?: Record<string, unknown>;
}

export interface ValidationFix {
  issue: string;
  action: string;
  element?: string;
  description: string;
}

export interface ValidationStage {
  name: string;
  status: "done" | "error" | "skipped";
  issues?: number;
  fixes?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  fixes: ValidationFix[];
  stages: ValidationStage[];
  originalInp: string;
  fixedInp: string | null;
  totalTime: number;
  nodeCount: number;
  linkCount: number;
  subcatchCount: number;
  engineNote: string;
}

export function validateInp(inpContent: string, autoFix = true): ValidationResult {
  const startTime = performance.now();

  const result: ValidationResult = {
    valid: false,
    errors: [],
    warnings: [],
    fixes: [],
    stages: [],
    originalInp: inpContent,
    fixedInp: null,
    totalTime: 0,
    nodeCount: 0,
    linkCount: 0,
    subcatchCount: 0,
    engineNote: "Static analysis only — embed WASM SWMM 5.2.4 for full engine validation",
  };

  const staticIssues = staticAnalysis(inpContent);
  result.stages.push({ name: "Static Analysis", status: "done", issues: staticIssues.length });

  for (const issue of staticIssues) {
    if (issue.severity === "error") result.errors.push(issue);
    else result.warnings.push(issue);
  }

  let workingInp = inpContent;
  if (autoFix && staticIssues.some((i) => i.fixable)) {
    const fixResult = autoFixStatic(workingInp, staticIssues);
    workingInp = fixResult.fixedInp;
    result.fixes.push(...fixResult.fixes);
    result.stages.push({ name: "Auto-Repair", status: "done", fixes: fixResult.fixes.length });
  } else {
    result.stages.push({ name: "Auto-Repair", status: "skipped" });
  }

  result.stages.push({
    name: "Engine Validation",
    status: "skipped",
  });

  const unfixedErrors = result.errors.filter(
    (e) => !result.fixes.some((f) => f.issue === e.message)
  );
  result.valid = unfixedErrors.length === 0;
  result.fixedInp = workingInp !== inpContent ? workingInp : null;

  const counts = countElements(inpContent);
  result.nodeCount = counts.nodes;
  result.linkCount = counts.links;
  result.subcatchCount = counts.subcatchments;

  result.totalTime = performance.now() - startTime;
  return result;
}

function countElements(inp: string) {
  const lines = inp.split("\n");
  let section = "";
  let nodes = 0, links = 0, subcatchments = 0;
  const nodeSections = new Set(["[JUNCTIONS]", "[OUTFALLS]", "[STORAGE]", "[DIVIDERS]"]);
  const linkSections = new Set(["[CONDUITS]", "[PUMPS]", "[ORIFICES]", "[WEIRS]", "[OUTLETS]"]);
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("[") && t.endsWith("]")) { section = t.toUpperCase(); continue; }
    if (!t || t.startsWith(";")) continue;
    if (nodeSections.has(section)) nodes++;
    else if (linkSections.has(section)) links++;
    else if (section === "[SUBCATCHMENTS]") subcatchments++;
  }
  return { nodes, links, subcatchments };
}

function staticAnalysis(inpContent: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = inpContent.split("\n");
  let currentSection = "";

  const definedNodes = new Set<string>();
  const definedLinks = new Set<string>();
  const definedCurves = new Set<string>();
  const definedPatterns = new Set<string>();
  const referencedNodes = new Set<string>();
  const referencedCurves = new Set<string>();
  const referencedPatterns = new Set<string>();

  const nodeInverts: Record<string, number> = {};
  const nodeMaxDepths: Record<string, number> = {};
  const conduitData: Record<string, { from: string; to: string; length: number; roughness: number }> = {};
  const conduitShapes: Record<string, string> = {};
  const pendingRoughnessChecks: { name: string; roughness: number; line: number }[] = [];

  let hasOutfall = false;
  let hasOptions = false;
  let routingModel = "";
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
    const trimmed = line.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      currentSection = trimmed.toUpperCase();
      if (currentSection === "[OPTIONS]") hasOptions = true;
      continue;
    }

    if (!trimmed || trimmed.startsWith(";")) continue;
    const parts = trimmed.split(/\s+/);

    switch (currentSection) {
      case "[OPTIONS]":
        if (parts.length >= 2 && parts[0].toUpperCase() === "FLOW_ROUTING") {
          routingModel = parts[1].toUpperCase();
        }
        break;
      case "[JUNCTIONS]":
        if (parts.length >= 2) {
          definedNodes.add(parts[0]);
          nodeInverts[parts[0]] = parseFloat(parts[1]);
          nodeMaxDepths[parts[0]] = parseFloat(parts[2]) || 0;
          if (parseFloat(parts[1]) < -1000 || parseFloat(parts[1]) > 50000) {
            issues.push({
              source: "static", severity: "warning",
              message: `Junction ${parts[0]} has unusual invert elevation: ${parts[1]}`,
              line: lineNumber, fixable: false,
            });
          }
          if (parts[2] && parseFloat(parts[2]) <= 0) {
            issues.push({
              source: "static", severity: "error",
              message: `Junction ${parts[0]} has zero or negative max depth`,
              line: lineNumber, fixable: true, fixAction: "setDefaultDepth", element: parts[0],
            });
          }
        }
        break;

      case "[OUTFALLS]":
        if (parts.length >= 2) {
          definedNodes.add(parts[0]);
          hasOutfall = true;
          nodeInverts[parts[0]] = parseFloat(parts[1]);
        }
        break;

      case "[STORAGE]":
        if (parts.length >= 2) {
          definedNodes.add(parts[0]);
          nodeInverts[parts[0]] = parseFloat(parts[1]);
        }
        break;

      case "[CONDUITS]":
        if (parts.length >= 4) {
          definedLinks.add(parts[0]);
          referencedNodes.add(parts[1]);
          referencedNodes.add(parts[2]);
          conduitData[parts[0]] = {
            from: parts[1], to: parts[2],
            length: parseFloat(parts[3]),
            roughness: parseFloat(parts[4]) || 0.01,
          };
          if (parseFloat(parts[3]) <= 0) {
            issues.push({
              source: "static", severity: "error",
              message: `Conduit ${parts[0]} has zero or negative length`,
              line: lineNumber, fixable: true, fixAction: "setMinLength", element: parts[0],
            });
          }
          const roughness = parseFloat(parts[4]);
          if (roughness && (roughness < 0.001 || roughness > 0.5)) {
            pendingRoughnessChecks.push({ name: parts[0], roughness, line: lineNumber });
          }
        }
        break;

      case "[PUMPS]":
        if (parts.length >= 3) {
          definedLinks.add(parts[0]);
          referencedNodes.add(parts[1]);
          referencedNodes.add(parts[2]);
          if (parts[3] && parts[3] !== "*") referencedCurves.add(parts[3]);
        }
        break;

      case "[WEIRS]":
      case "[ORIFICES]":
        if (parts.length >= 3) {
          definedLinks.add(parts[0]);
          referencedNodes.add(parts[1]);
          referencedNodes.add(parts[2]);
        }
        break;

      case "[CURVES]":
        if (parts.length >= 1) definedCurves.add(parts[0]);
        break;

      case "[PATTERNS]":
        if (parts.length >= 1) definedPatterns.add(parts[0]);
        break;

      case "[DWF]":
        if (parts.length >= 2) {
          referencedNodes.add(parts[0]);
          for (let i = 3; i < parts.length; i++) {
            if (parts[i] && !parts[i].startsWith('"') && isNaN(parseFloat(parts[i]))) {
              referencedPatterns.add(parts[i].replace(/"/g, ""));
            }
          }
        }
        break;

      case "[SUBCATCHMENTS]":
        if (parts.length >= 3) {
          referencedNodes.add(parts[2]);
        }
        break;

      case "[XSECTIONS]":
        if (parts.length >= 2) {
          conduitShapes[parts[0]] = parts[1].toUpperCase();
        }
        break;
    }
  }

  for (const chk of pendingRoughnessChecks) {
    const shape = conduitShapes[chk.name] || "";
    if (shape === "FORCE_MAIN") {
      if (chk.roughness < 50 || chk.roughness > 200) {
        issues.push({
          source: "static", severity: "warning",
          message: `Force main ${chk.name} has unusual Hazen-Williams C: ${chk.roughness} (typical 100–150)`,
          line: chk.line, fixable: true, fixAction: "setDefaultRoughness", element: chk.name,
        });
      }
    } else {
      issues.push({
        source: "static", severity: "warning",
        message: `Conduit ${chk.name} has unusual Manning's n: ${chk.roughness}`,
        line: chk.line, fixable: true, fixAction: "setDefaultRoughness", element: chk.name,
      });
    }
  }

  if (!hasOutfall) {
    const isKinematic = routingModel === "KINWAVE";
    issues.push({
      source: "static", severity: isKinematic ? "warning" : "error",
      message: isKinematic
        ? "No outfall defined — not required for kinematic wave routing, but recommended"
        : "No outfall defined — model cannot run without at least one outfall",
      fixable: false,
    });
  }

  if (!hasOptions) {
    issues.push({
      source: "static", severity: "error",
      message: "No [OPTIONS] section — required for simulation",
      fixable: false,
    });
  }

  for (const node of referencedNodes) {
    if (!definedNodes.has(node)) {
      issues.push({
        source: "static", severity: "error",
        message: `Link references undefined node: ${node}`,
        fixable: false, element: node,
      });
    }
  }

  for (const curve of referencedCurves) {
    if (!definedCurves.has(curve)) {
      issues.push({
        source: "static", severity: "error",
        message: `Element references undefined curve: ${curve}`,
        fixable: false, element: curve,
      });
    }
  }

  for (const pat of referencedPatterns) {
    if (!definedPatterns.has(pat)) {
      issues.push({
        source: "static", severity: "warning",
        message: `DWF references undefined pattern: ${pat}`,
        fixable: false, element: pat,
      });
    }
  }

  let orphanCount = 0;
  for (const node of definedNodes) {
    if (!referencedNodes.has(node)) {
      const isOutfall = isOutfallNode(node, lines);
      if (!isOutfall) orphanCount++;
    }
  }
  if (orphanCount > 0) {
    issues.push({
      source: "static", severity: "warning",
      message: `${orphanCount} node${orphanCount > 1 ? "s" : ""} disconnected — no links reference ${orphanCount > 1 ? "them" : "it"}`,
      fixable: false,
    });
  }

  let adverseCount = 0;
  let flatCount = 0;
  for (const [id, data] of Object.entries(conduitData)) {
    const fromInvert = nodeInverts[data.from];
    const toInvert = nodeInverts[data.to];

    if (fromInvert !== undefined && toInvert !== undefined) {
      if (toInvert > fromInvert) {
        adverseCount++;
        issues.push({
          source: "static", severity: "warning",
          message: `Conduit ${id}: adverse slope — downstream (${toInvert.toFixed(2)}) > upstream (${fromInvert.toFixed(2)})`,
          fixable: true, fixAction: "fixAdverseSlope", element: id,
          data: { from: data.from, to: data.to, fromInvert, toInvert, length: data.length },
        });
      }

      if (data.length > 0) {
        const slope = Math.abs(fromInvert - toInvert) / data.length;
        if (slope < 0.0001 && slope >= 0) {
          flatCount++;
        }
      }
    }
  }
  if (flatCount > 5) {
    issues.push({
      source: "static", severity: "warning",
      message: `${flatCount} conduits have very flat slopes (< 0.01%) — may cause instability with DYNWAVE`,
      fixable: false,
    });
  }

  const duplicateCheck = new Set<string>();
  const allIds = [...definedNodes, ...definedLinks];
  const dupes = new Set<string>();
  for (const id of allIds) {
    if (duplicateCheck.has(id)) dupes.add(id);
    duplicateCheck.add(id);
  }
  if (dupes.size > 0) {
    issues.push({
      source: "static", severity: "error",
      message: `${dupes.size} duplicate element ID${dupes.size > 1 ? "s" : ""} found: ${[...dupes].slice(0, 5).join(", ")}${dupes.size > 5 ? "..." : ""}`,
      fixable: false,
    });
  }

  return issues;
}

function isOutfallNode(nodeId: string, lines: string[]): boolean {
  let inOutfalls = false;
  for (const line of lines) {
    const t = line.trim();
    if (t === "[OUTFALLS]") { inOutfalls = true; continue; }
    if (t.startsWith("[")) { inOutfalls = false; continue; }
    if (inOutfalls && !t.startsWith(";") && t.split(/\s+/)[0] === nodeId) return true;
  }
  return false;
}

function autoFixStatic(inpContent: string, issues: ValidationIssue[]): { fixedInp: string; fixes: ValidationFix[] } {
  let fixedInp = inpContent;
  const fixes: ValidationFix[] = [];
  const fixable = issues.filter((i) => i.fixable);

  for (const issue of fixable) {
    let fixed = false;
    switch (issue.fixAction) {
      case "setDefaultDepth":
        fixedInp = replaceNodeDepth(fixedInp, issue.element!, 4.0);
        fixed = true;
        break;
      case "setMinLength":
        fixedInp = replaceConduitField(fixedInp, issue.element!, 3, "10.0");
        fixed = true;
        break;
      case "setDefaultRoughness":
        fixedInp = replaceConduitField(fixedInp, issue.element!, 4, "0.013");
        fixed = true;
        break;
      case "fixAdverseSlope":
        if (issue.data) {
          const len = (issue.data.length as number) || 100;
          const newToInvert = (issue.data.fromInvert as number) - len * 0.001;
          fixedInp = replaceNodeInvert(fixedInp, issue.data.to as string, newToInvert);
          fixed = true;
        }
        break;
    }
    if (fixed) {
      fixes.push({
        issue: issue.message,
        action: issue.fixAction || "fix",
        element: issue.element,
        description: `Auto-fixed: ${issue.message}`,
      });
    }
  }

  return { fixedInp, fixes };
}

function replaceNodeDepth(inp: string, nodeId: string, newDepth: number): string {
  const lines = inp.split("\n");
  let inJunctions = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "[JUNCTIONS]") { inJunctions = true; continue; }
    if (t.startsWith("[")) { inJunctions = false; continue; }
    if (inJunctions && !t.startsWith(";")) {
      const parts = t.split(/\s+/);
      if (parts[0] === nodeId && parts.length >= 2) {
        parts[2] = newDepth.toFixed(2);
        lines[i] = parts.join("\t");
      }
    }
  }
  return lines.join("\n");
}

function replaceNodeInvert(inp: string, nodeId: string, newInvert: number): string {
  const lines = inp.split("\n");
  const sections = new Set(["[JUNCTIONS]", "[OUTFALLS]", "[STORAGE]"]);
  let currentSection = "";
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("[")) { currentSection = t.toUpperCase(); continue; }
    if (sections.has(currentSection) && !t.startsWith(";")) {
      const parts = t.split(/\s+/);
      if (parts[0] === nodeId && parts.length >= 2) {
        parts[1] = newInvert.toFixed(2);
        lines[i] = parts.join("\t");
      }
    }
  }
  return lines.join("\n");
}

function replaceConduitField(inp: string, conduitId: string, colIndex: number, newValue: string): string {
  const lines = inp.split("\n");
  let inConduits = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "[CONDUITS]") { inConduits = true; continue; }
    if (t.startsWith("[")) { inConduits = false; continue; }
    if (inConduits && !t.startsWith(";")) {
      const parts = t.split(/\s+/);
      if (parts[0] === conduitId && parts.length > colIndex) {
        parts[colIndex] = newValue;
        lines[i] = parts.join("\t");
      }
    }
  }
  return lines.join("\n");
}
