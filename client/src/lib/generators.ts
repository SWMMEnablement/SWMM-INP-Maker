interface GraphNode { x: number; y: number; name: string; type: string; idx: number; elev: number; }
interface GraphEdge { from: GraphNode; to: GraphNode; length: number; }
interface GraphResult { allNodes: GraphNode[]; edges: GraphEdge[]; accumUpstream: Record<string, number>; }

type ElevFn = (x: number, y: number) => number;
type LSystemVariant = 'dendritic' | 'grid' | 'radial';

function computeAccumUpstream(allNodes: GraphNode[], edges: GraphEdge[]): Record<string, number> {
  const accumUpstream: Record<string, number> = {};
  const visiting = new Set<string>();
  function countUp(name: string): number {
    if (accumUpstream[name] !== undefined) return accumUpstream[name];
    if (visiting.has(name)) { accumUpstream[name] = 0; return 0; }
    visiting.add(name);
    let count = 0;
    for (const e of edges) {
      if (e.to.name === name) count += 1 + countUp(e.from.name);
    }
    visiting.delete(name);
    accumUpstream[name] = count;
    return count;
  }
  for (const n of allNodes) countUp(n.name);
  return accumUpstream;
}

function clampToDomain(v: number, domain: number, margin: number = 0.02): number {
  return Math.max(domain * margin, Math.min(domain * (1 - margin), v));
}

export function generateHortonStrahler(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const Rb = 3.5;
  const Rl = 2.0;
  const maxOrder = Math.max(1, Math.ceil(Math.log(safeN) / Math.log(Rb)));

  const junctions: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let jIdx = 0;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  function branch(
    parentNode: GraphNode,
    angle: number,
    segLen: number,
    order: number
  ): void {
    if (order <= 0 || junctions.length >= safeN) return;

    const jitter = (Math.random() - 0.5) * 0.3;
    const actualAngle = angle + jitter;
    const nx = clampToDomain(parentNode.x + Math.cos(actualAngle) * segLen, domain);
    const ny = clampToDomain(parentNode.y + Math.sin(actualAngle) * segLen, domain);

    const node: GraphNode = {
      x: nx, y: ny,
      name: `J${jIdx + 1}`,
      type: 'junction',
      idx: jIdx,
      elev: elevFn(nx, ny) + (order * 0.05)
    };
    jIdx++;
    junctions.push(node);

    const length = Math.hypot(nx - parentNode.x, ny - parentNode.y);
    edges.push({ from: node, to: parentNode, length });

    if (junctions.length >= safeN) return;

    const nBranches = Math.min(Math.round(Rb), 4);
    const childLen = segLen / Rl;
    const spreadAngle = Math.PI / (nBranches + 1);

    for (let b = 0; b < nBranches && junctions.length < safeN; b++) {
      const childAngle = actualAngle - (spreadAngle * (nBranches - 1) / 2) + spreadAngle * b;
      const angleJitter = (Math.random() - 0.5) * 0.5;
      branch(node, childAngle + angleJitter, childLen * (0.8 + Math.random() * 0.4), order - 1);
    }
  }

  const baseSegLen = domain * 0.15;

  for (let oi = 0; oi < outfallNodes.length && junctions.length < safeN; oi++) {
    const outfall = outfallNodes[oi];
    const cx = domain / 2;
    const cy = domain / 2;
    const awayAngle = Math.atan2(cy - outfall.y, cx - outfall.x);

    const nMainBranches = Math.max(1, Math.ceil(3 / nOutfalls));
    const mainSpread = Math.PI * 0.6;

    for (let mb = 0; mb < nMainBranches && junctions.length < safeN; mb++) {
      const mainAngle = awayAngle - mainSpread / 2 + mainSpread * (mb / Math.max(1, nMainBranches - 1));
      branch(outfall, mainAngle + (Math.random() - 0.5) * 0.3, baseSegLen, maxOrder);
    }
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);

  const accumUpstream = computeAccumUpstream(allNodes, edges);
  return { allNodes, edges, accumUpstream };
}

export function generateLSystem(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn,
  variant: LSystemVariant = 'dendritic'
): GraphResult {
  const safeN = Math.max(3, N);

  const grammars: Record<LSystemVariant, { axiom: string; rules: Record<string, string>; angle: number }> = {
    dendritic: { axiom: 'F', rules: { 'F': 'FF[+F][-F]' }, angle: 35 * Math.PI / 180 },
    grid:      { axiom: 'F', rules: { 'F': 'F[+F]F[-F]F' }, angle: 90 * Math.PI / 180 },
    radial:    { axiom: 'F', rules: { 'F': 'F[+F][-F][++F][--F]' }, angle: 72 * Math.PI / 180 },
  };

  const grammar = grammars[variant];

  let targetDepth = 1;
  let testStr = grammar.axiom;
  while (targetDepth < 12) {
    let next = '';
    for (const ch of testStr) {
      next += grammar.rules[ch] || ch;
    }
    const fCount = (next.match(/F/g) || []).length;
    if (fCount >= safeN * 1.5) break;
    testStr = next;
    targetDepth++;
  }

  let lStr = grammar.axiom;
  for (let i = 0; i < targetDepth; i++) {
    let next = '';
    for (const ch of lStr) {
      next += grammar.rules[ch] || ch;
    }
    lStr = next;
  }

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const junctions: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let jIdx = 0;

  const segLen = domain * 0.08 / Math.max(1, targetDepth * 0.5);
  const nodesPerOutfall = Math.ceil(safeN / nOutfalls);

  for (let oi = 0; oi < outfallNodes.length; oi++) {
    const outfall = outfallNodes[oi];
    const cx = domain / 2;
    const cy = domain / 2;
    const initAngle = Math.atan2(cy - outfall.y, cx - outfall.x);

    let curX = outfall.x;
    let curY = outfall.y;
    let curAngle = initAngle;
    let curParent: GraphNode = outfall;

    const stack: { x: number; y: number; angle: number; parent: GraphNode }[] = [];
    let outfallJunctionCount = 0;

    for (const ch of lStr) {
      if (outfallJunctionCount >= nodesPerOutfall || junctions.length >= safeN) break;

      switch (ch) {
        case 'F': {
          const jitter = (Math.random() - 0.5) * 0.15;
          const nx = clampToDomain(curX + Math.cos(curAngle + jitter) * segLen, domain);
          const ny = clampToDomain(curY + Math.sin(curAngle + jitter) * segLen, domain);

          const node: GraphNode = {
            x: nx, y: ny,
            name: `J${jIdx + 1}`,
            type: 'junction',
            idx: jIdx,
            elev: elevFn(nx, ny) + Math.hypot(nx - outfall.x, ny - outfall.y) * 0.001
          };
          jIdx++;
          junctions.push(node);
          outfallJunctionCount++;

          const length = Math.hypot(nx - curParent.x, ny - curParent.y);
          edges.push({ from: node, to: curParent, length });

          curX = nx;
          curY = ny;
          curParent = node;
          break;
        }
        case '+':
          curAngle += grammar.angle;
          break;
        case '-':
          curAngle -= grammar.angle;
          break;
        case '[':
          stack.push({ x: curX, y: curY, angle: curAngle, parent: curParent });
          break;
        case ']':
          if (stack.length > 0) {
            const state = stack.pop()!;
            curX = state.x;
            curY = state.y;
            curAngle = state.angle;
            curParent = state.parent;
          }
          break;
      }
    }
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);

  const accumUpstream = computeAccumUpstream(allNodes, edges);
  return { allNodes, edges, accumUpstream };
}

export function generateSpaceColonization(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const margin = domain * 0.05;

  const attractors: { x: number; y: number; alive: boolean }[] = [];
  const numAttractors = Math.max(safeN, safeN * 2);
  for (let i = 0; i < numAttractors; i++) {
    attractors.push({
      x: margin + Math.random() * (domain - 2 * margin),
      y: margin + Math.random() * (domain - 2 * margin),
      alive: true
    });
  }

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const treeNodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let jIdx = 0;

  interface TreeEntry { node: GraphNode; parent: GraphNode | null; }
  const tree: TreeEntry[] = outfallNodes.map(n => ({ node: n, parent: null }));

  const segLen = domain / Math.max(5, Math.sqrt(safeN) * 1.5);
  const killDist = segLen * 1.5;
  const influenceDist = segLen * 8;
  const maxIters = Math.min(safeN * 3, 5000);

  for (let iter = 0; iter < maxIters && treeNodes.length < safeN; iter++) {
    const growDirs = new Map<number, { dx: number; dy: number; count: number }>();

    let anyAlive = false;
    for (const attr of attractors) {
      if (!attr.alive) continue;
      anyAlive = true;

      let closestIdx = -1;
      let closestDist = Infinity;
      for (let ti = 0; ti < tree.length; ti++) {
        const tn = tree[ti].node;
        const d = Math.hypot(tn.x - attr.x, tn.y - attr.y);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = ti;
        }
      }

      if (closestDist < killDist) {
        attr.alive = false;
        continue;
      }

      if (closestDist < influenceDist && closestIdx >= 0) {
        const tn = tree[closestIdx].node;
        const dx = attr.x - tn.x;
        const dy = attr.y - tn.y;
        const d = Math.hypot(dx, dy) + 0.001;
        const existing = growDirs.get(closestIdx) || { dx: 0, dy: 0, count: 0 };
        existing.dx += dx / d;
        existing.dy += dy / d;
        existing.count++;
        growDirs.set(closestIdx, existing);
      }
    }

    if (!anyAlive && treeNodes.length < safeN) {
      for (let i = 0; i < Math.min(safeN - treeNodes.length, 20); i++) {
        attractors.push({
          x: margin + Math.random() * (domain - 2 * margin),
          y: margin + Math.random() * (domain - 2 * margin),
          alive: true
        });
      }
      continue;
    }

    if (growDirs.size === 0) {
      const randTreeIdx = Math.floor(Math.random() * tree.length);
      const parent = tree[randTreeIdx].node;
      const angle = Math.random() * Math.PI * 2;
      const nx = clampToDomain(parent.x + Math.cos(angle) * segLen, domain);
      const ny = clampToDomain(parent.y + Math.sin(angle) * segLen, domain);

      const node: GraphNode = {
        x: nx, y: ny,
        name: `J${jIdx + 1}`,
        type: 'junction',
        idx: jIdx,
        elev: elevFn(nx, ny) + Math.hypot(nx - parent.x, ny - parent.y) * 0.001
      };
      jIdx++;
      treeNodes.push(node);
      tree.push({ node, parent: parent });
      edges.push({ from: node, to: parent, length: Math.hypot(nx - parent.x, ny - parent.y) });
      continue;
    }

    const growEntries = Array.from(growDirs.entries());
    for (let gi = 0; gi < growEntries.length; gi++) {
      if (treeNodes.length >= safeN) break;
      const [tIdx, dir] = growEntries[gi];
      const parent = tree[tIdx].node;
      const d = Math.hypot(dir.dx, dir.dy) + 0.001;
      const jitter = (Math.random() - 0.5) * 0.2;
      const angle = Math.atan2(dir.dy / d, dir.dx / d) + jitter;
      const nx = clampToDomain(parent.x + Math.cos(angle) * segLen, domain);
      const ny = clampToDomain(parent.y + Math.sin(angle) * segLen, domain);

      const node: GraphNode = {
        x: nx, y: ny,
        name: `J${jIdx + 1}`,
        type: 'junction',
        idx: jIdx,
        elev: elevFn(nx, ny) + Math.hypot(nx - parent.x, ny - parent.y) * 0.001
      };
      jIdx++;
      treeNodes.push(node);
      tree.push({ node, parent: parent });
      edges.push({ from: node, to: parent, length: Math.hypot(nx - parent.x, ny - parent.y) });
    }
  }

  const allNodes = [...treeNodes, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);

  const accumUpstream = computeAccumUpstream(allNodes, edges);
  return { allNodes, edges, accumUpstream };
}

export function generateMST(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const margin = domain * 0.05;

  const points: { x: number; y: number }[] = [];
  const minDist = (domain * 0.8) / Math.sqrt(safeN * 2);
  const maxAttempts = safeN * 30;
  let attempts = 0;

  while (points.length < safeN && attempts < maxAttempts) {
    const x = margin + Math.random() * (domain - 2 * margin);
    const y = margin + Math.random() * (domain - 2 * margin);
    attempts++;

    let tooClose = false;
    for (const p of points) {
      if (Math.hypot(p.x - x, p.y - y) < minDist) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      points.push({ x, y });
    }
  }

  while (points.length < safeN) {
    points.push({
      x: margin + Math.random() * (domain - 2 * margin),
      y: margin + Math.random() * (domain - 2 * margin),
    });
  }

  const junctionNodes: GraphNode[] = points.map((p, i) => ({
    x: p.x, y: p.y,
    name: `J${i + 1}`,
    type: 'junction',
    idx: i,
    elev: elevFn(p.x, p.y)
  }));

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y,
    name: `OUT${i + 1}`,
    type: 'outfall',
    idx: safeN + i,
    elev: elevFn(o.x, o.y)
  }));

  const allNodes = [...junctionNodes, ...outfallNodes];
  const jn = junctionNodes.length;

  const inMST = new Array(jn).fill(false);
  const minCost = new Array(jn).fill(Infinity);
  const parentIdx = new Array(jn).fill(-1);

  minCost[0] = 0;

  const edges: GraphEdge[] = [];

  for (let count = 0; count < jn; count++) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < jn; i++) {
      if (!inMST[i] && minCost[i] < best) {
        best = minCost[i];
        u = i;
      }
    }
    if (u === -1) break;
    inMST[u] = true;

    if (parentIdx[u] !== -1) {
      const a = junctionNodes[u];
      const b = junctionNodes[parentIdx[u]];
      const from = a.elev >= b.elev ? a : b;
      const to = from === a ? b : a;
      edges.push({ from, to, length: Math.hypot(from.x - to.x, from.y - to.y) });
    }

    for (let v = 0; v < jn; v++) {
      if (inMST[v]) continue;
      const d = Math.hypot(junctionNodes[u].x - junctionNodes[v].x, junctionNodes[u].y - junctionNodes[v].y);
      if (d < minCost[v]) {
        minCost[v] = d;
        parentIdx[v] = u;
      }
    }
  }

  const childCount: Record<string, number> = {};
  for (const e of edges) {
    childCount[e.to.name] = (childCount[e.to.name] || 0) + 1;
  }

  const leafNodes = junctionNodes.filter(nd => {
    const hasUpstream = edges.some(e => e.to.name === nd.name);
    return !hasUpstream;
  });

  const nonLeafNodes = junctionNodes.filter(nd => {
    return edges.some(e => e.to.name === nd.name);
  });

  const sinkCandidates = nonLeafNodes.length > 0 ? nonLeafNodes : junctionNodes;

  for (const outNode of outfallNodes) {
    let closestJunction = sinkCandidates[0];
    let closestDist = Infinity;
    for (const jNode of sinkCandidates) {
      const d = Math.hypot(jNode.x - outNode.x, jNode.y - outNode.y);
      if (d < closestDist) { closestDist = d; closestJunction = jNode; }
    }
    edges.push({ from: closestJunction, to: outNode, length: closestDist });
  }

  for (const nd of junctionNodes) {
    if (!inMST[junctionNodes.indexOf(nd)]) {
      let closestOutfall = outfallNodes[0];
      let closestDist = Infinity;
      for (const on of outfallNodes) {
        const d = Math.hypot(nd.x - on.x, nd.y - on.y);
        if (d < closestDist) { closestDist = d; closestOutfall = on; }
      }
      edges.push({ from: nd, to: closestOutfall, length: closestDist });
    }
  }

  allNodes.forEach((nd, i) => nd.idx = i);

  const accumUpstream = computeAccumUpstream(allNodes, edges);
  return { allNodes, edges, accumUpstream };
}

export function generateD8FlowAccumulation(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const gridSize = Math.max(5, Math.ceil(Math.sqrt(safeN * 1.3)));
  const cellSize = domain / gridSize;
  const margin = cellSize * 0.5;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const grid: (GraphNode | null)[][] = [];
  const junctions: GraphNode[] = [];
  let jIdx = 0;

  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) {
      if (junctions.length >= safeN) { grid[r][c] = null; continue; }
      const x = margin + c * cellSize + (Math.random() - 0.5) * cellSize * 0.3;
      const y = margin + r * cellSize + (Math.random() - 0.5) * cellSize * 0.3;
      const cx = clampToDomain(x, domain);
      const cy = clampToDomain(y, domain);
      const node: GraphNode = { x: cx, y: cy, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(cx, cy) };
      jIdx++;
      junctions.push(node);
      grid[r][c] = node;
    }
  }

  const edges: GraphEdge[] = [];
  const dx8 = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy8 = [-1, -1, -1, 0, 0, 1, 1, 1];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const node = grid[r]?.[c];
      if (!node) continue;
      let steepest = -Infinity;
      let target: GraphNode | null = null;
      for (let d = 0; d < 8; d++) {
        const nr = r + dy8[d];
        const nc = c + dx8[d];
        if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
        const neighbor = grid[nr]?.[nc];
        if (!neighbor) continue;
        const dist = Math.hypot(node.x - neighbor.x, node.y - neighbor.y);
        const slope = (node.elev - neighbor.elev) / (dist + 0.01);
        if (slope > steepest) { steepest = slope; target = neighbor; }
      }
      if (target && steepest > 0) {
        edges.push({ from: node, to: target, length: Math.hypot(node.x - target.x, node.y - target.y) });
      }
    }
  }

  const hasDownstream = new Set(edges.map(e => e.from.name));
  const sinks = junctions.filter(j => !hasDownstream.has(j.name));
  for (const sink of sinks) {
    let closest = outfallNodes[0];
    let dist = Infinity;
    for (const o of outfallNodes) {
      const d = Math.hypot(sink.x - o.x, sink.y - o.y);
      if (d < dist) { dist = d; closest = o; }
    }
    edges.push({ from: sink, to: closest, length: dist });
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

export function generateVoronoiDelaunay(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const margin = domain * 0.05;

  const points: { x: number; y: number }[] = [];
  const minDist = (domain * 0.7) / Math.sqrt(safeN * 2);
  let attempts = 0;
  while (points.length < safeN && attempts < safeN * 40) {
    const x = margin + Math.random() * (domain - 2 * margin);
    const y = margin + Math.random() * (domain - 2 * margin);
    attempts++;
    let ok = true;
    for (const p of points) {
      if (Math.hypot(p.x - x, p.y - y) < minDist) { ok = false; break; }
    }
    if (ok) points.push({ x, y });
  }
  while (points.length < safeN) {
    points.push({ x: margin + Math.random() * (domain - 2 * margin), y: margin + Math.random() * (domain - 2 * margin) });
  }

  const junctions: GraphNode[] = points.map((p, i) => ({
    x: p.x, y: p.y, name: `J${i + 1}`, type: 'junction', idx: i, elev: elevFn(p.x, p.y)
  }));

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: safeN + i, elev: elevFn(o.x, o.y)
  }));

  const allPts = [...junctions, ...outfallNodes];
  const delaunayEdges: { a: number; b: number }[] = [];
  const kNeighbors = Math.min(12, allPts.length - 1);

  for (let i = 0; i < allPts.length; i++) {
    const dists: { idx: number; d: number }[] = [];
    for (let j = 0; j < allPts.length; j++) {
      if (j === i) continue;
      dists.push({ idx: j, d: Math.hypot(allPts[i].x - allPts[j].x, allPts[i].y - allPts[j].y) });
    }
    dists.sort((a, b) => a.d - b.d);
    for (const { idx: j } of dists.slice(0, kNeighbors)) {
      if (j <= i) continue;
      const mx = (allPts[i].x + allPts[j].x) / 2;
      const my = (allPts[i].y + allPts[j].y) / 2;
      const r = Math.hypot(allPts[i].x - allPts[j].x, allPts[i].y - allPts[j].y) / 2;
      let isGabriel = true;
      for (let k = 0; k < allPts.length; k++) {
        if (k === i || k === j) continue;
        if (Math.hypot(allPts[k].x - mx, allPts[k].y - my) < r * 0.99) { isGabriel = false; break; }
      }
      if (isGabriel) delaunayEdges.push({ a: i, b: j });
    }
  }

  const edges: GraphEdge[] = [];
  const parent = new Array(allPts.length).fill(-1);
  function find(x: number): number { return parent[x] < 0 ? x : (parent[x] = find(parent[x])); }
  function unite(a: number, b: number) { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }

  delaunayEdges.sort((a, b) => {
    const dA = Math.hypot(allPts[a.a].x - allPts[a.b].x, allPts[a.a].y - allPts[a.b].y);
    const dB = Math.hypot(allPts[b.a].x - allPts[b.b].x, allPts[b.a].y - allPts[b.b].y);
    return dA - dB;
  });

  for (const { a, b } of delaunayEdges) {
    if (find(a) !== find(b)) {
      unite(a, b);
      const from = allPts[a].elev >= allPts[b].elev ? allPts[a] : allPts[b];
      const to = from === allPts[a] ? allPts[b] : allPts[a];
      edges.push({ from, to, length: Math.hypot(from.x - to.x, from.y - to.y) });
    }
  }

  const hasOutfallEdge = new Set<string>();
  for (const e of edges) { if (e.to.type === 'outfall') hasOutfallEdge.add(e.to.name); }
  for (const o of outfallNodes) {
    if (hasOutfallEdge.has(o.name)) continue;
    let closest = junctions[0];
    let dist = Infinity;
    for (const j of junctions) { const d = Math.hypot(j.x - o.x, j.y - o.y); if (d < dist) { dist = d; closest = j; } }
    edges.push({ from: closest, to: o, length: dist });
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

export function generateInterceptorLateral(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const margin = domain * 0.05;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const junctions: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let jIdx = 0;

  const nInterceptorNodes = Math.max(3, Math.floor(safeN * 0.25));
  const nLateralsPerSide = Math.max(1, Math.floor((safeN - nInterceptorNodes) / (nInterceptorNodes * 2)));

  const primary = outfallNodes[0];
  const cx = domain / 2;
  const cy = domain / 2;
  const trunkAngle = Math.atan2(cy - primary.y, cx - primary.x);
  const trunkLen = domain * 0.7;
  const segLen = trunkLen / nInterceptorNodes;

  const trunkNodes: GraphNode[] = [];
  let prevNode: GraphNode = primary;

  for (let i = 0; i < nInterceptorNodes && junctions.length < safeN; i++) {
    const t = (i + 1) / nInterceptorNodes;
    const x = clampToDomain(primary.x + Math.cos(trunkAngle) * segLen * (i + 1), domain);
    const y = clampToDomain(primary.y + Math.sin(trunkAngle) * segLen * (i + 1), domain);
    const node: GraphNode = { x, y, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(x, y) + t * 0.5 };
    jIdx++;
    junctions.push(node);
    trunkNodes.push(node);
    edges.push({ from: node, to: prevNode, length: Math.hypot(node.x - prevNode.x, node.y - prevNode.y) });
    prevNode = node;
  }

  const perpAngle = trunkAngle + Math.PI / 2;
  const latLen = domain * 0.12;

  for (const trunk of trunkNodes) {
    for (const side of [-1, 1]) {
      let latPrev = trunk;
      for (let li = 0; li < nLateralsPerSide && junctions.length < safeN; li++) {
        const dist = latLen * (li + 1) / nLateralsPerSide;
        const lx = clampToDomain(trunk.x + Math.cos(perpAngle) * side * dist + (Math.random() - 0.5) * latLen * 0.15, domain);
        const ly = clampToDomain(trunk.y + Math.sin(perpAngle) * side * dist + (Math.random() - 0.5) * latLen * 0.15, domain);
        const node: GraphNode = { x: lx, y: ly, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(lx, ly) + 0.5 + li * 0.1 };
        jIdx++;
        junctions.push(node);
        edges.push({ from: node, to: latPrev, length: Math.hypot(node.x - latPrev.x, node.y - latPrev.y) });
        latPrev = node;
      }
    }
  }

  for (let oi = 1; oi < outfallNodes.length; oi++) {
    let closest = trunkNodes[0];
    let dist = Infinity;
    for (const t of trunkNodes) { const d = Math.hypot(t.x - outfallNodes[oi].x, t.y - outfallNodes[oi].y); if (d < dist) { dist = d; closest = t; } }
    edges.push({ from: closest, to: outfallNodes[oi], length: dist });
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

function perlinNoise2D(x: number, y: number, seed: number): number {
  const permute = (n: number) => ((n * 1597 + seed * 51749) & 0xffff) / 0xffff;
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const n00 = permute(ix + iy * 57);
  const n10 = permute(ix + 1 + iy * 57);
  const n01 = permute(ix + (iy + 1) * 57);
  const n11 = permute(ix + 1 + (iy + 1) * 57);
  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);
  return nx0 + sy * (nx1 - nx0);
}

export function generatePerlinD8(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const gridSize = Math.max(5, Math.ceil(Math.sqrt(safeN * 1.2)));
  const cellSize = domain / gridSize;
  const seed = Math.random() * 10000;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const grid: (GraphNode | null)[][] = [];
  const junctions: GraphNode[] = [];
  let jIdx = 0;

  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) {
      if (junctions.length >= safeN) { grid[r][c] = null; continue; }
      const x = clampToDomain(cellSize * (c + 0.5) + (Math.random() - 0.5) * cellSize * 0.2, domain);
      const y = clampToDomain(cellSize * (r + 0.5) + (Math.random() - 0.5) * cellSize * 0.2, domain);
      const octaves = 3;
      let elev = 0;
      for (let oct = 0; oct < octaves; oct++) {
        const freq = Math.pow(2, oct) * 4 / domain;
        const amp = 1 / Math.pow(2, oct);
        elev += perlinNoise2D(x * freq, y * freq, seed + oct * 1000) * amp;
      }
      const baseElev = elevFn(x, y);
      const node: GraphNode = { x, y, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: baseElev + elev * 5 };
      jIdx++;
      junctions.push(node);
      grid[r][c] = node;
    }
  }

  const edges: GraphEdge[] = [];
  const dx8 = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy8 = [-1, -1, -1, 0, 0, 1, 1, 1];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const node = grid[r]?.[c];
      if (!node) continue;
      let steepest = -Infinity;
      let target: GraphNode | null = null;
      for (let d = 0; d < 8; d++) {
        const nr = r + dy8[d], nc = c + dx8[d];
        if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
        const neighbor = grid[nr]?.[nc];
        if (!neighbor) continue;
        const dist = Math.hypot(node.x - neighbor.x, node.y - neighbor.y);
        const slope = (node.elev - neighbor.elev) / (dist + 0.01);
        if (slope > steepest) { steepest = slope; target = neighbor; }
      }
      if (target && steepest > 0) {
        edges.push({ from: node, to: target, length: Math.hypot(node.x - target.x, node.y - target.y) });
      }
    }
  }

  const hasDownstream = new Set(edges.map(e => e.from.name));
  for (const j of junctions) {
    if (!hasDownstream.has(j.name)) {
      let closest = outfallNodes[0];
      let dist = Infinity;
      for (const o of outfallNodes) { const d = Math.hypot(j.x - o.x, j.y - o.y); if (d < dist) { dist = d; closest = o; } }
      edges.push({ from: j, to: closest, length: dist });
    }
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

export function generateGeneticAlgorithm(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const margin = domain * 0.05;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const points: { x: number; y: number; elev: number }[] = [];
  for (let i = 0; i < safeN; i++) {
    const x = margin + Math.random() * (domain - 2 * margin);
    const y = margin + Math.random() * (domain - 2 * margin);
    points.push({ x, y, elev: elevFn(x, y) });
  }

  type Chromosome = number[];
  const popSize = Math.min(30, Math.max(10, Math.floor(safeN / 5)));
  const generations = Math.min(50, Math.max(15, Math.floor(safeN / 3)));

  function createChromosome(): Chromosome {
    const genes: number[] = [];
    for (let i = 0; i < safeN; i++) {
      const candidates: number[] = [];
      for (let j = 0; j < safeN; j++) {
        if (j !== i) candidates.push(j);
      }
      candidates.sort((a, b) => {
        const da = Math.hypot(points[i].x - points[a].x, points[i].y - points[a].y);
        const db = Math.hypot(points[i].x - points[b].x, points[i].y - points[b].y);
        return da - db;
      });
      const topK = candidates.slice(0, Math.min(5, candidates.length));
      genes[i] = topK[Math.floor(Math.random() * topK.length)];
    }
    return genes;
  }

  function fitness(chr: Chromosome): number {
    let totalLength = 0;
    let adverseSlopes = 0;
    for (let i = 0; i < safeN; i++) {
      const parent = chr[i];
      totalLength += Math.hypot(points[i].x - points[parent].x, points[i].y - points[parent].y);
      if (points[i].elev < points[parent].elev) adverseSlopes++;
    }
    return -(totalLength + adverseSlopes * domain * 0.5);
  }

  let population: Chromosome[] = [];
  for (let p = 0; p < popSize; p++) population.push(createChromosome());

  for (let gen = 0; gen < generations; gen++) {
    population.sort((a, b) => fitness(b) - fitness(a));
    const survivors = population.slice(0, Math.ceil(popSize * 0.4));
    const newPop = [...survivors];
    while (newPop.length < popSize) {
      const p1 = survivors[Math.floor(Math.random() * survivors.length)];
      const p2 = survivors[Math.floor(Math.random() * survivors.length)];
      const child = p1.map((g, i) => Math.random() < 0.5 ? g : p2[i]);
      for (let i = 0; i < child.length; i++) {
        if (Math.random() < 0.1) {
          const neighbors: number[] = [];
          for (let j = 0; j < safeN; j++) if (j !== i) neighbors.push(j);
          neighbors.sort((a, b) => Math.hypot(points[i].x - points[a].x, points[i].y - points[a].y) - Math.hypot(points[i].x - points[b].x, points[i].y - points[b].y));
          child[i] = neighbors[Math.floor(Math.random() * Math.min(5, neighbors.length))];
        }
      }
      newPop.push(child);
    }
    population = newPop;
  }

  population.sort((a, b) => fitness(b) - fitness(a));
  const best = population[0];

  const junctions: GraphNode[] = points.map((p, i) => ({
    x: p.x, y: p.y, name: `J${i + 1}`, type: 'junction', idx: i, elev: p.elev
  }));

  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  for (let i = 0; i < safeN; i++) {
    const parent = best[i];
    if (parent === i) continue;
    const key = `${Math.min(i, parent)}-${Math.max(i, parent)}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    const from = junctions[i].elev >= junctions[parent].elev ? junctions[i] : junctions[parent];
    const to = from === junctions[i] ? junctions[parent] : junctions[i];
    edges.push({ from, to, length: Math.hypot(from.x - to.x, from.y - to.y) });
  }

  for (const o of outfallNodes) {
    let closest = junctions[0];
    let dist = Infinity;
    for (const j of junctions) { const d = Math.hypot(j.x - o.x, j.y - o.y); if (d < dist) { dist = d; closest = j; } }
    edges.push({ from: closest, to: o, length: dist });
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

export function generateGridManhattan(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const cols = Math.max(2, Math.ceil(Math.sqrt(safeN * 1.2)));
  const rows = Math.max(2, Math.ceil(safeN / cols));
  const cellW = (domain * 0.85) / cols;
  const cellH = (domain * 0.85) / rows;
  const offsetX = domain * 0.075;
  const offsetY = domain * 0.075;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const junctions: GraphNode[] = [];
  const gridMap: (GraphNode | null)[][] = [];
  let jIdx = 0;

  for (let r = 0; r < rows; r++) {
    gridMap[r] = [];
    for (let c = 0; c < cols; c++) {
      if (junctions.length >= safeN) { gridMap[r][c] = null; continue; }
      const x = offsetX + c * cellW + cellW / 2;
      const y = offsetY + r * cellH + cellH / 2;
      const node: GraphNode = { x, y, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(x, y) };
      jIdx++;
      junctions.push(node);
      gridMap[r][c] = node;
    }
  }

  const edges: GraphEdge[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const node = gridMap[r]?.[c];
      if (!node) continue;
      const neighbors: GraphNode[] = [];
      if (c + 1 < cols && gridMap[r][c + 1]) neighbors.push(gridMap[r][c + 1]!);
      if (r + 1 < rows && gridMap[r + 1]?.[c]) neighbors.push(gridMap[r + 1][c]!);
      for (const nb of neighbors) {
        const from = node.elev >= nb.elev ? node : nb;
        const to = from === node ? nb : node;
        edges.push({ from, to, length: Math.hypot(from.x - to.x, from.y - to.y) });
      }
    }
  }

  const bottomRow = gridMap[rows - 1]?.filter(Boolean) as GraphNode[];
  const rightCol = gridMap.map(r => r[cols - 1]).filter(Boolean) as GraphNode[];
  const edgeNodes = [...new Set([...bottomRow, ...rightCol])];
  if (edgeNodes.length === 0) edgeNodes.push(junctions[junctions.length - 1]);

  for (const o of outfallNodes) {
    let closest = edgeNodes[0];
    let dist = Infinity;
    for (const e of edgeNodes) { const d = Math.hypot(e.x - o.x, e.y - o.y); if (d < dist) { dist = d; closest = e; } }
    edges.push({ from: closest, to: o, length: dist });
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

export function generateSteinerTree(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const margin = domain * 0.05;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const nTerminals = Math.max(3, Math.floor(safeN * 0.3));
  const nSteiner = safeN - nTerminals;

  const terminals: { x: number; y: number }[] = [];
  for (let i = 0; i < nTerminals; i++) {
    terminals.push({ x: margin + Math.random() * (domain - 2 * margin), y: margin + Math.random() * (domain - 2 * margin) });
  }

  const steinerPts: { x: number; y: number }[] = [];
  for (let i = 0; i < nSteiner; i++) {
    if (terminals.length >= 3 && Math.random() < 0.6) {
      const a = terminals[Math.floor(Math.random() * terminals.length)];
      const b = terminals[Math.floor(Math.random() * terminals.length)];
      steinerPts.push({ x: (a.x + b.x) / 2 + (Math.random() - 0.5) * domain * 0.05, y: (a.y + b.y) / 2 + (Math.random() - 0.5) * domain * 0.05 });
    } else {
      steinerPts.push({ x: margin + Math.random() * (domain - 2 * margin), y: margin + Math.random() * (domain - 2 * margin) });
    }
  }

  const allPts = [...terminals, ...steinerPts];
  const junctions: GraphNode[] = allPts.map((p, i) => ({
    x: clampToDomain(p.x, domain), y: clampToDomain(p.y, domain), name: `J${i + 1}`, type: 'junction', idx: i, elev: elevFn(clampToDomain(p.x, domain), clampToDomain(p.y, domain))
  }));

  const parent = new Array(junctions.length).fill(-1);
  function find(x: number): number { return parent[x] < 0 ? x : (parent[x] = find(parent[x])); }
  function unite(a: number, b: number) { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }

  const candidateEdges: { a: number; b: number; dist: number }[] = [];
  for (let i = 0; i < junctions.length; i++) {
    const dists: { idx: number; d: number }[] = [];
    for (let j = 0; j < junctions.length; j++) {
      if (i === j) continue;
      dists.push({ idx: j, d: Math.hypot(junctions[i].x - junctions[j].x, junctions[i].y - junctions[j].y) });
    }
    dists.sort((a, b) => a.d - b.d);
    for (const dd of dists.slice(0, Math.min(8, dists.length))) {
      const key = Math.min(i, dd.idx) * 100000 + Math.max(i, dd.idx);
      if (!candidateEdges.some(e => Math.min(e.a, e.b) * 100000 + Math.max(e.a, e.b) === key)) {
        candidateEdges.push({ a: i, b: dd.idx, dist: dd.d });
      }
    }
  }
  candidateEdges.sort((a, b) => a.dist - b.dist);

  const edges: GraphEdge[] = [];
  for (const { a, b } of candidateEdges) {
    if (find(a) !== find(b)) {
      unite(a, b);
      const from = junctions[a].elev >= junctions[b].elev ? junctions[a] : junctions[b];
      const to = from === junctions[a] ? junctions[b] : junctions[a];
      edges.push({ from, to, length: Math.hypot(from.x - to.x, from.y - to.y) });
    }
  }

  for (const o of outfallNodes) {
    let closest = junctions[0];
    let dist = Infinity;
    for (const j of junctions) { const d = Math.hypot(j.x - o.x, j.y - o.y); if (d < dist) { dist = d; closest = j; } }
    edges.push({ from: closest, to: o, length: dist });
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

export function generateLoopAndBranch(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(6, N);
  const margin = domain * 0.1;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const nLoopNodes = Math.max(4, Math.floor(safeN * 0.35));
  const nBranchNodes = safeN - nLoopNodes;

  const junctions: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let jIdx = 0;

  const cx = domain / 2;
  const cy = domain / 2;
  const loopRadius = domain * 0.3;
  const loopNodes: GraphNode[] = [];

  for (let i = 0; i < nLoopNodes; i++) {
    const angle = (2 * Math.PI * i) / nLoopNodes;
    const r = loopRadius * (0.85 + Math.random() * 0.3);
    const x = clampToDomain(cx + Math.cos(angle) * r, domain);
    const y = clampToDomain(cy + Math.sin(angle) * r, domain);
    const node: GraphNode = { x, y, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(x, y) };
    jIdx++;
    junctions.push(node);
    loopNodes.push(node);
  }

  for (let i = 0; i < loopNodes.length; i++) {
    const a = loopNodes[i];
    const b = loopNodes[(i + 1) % loopNodes.length];
    const from = a.elev >= b.elev ? a : b;
    const to = from === a ? b : a;
    edges.push({ from, to, length: Math.hypot(from.x - to.x, from.y - to.y) });
  }

  for (let i = 0; i < nBranchNodes && junctions.length < safeN; i++) {
    const parentLoop = loopNodes[Math.floor(Math.random() * loopNodes.length)];
    const outAngle = Math.atan2(parentLoop.y - cy, parentLoop.x - cx);
    const dist = domain * 0.05 + Math.random() * domain * 0.15;
    const x = clampToDomain(parentLoop.x + Math.cos(outAngle + (Math.random() - 0.5) * 0.8) * dist, domain);
    const y = clampToDomain(parentLoop.y + Math.sin(outAngle + (Math.random() - 0.5) * 0.8) * dist, domain);
    const node: GraphNode = { x, y, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(x, y) + 0.3 };
    jIdx++;
    junctions.push(node);
    edges.push({ from: node, to: parentLoop, length: Math.hypot(node.x - parentLoop.x, node.y - parentLoop.y) });
  }

  for (const o of outfallNodes) {
    let closest = loopNodes[0];
    let dist = Infinity;
    for (const ln of loopNodes) { const d = Math.hypot(ln.x - o.x, ln.y - o.y); if (d < dist) { dist = d; closest = ln; } }
    edges.push({ from: closest, to: o, length: dist });
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

export function generateZoneHierarchical(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(6, N);
  const margin = domain * 0.05;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const nZones = Math.max(2, Math.min(8, Math.floor(Math.sqrt(safeN / 4))));
  const zoneCenters: { x: number; y: number }[] = [];
  for (let z = 0; z < nZones; z++) {
    zoneCenters.push({ x: margin + Math.random() * (domain - 2 * margin), y: margin + Math.random() * (domain - 2 * margin) });
  }

  const junctions: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let jIdx = 0;

  const nTrunkNodes = Math.max(nZones, Math.floor(safeN * 0.1));
  const nLocalPerZone = Math.floor((safeN - nTrunkNodes) / nZones);

  const trunkNodes: GraphNode[] = [];
  const primary = outfallNodes[0];
  for (let i = 0; i < nTrunkNodes && junctions.length < safeN; i++) {
    const zc = zoneCenters[i % nZones];
    const t = (i + 1) / (nTrunkNodes + 1);
    const x = clampToDomain(primary.x + (zc.x - primary.x) * t * 1.2 + (Math.random() - 0.5) * domain * 0.05, domain);
    const y = clampToDomain(primary.y + (zc.y - primary.y) * t * 1.2 + (Math.random() - 0.5) * domain * 0.05, domain);
    const node: GraphNode = { x, y, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(x, y) + t * 2 };
    jIdx++;
    junctions.push(node);
    trunkNodes.push(node);
  }

  for (let i = 0; i < trunkNodes.length; i++) {
    const prev = i === 0 ? primary : trunkNodes[i - 1];
    edges.push({ from: trunkNodes[i], to: prev, length: Math.hypot(trunkNodes[i].x - prev.x, trunkNodes[i].y - prev.y) });
  }

  for (let z = 0; z < nZones && junctions.length < safeN; z++) {
    const zc = zoneCenters[z];
    const trunk = trunkNodes[z % trunkNodes.length];
    const zoneRadius = domain * 0.15;

    const localNodes: GraphNode[] = [];
    for (let i = 0; i < nLocalPerZone && junctions.length < safeN; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * zoneRadius;
      const x = clampToDomain(zc.x + Math.cos(angle) * r, domain);
      const y = clampToDomain(zc.y + Math.sin(angle) * r, domain);
      const node: GraphNode = { x, y, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(x, y) + 1 + Math.random() * 0.5 };
      jIdx++;
      junctions.push(node);
      localNodes.push(node);
    }

    for (const ln of localNodes) {
      let closest = trunk;
      let dist = Math.hypot(ln.x - trunk.x, ln.y - trunk.y);
      for (const other of localNodes) {
        if (other === ln) continue;
        const d = Math.hypot(ln.x - other.x, ln.y - other.y);
        if (d < dist && other.elev < ln.elev) { dist = d; closest = other; }
      }
      edges.push({ from: ln, to: closest, length: Math.hypot(ln.x - closest.x, ln.y - closest.y) });
    }
  }

  for (let oi = 1; oi < outfallNodes.length; oi++) {
    let closest = trunkNodes[0];
    let dist = Infinity;
    for (const t of trunkNodes) { const d = Math.hypot(t.x - outfallNodes[oi].x, t.y - outfallNodes[oi].y); if (d < dist) { dist = d; closest = t; } }
    edges.push({ from: closest, to: outfallNodes[oi], length: dist });
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

export function generateDLA(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(3, N);
  const margin = domain * 0.05;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const junctions: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let jIdx = 0;

  const cx = domain / 2;
  const cy = domain / 2;
  const seedNode: GraphNode = { x: cx, y: cy, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(cx, cy) };
  jIdx++;
  junctions.push(seedNode);

  const cluster: GraphNode[] = [seedNode];
  const stickDist = domain / Math.sqrt(safeN) * 0.8;
  const maxWalk = 500;
  let globalIter = 0;
  const maxGlobalIter = safeN * 20;

  while (junctions.length < safeN && globalIter < maxGlobalIter) {
    globalIter++;
    let wx = margin + Math.random() * (domain - 2 * margin);
    let wy = margin + Math.random() * (domain - 2 * margin);
    let stuck = false;
    let stuckTo: GraphNode | null = null;

    for (let step = 0; step < maxWalk; step++) {
      wx += (Math.random() - 0.5) * stickDist * 0.5;
      wy += (Math.random() - 0.5) * stickDist * 0.5;
      wx = Math.max(margin, Math.min(domain - margin, wx));
      wy = Math.max(margin, Math.min(domain - margin, wy));

      for (const cn of cluster) {
        if (Math.hypot(wx - cn.x, wy - cn.y) < stickDist) { stuck = true; stuckTo = cn; break; }
      }
      if (stuck) break;
    }

    if (stuck && stuckTo) {
      const node: GraphNode = { x: wx, y: wy, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(wx, wy) + Math.hypot(wx - cx, wy - cy) * 0.002 };
      jIdx++;
      junctions.push(node);
      cluster.push(node);
      edges.push({ from: node, to: stuckTo, length: Math.hypot(node.x - stuckTo.x, node.y - stuckTo.y) });
    }
  }

  for (const o of outfallNodes) {
    let closest = junctions[0];
    let dist = Infinity;
    for (const j of junctions) { const d = Math.hypot(j.x - o.x, j.y - o.y); if (d < dist) { dist = d; closest = j; } }
    edges.push({ from: closest, to: o, length: dist });
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}

export function generateRadialSpokeRing(
  N: number, nOutfalls: number, domain: number,
  outfallPositions: { x: number; y: number }[],
  elevFn: ElevFn
): GraphResult {
  const safeN = Math.max(4, N);
  const cx = domain / 2;
  const cy = domain / 2;

  const outfallNodes: GraphNode[] = outfallPositions.slice(0, nOutfalls).map((o, i) => ({
    x: o.x, y: o.y, name: `OUT${i + 1}`, type: 'outfall', idx: 0, elev: elevFn(o.x, o.y)
  }));

  const nSpokes = Math.max(3, Math.min(12, Math.floor(Math.sqrt(safeN))));
  const nRings = Math.max(1, Math.floor(safeN / nSpokes));
  const maxRadius = domain * 0.4;

  const junctions: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let jIdx = 0;

  const ringNodes: GraphNode[][] = [];

  for (let ring = 0; ring < nRings && junctions.length < safeN; ring++) {
    const r = maxRadius * (ring + 1) / nRings;
    ringNodes[ring] = [];
    for (let s = 0; s < nSpokes && junctions.length < safeN; s++) {
      const angle = (2 * Math.PI * s) / nSpokes + (Math.random() - 0.5) * 0.1;
      const x = clampToDomain(cx + Math.cos(angle) * r, domain);
      const y = clampToDomain(cy + Math.sin(angle) * r, domain);
      const node: GraphNode = { x, y, name: `J${jIdx + 1}`, type: 'junction', idx: jIdx, elev: elevFn(x, y) + r * 0.003 };
      jIdx++;
      junctions.push(node);
      ringNodes[ring].push(node);
    }

    for (let s = 0; s < ringNodes[ring].length; s++) {
      const a = ringNodes[ring][s];
      const b = ringNodes[ring][(s + 1) % ringNodes[ring].length];
      const from = a.elev >= b.elev ? a : b;
      const to = from === a ? b : a;
      edges.push({ from, to, length: Math.hypot(from.x - to.x, from.y - to.y) });
    }

    if (ring > 0) {
      for (let s = 0; s < ringNodes[ring].length; s++) {
        const outerNode = ringNodes[ring][s];
        const innerIdx = s < ringNodes[ring - 1].length ? s : s % ringNodes[ring - 1].length;
        const innerNode = ringNodes[ring - 1][innerIdx];
        edges.push({ from: outerNode, to: innerNode, length: Math.hypot(outerNode.x - innerNode.x, outerNode.y - innerNode.y) });
      }
    }
  }

  if (ringNodes.length > 0 && ringNodes[0].length > 0) {
    for (const o of outfallNodes) {
      let closest = ringNodes[0][0];
      let dist = Infinity;
      for (const n of ringNodes[0]) { const d = Math.hypot(n.x - o.x, n.y - o.y); if (d < dist) { dist = d; closest = n; } }
      edges.push({ from: closest, to: o, length: dist });
    }
  }

  const allNodes = [...junctions, ...outfallNodes];
  allNodes.forEach((n, i) => n.idx = i);
  return { allNodes, edges, accumUpstream: computeAccumUpstream(allNodes, edges) };
}
