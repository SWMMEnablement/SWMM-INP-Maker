interface GraphNode { x: number; y: number; name: string; type: string; idx: number; elev: number; }
interface GraphEdge { from: GraphNode; to: GraphNode; length: number; }
interface GraphResult { allNodes: GraphNode[]; edges: GraphEdge[]; accumUpstream: Record<string, number>; }

type ElevFn = (x: number, y: number) => number;
type LSystemVariant = 'dendritic' | 'grid' | 'radial';

function computeAccumUpstream(allNodes: GraphNode[], edges: GraphEdge[]): Record<string, number> {
  const accumUpstream: Record<string, number> = {};
  function countUp(name: string): number {
    if (accumUpstream[name] !== undefined) return accumUpstream[name];
    let count = 0;
    for (const e of edges) {
      if (e.to.name === name) count += 1 + countUp(e.from.name);
    }
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
