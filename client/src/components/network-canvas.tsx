import { useRef, useEffect, useCallback } from "react";
import type { NetData, NetPolygon } from "@/lib/swmm-engine";
import { useTheme } from "@/components/theme-provider";

interface NetworkCanvasProps {
  netData: NetData;
}

export default function NetworkCanvas({ netData }: NetworkCanvasProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ ox: 0, oy: 0, scale: 1, dragging: false, lx: 0, ly: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !netData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const { nodes, links } = netData;
    const view = viewRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.save();

    const nodeArr = Object.values(nodes);
    if (nodeArr.length === 0) { ctx.restore(); return; }
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const n of nodeArr) {
      if (n.x < xMin) xMin = n.x;
      if (n.x > xMax) xMax = n.x;
      if (n.y < yMin) yMin = n.y;
      if (n.y > yMax) yMax = n.y;
    }
    const pad = 40;
    const dataW = (xMax - xMin) || 1;
    const dataH = (yMax - yMin) || 1;
    const fitScale = Math.min((W - pad * 2) / dataW, (H - pad * 2) / dataH);
    const totalScale = fitScale * view.scale;
    const cx = W / 2 + view.ox;
    const cy = H / 2 + view.oy;
    const dataCx = (xMin + xMax) / 2;
    const dataCy = (yMin + yMax) / 2;

    ctx.translate(cx, cy);
    ctx.scale(totalScale, -totalScale);
    ctx.translate(-dataCx, -dataCy);

    if (netData.polygons && netData.polygons.length > 0) {
      for (const poly of netData.polygons) {
        if (poly.vertices.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
        for (let vi = 1; vi < poly.vertices.length; vi++) {
          ctx.lineTo(poly.vertices[vi].x, poly.vertices[vi].y);
        }
        ctx.closePath();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = poly.color;
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = poly.color;
        ctx.lineWidth = 1 / totalScale;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    for (const l of links) {
      const a = nodes[l.from], b = nodes[l.to];
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      if (l.vertices && l.vertices.length > 0) {
        for (const v of l.vertices) {
          ctx.lineTo(v.x, v.y);
        }
      }
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = l.color;
      ctx.globalAlpha = l.alpha;
      ctx.lineWidth = l.width / totalScale;
      if (l.isPump) {
        ctx.setLineDash([6 / totalScale, 4 / totalScale]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    for (const n of nodeArr) {
      ctx.beginPath();
      const r = n.r / totalScale;
      if (n.type === "outfall") {
        ctx.moveTo(n.x, n.y - r * 1.5);
        ctx.lineTo(n.x - r * 1.3, n.y + r);
        ctx.lineTo(n.x + r * 1.3, n.y + r);
        ctx.closePath();
        ctx.fillStyle = n.color;
        ctx.fill();
      } else if (n.type === "storage") {
        ctx.rect(n.x - r, n.y - r, r * 2, r * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
      } else {
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
      }
    }

    if (nodeArr.length < 5000) {
      ctx.save();
      ctx.scale(1, -1);
      const labelSize = Math.max(8, 11 / totalScale);
      ctx.font = `600 ${labelSize}px 'JetBrains Mono', monospace`;
      for (const n of nodeArr) {
        if (n.type === "outfall" || n.type === "storage") {
          ctx.fillStyle = n.color;
          ctx.fillText(n.name, n.x + 6 / totalScale, -n.y - 4 / totalScale);
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }, [netData, theme]);

  useEffect(() => {
    viewRef.current = { ox: 0, oy: 0, scale: 1, dragging: false, lx: 0, ly: 0 };
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      viewRef.current.dragging = true;
      viewRef.current.lx = e.clientX;
      viewRef.current.ly = e.clientY;
      canvas.style.cursor = "grabbing";
    };

    const onMouseMove = (e: MouseEvent) => {
      const view = viewRef.current;
      if (view.dragging) {
        view.ox += e.clientX - view.lx;
        view.oy += e.clientY - view.ly;
        view.lx = e.clientX;
        view.ly = e.clientY;
        draw();
      }

      if (!netData || view.dragging) {
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);

      const nodeArr = Object.values(netData.nodes);
      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      for (const n of nodeArr) {
        if (n.x < xMin) xMin = n.x; if (n.x > xMax) xMax = n.x;
        if (n.y < yMin) yMin = n.y; if (n.y > yMax) yMax = n.y;
      }
      const pad = 40, W = canvas.width, H = canvas.height;
      const dataW = (xMax - xMin) || 1, dataH = (yMax - yMin) || 1;
      const fitScale = Math.min((W - pad * 2) / dataW, (H - pad * 2) / dataH);
      const totalScale = fitScale * view.scale;
      const cx = W / 2 + view.ox, cy = H / 2 + view.oy;
      const dataCx = (xMin + xMax) / 2, dataCy = (yMin + yMax) / 2;
      const dx = (mx - cx) / totalScale + dataCx;
      const dy = -((my - cy) / totalScale) + dataCy;

      let best: (typeof nodeArr)[0] | null = null, bestDist = Infinity;
      const hitR = 15 / totalScale;
      for (const n of nodeArr) {
        const d = Math.hypot(n.x - dx, n.y - dy);
        if (d < hitR && d < bestDist) { best = n; bestDist = d; }
      }

      const tip = tooltipRef.current;
      if (tip && best) {
        let html = `<strong style="color:${best.color}">${best.name}</strong> (${best.type})`;
        if (best.elev !== undefined) html += `<br/>Invert: ${best.elev.toFixed(2)} | Depth: ${best.maxD?.toFixed(1)}`;
        tip.innerHTML = html;
        tip.style.display = "block";
        tip.style.left = (e.clientX - rect.left + 12) + "px";
        tip.style.top = (e.clientY - rect.top - 10) + "px";
      } else if (tip) {
        tip.style.display = "none";
      }
    };

    const onMouseUp = () => {
      viewRef.current.dragging = false;
      canvas.style.cursor = "grab";
    };

    const onMouseLeave = () => {
      viewRef.current.dragging = false;
      canvas.style.cursor = "grab";
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      viewRef.current.scale *= factor;
      viewRef.current.scale = Math.max(0.1, Math.min(20, viewRef.current.scale));
      draw();
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [netData, draw]);

  const zoom = (factor: number) => {
    viewRef.current.scale *= factor;
    viewRef.current.scale = Math.max(0.1, Math.min(20, viewRef.current.scale));
    draw();
  };

  const reset = () => {
    viewRef.current = { ox: 0, oy: 0, scale: 1, dragging: false, lx: 0, ly: 0 };
    draw();
  };

  const nOffsets = netData.links.filter(l => l.hasOffset).length;
  const nPumps = netData.links.filter(l => l.isPump).length;
  const nodeCount = Object.keys(netData.nodes).length;
  const nPolygons = netData.polygons?.length || 0;

  return (
    <div data-testid="network-preview">
      <div className="flex gap-2.5 mb-3 flex-wrap text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#38bdf8" }} /> Junction</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} /> Outfall</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#fb923c" }} /> Storage</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#818cf8" }} /> Pump link</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] rounded-sm" style={{ background: "#34d399" }} /> Conduit</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] rounded-sm" style={{ background: "#f472b6" }} /> Has offset</span>
        {nPolygons > 0 && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border" style={{ background: "rgba(52,211,153,0.15)", borderColor: "rgba(52,211,153,0.4)" }} /> Subcatchment</span>}
      </div>
      <div className="relative rounded-lg border border-border bg-[#f5f7fa] dark:bg-[#080c14]">
        <canvas
          ref={canvasRef}
          width={900}
          height={560}
          className="w-full block cursor-grab"
          data-testid="canvas-network"
        />
        <div
          ref={tooltipRef}
          className="hidden absolute pointer-events-none rounded-md border border-border/50 px-2.5 py-1.5 font-mono text-[11px] text-foreground z-10 bg-white/95 dark:bg-[#0a0e17]/95 backdrop-blur-lg"
        />
      </div>
      <div className="flex justify-between items-center mt-2.5">
        <span className="text-[11px] text-muted-foreground font-mono" data-testid="text-network-stats">
          {nodeCount} nodes | {netData.links.length} links | {nOffsets} with offsets | {nPumps} pump links{nPolygons > 0 ? ` | ${nPolygons} polygons` : ''}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => zoom(1.2)}
            className="w-7 h-7 rounded-md border border-border bg-card text-foreground text-sm grid place-items-center transition-colors hover:border-primary hover:text-primary"
            data-testid="button-zoom-in"
          >+</button>
          <button
            onClick={() => zoom(0.8)}
            className="w-7 h-7 rounded-md border border-border bg-card text-foreground text-sm grid place-items-center transition-colors hover:border-primary hover:text-primary"
            data-testid="button-zoom-out"
          >-</button>
          <button
            onClick={reset}
            className="w-7 h-7 rounded-md border border-border bg-card text-foreground text-sm grid place-items-center transition-colors hover:border-primary hover:text-primary"
            data-testid="button-zoom-reset"
          >&#8634;</button>
        </div>
      </div>
    </div>
  );
}
