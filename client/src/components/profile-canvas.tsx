import { useRef, useEffect, useCallback, useState } from "react";
import type { ProfileData } from "@/lib/swmm-engine";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProfileCanvasProps {
  profiles: ProfileData[];
}

export default function ProfileCanvas({ profiles }: ProfileCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const profile = profiles[selectedIdx] || profiles[0];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !profile || profile.nodes.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, W, H);

    const { nodes, conduits } = profile;
    const maxStation = nodes[nodes.length - 1].station;

    let minElev = Infinity, maxElev = -Infinity;
    for (const n of nodes) {
      if (n.invertElev < minElev) minElev = n.invertElev;
      if (n.crownElev > maxElev) maxElev = n.crownElev;
    }
    for (const c of conduits) {
      if (c.fromInvert < minElev) minElev = c.fromInvert;
      if (c.toInvert < minElev) minElev = c.toInvert;
      if (c.fromCrown > maxElev) maxElev = c.fromCrown;
      if (c.toCrown > maxElev) maxElev = c.toCrown;
    }

    const elevPad = (maxElev - minElev) * 0.15 || 1;
    minElev -= elevPad;
    maxElev += elevPad;

    const marginLeft = 70;
    const marginRight = 30;
    const marginTop = 30;
    const marginBottom = 50;
    const plotW = W - marginLeft - marginRight;
    const plotH = H - marginTop - marginBottom;

    const xScale = (station: number) => marginLeft + (station / maxStation) * plotW;
    const yScale = (elev: number) => marginTop + plotH - ((elev - minElev) / (maxElev - minElev)) * plotH;

    ctx.strokeStyle = "rgba(56,189,248,0.08)";
    ctx.lineWidth = 0.5;
    const nGridY = 8;
    const elevStep = (maxElev - minElev) / nGridY;
    ctx.fillStyle = "rgba(148,163,184,0.5)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= nGridY; i++) {
      const elev = minElev + i * elevStep;
      const y = yScale(elev);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(W - marginRight, y);
      ctx.stroke();
      ctx.fillText(elev.toFixed(1), marginLeft - 8, y);
    }

    const nGridX = Math.min(10, nodes.length);
    const stationStep = maxStation / nGridX;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= nGridX; i++) {
      const s = i * stationStep;
      const x = xScale(s);
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, marginTop + plotH);
      ctx.stroke();
      ctx.fillText(s.toFixed(0), x, marginTop + plotH + 6);
    }

    ctx.fillStyle = "rgba(148,163,184,0.7)";
    ctx.font = "11px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Station (${profile.unitLabel})`, marginLeft + plotW / 2, H - 8);

    ctx.save();
    ctx.translate(14, marginTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(`Elevation (${profile.unitLabel})`, 0, 0);
    ctx.restore();

    ctx.strokeStyle = "rgba(56,189,248,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(marginLeft, marginTop, plotW, plotH);

    for (const c of conduits) {
      const x1 = xScale(c.fromStation);
      const x2 = xScale(c.toStation);

      ctx.fillStyle = "rgba(52,211,153,0.08)";
      ctx.beginPath();
      ctx.moveTo(x1, yScale(c.fromCrown));
      ctx.lineTo(x2, yScale(c.toCrown));
      ctx.lineTo(x2, yScale(c.toInvert));
      ctx.lineTo(x1, yScale(c.fromInvert));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, yScale(c.fromCrown));
      ctx.lineTo(x2, yScale(c.toCrown));
      ctx.stroke();

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, yScale(c.fromInvert));
      ctx.lineTo(x2, yScale(c.toInvert));
      ctx.stroke();

      const midX = (x1 + x2) / 2;
      const midInvY = (yScale(c.fromInvert) + yScale(c.toInvert)) / 2;
      const slope = Math.abs(c.toInvert - c.fromInvert) / c.diameter;
      if (x2 - x1 > 40) {
        ctx.fillStyle = "rgba(148,163,184,0.5)";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(`${c.diameter.toFixed(2)}`, midX, midInvY - 3);
      }
    }

    for (const n of nodes) {
      const x = xScale(n.station);
      const yInv = yScale(n.invertElev);
      const yCrown = yScale(n.crownElev);

      ctx.strokeStyle = "rgba(148,163,184,0.15)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, yCrown);
      ctx.lineTo(x, yInv);
      ctx.stroke();
      ctx.setLineDash([]);

      if (n.type === "outfall") {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(x - 6, yInv);
        ctx.lineTo(x + 6, yInv);
        ctx.lineTo(x, yInv + 8);
        ctx.closePath();
        ctx.fill();
      } else if (n.type === "storage") {
        ctx.fillStyle = "#fb923c";
        ctx.fillRect(x - 4, yInv - 4, 8, 8);
      } else {
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(x, yInv, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#818cf8";
      ctx.beginPath();
      ctx.arc(x, yCrown, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Profile: ${profile.outfallName} → upstream (${nodes.length} nodes, ${conduits.length} conduits)`, marginLeft + 8, marginTop + 6);

    const legendY = marginTop + 22;
    const items = [
      { color: "#38bdf8", label: "Invert (HGL base)", shape: "line" as const },
      { color: "#34d399", label: "Crown (soffit)", shape: "line" as const },
      { color: "#ef4444", label: "Outfall", shape: "tri" as const },
      { color: "#38bdf8", label: "Junction", shape: "circle" as const },
      { color: "#818cf8", label: "Crown node", shape: "circle" as const },
    ];
    let lx = marginLeft + 8;
    ctx.font = "9px 'DM Sans', sans-serif";
    for (const item of items) {
      if (item.shape === "line") {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, legendY + 5);
        ctx.lineTo(lx + 14, legendY + 5);
        ctx.stroke();
      } else if (item.shape === "circle") {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(lx + 7, legendY + 5, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.moveTo(lx + 2, legendY + 2);
        ctx.lineTo(lx + 12, legendY + 2);
        ctx.lineTo(lx + 7, legendY + 9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "rgba(148,163,184,0.7)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label, lx + 18, legendY + 5);
      lx += ctx.measureText(item.label).width + 30;
    }
  }, [profile]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip || !profile) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = rect.width;
    const H = rect.height;

    const { nodes } = profile;
    const maxStation = nodes[nodes.length - 1].station;
    let minElev = Infinity, maxElev = -Infinity;
    for (const n of nodes) {
      if (n.invertElev < minElev) minElev = n.invertElev;
      if (n.crownElev > maxElev) maxElev = n.crownElev;
    }
    const elevPad = (maxElev - minElev) * 0.15 || 1;
    minElev -= elevPad; maxElev += elevPad;

    const marginLeft = 70, marginRight = 30, marginTop = 30, marginBottom = 50;
    const plotW = W - marginLeft - marginRight;

    const xScale = (station: number) => marginLeft + (station / maxStation) * plotW;

    let closest: typeof nodes[0] | null = null;
    let closestDist = Infinity;
    for (const n of nodes) {
      const nx = xScale(n.station);
      const d = Math.abs(mx - nx);
      if (d < closestDist && d < 30) { closestDist = d; closest = n; }
    }

    if (closest) {
      tooltip.style.display = "block";
      tooltip.style.left = `${Math.min(mx + 12, W - 160)}px`;
      tooltip.style.top = `${Math.max(my - 60, 5)}px`;
      tooltip.innerHTML = `
        <div style="font-weight:600;color:#38bdf8;margin-bottom:3px">${closest.name} (${closest.type})</div>
        <div>Invert: <span style="color:#38bdf8">${closest.invertElev.toFixed(3)} ${profile.unitLabel}</span></div>
        <div>Crown: <span style="color:#34d399">${closest.crownElev.toFixed(3)} ${profile.unitLabel}</span></div>
        <div>Max Depth: <span style="color:#818cf8">${closest.maxDepth.toFixed(2)} ${profile.unitLabel}</span></div>
        <div>Station: <span style="color:#fb923c">${closest.station.toFixed(1)} ${profile.unitLabel}</span></div>
      `;
    } else {
      tooltip.style.display = "none";
    }
  }, [profile]);

  if (!profiles.length) return null;

  return (
    <div className="space-y-3" data-testid="profile-view">
      {profiles.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-muted-foreground">Outfall Profile</label>
          <Select value={String(selectedIdx)} onValueChange={(v) => setSelectedIdx(parseInt(v))}>
            <SelectTrigger className="w-[260px]" data-testid="select-profile-outfall">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p, i) => (
                <SelectItem key={i} value={String(i)}>
                  {p.outfallName} ({p.nodes.length} nodes, {p.conduits.length} conduits)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="relative rounded-lg overflow-hidden border border-border" style={{ background: "#0a0e1a" }}>
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: 340 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { if (tooltipRef.current) tooltipRef.current.style.display = "none"; }}
          data-testid="canvas-profile"
        />
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none hidden rounded-lg border px-3 py-2 text-[11px] leading-snug font-mono z-20"
          style={{
            background: "rgba(10,14,26,0.95)",
            borderColor: "rgba(56,189,248,0.3)",
            color: "#94a3b8",
            backdropFilter: "blur(8px)",
          }}
        />
      </div>
    </div>
  );
}
