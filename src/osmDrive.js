const BASE = import.meta.env?.BASE_URL || '/';

function km(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const toR = Math.PI / 180;
  const dLat = (bLat - aLat) * toR;
  const dLon = (bLon - aLon) * toR;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * toR) * Math.cos(bLat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearing(aLat, aLon, bLat, bLon) {
  const toR = Math.PI / 180;
  const y = Math.sin((bLon - aLon) * toR) * Math.cos(bLat * toR);
  const x = Math.cos(aLat * toR) * Math.sin(bLat * toR)
    - Math.sin(aLat * toR) * Math.cos(bLat * toR) * Math.cos((bLon - aLon) * toR);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function adjacency(pack) {
  if (pack.adj) return pack.adj;
  const adj = pack.nodes.map(() => []);
  for (const [a, b, ow, ni] of pack.edges) {
    const [la, lo] = pack.nodes[a];
    const [lb, lnb] = pack.nodes[b];
    const w = km(la, lo, lb, lnb);
    const name = pack.names[ni] || '';
    if (ow !== 2) adj[a].push({ to: b, w, name });
    if (ow !== 1) adj[b].push({ to: a, w, name });
  }
  pack.adj = adj;
  return adj;
}

function reverseAdj(pack) {
  if (pack.rev) return pack.rev;
  const rev = pack.nodes.map(() => []);
  adjacency(pack).forEach((edges, from) => {
    edges.forEach((edge) => rev[edge.to].push(from));
  });
  pack.rev = rev;
  return rev;
}

function basinSize(pack, goal, limit) {
  const rev = reverseAdj(pack);
  if (!pack.stamp) {
    pack.stamp = new Uint32Array(pack.nodes.length);
    pack.stampId = 1;
  }
  const stamp = ++pack.stampId;
  const seen = pack.stamp;
  const stack = [goal];
  seen[goal] = stamp;
  let count = 0;
  while (stack.length) {
    const node = stack.pop();
    count += 1;
    if (count >= limit) return count;
    rev[node].forEach((next) => {
      if (seen[next] !== stamp) {
        seen[next] = stamp;
        stack.push(next);
      }
    });
  }
  return count;
}

function gateNode(pack, lat, lon) {
  const ranked = pack.nodes
    .map(([la, lo], index) => ({ index, km: km(lat, lon, la, lo) }))
    .sort((a, b) => a.km - b.km);
  const pool = ranked.filter((node) => node.km < 0.7).slice(0, 40);
  const candidates = pool.length ? pool : ranked.slice(0, 15);
  let best = candidates[0];
  let bestBasin = 0;
  for (const candidate of candidates) {
    const size = basinSize(pack, candidate.index, 400);
    if (size > bestBasin) {
      bestBasin = size;
      best = candidate;
    }
    if (size >= 400) return candidate;
  }
  return best;
}

function startNode(pack, goalIndex, lat, lon) {
  const rev = reverseAdj(pack);
  const seen = new Uint8Array(pack.nodes.length);
  const stack = [goalIndex];
  seen[goalIndex] = 1;
  while (stack.length) {
    const node = stack.pop();
    rev[node].forEach((next) => {
      if (!seen[next]) {
        seen[next] = 1;
        stack.push(next);
      }
    });
  }
  let index = goalIndex;
  let bestKm = Infinity;
  pack.nodes.forEach(([la, lo], i) => {
    if (!seen[i]) return;
    const d = km(lat, lon, la, lo);
    if (d < bestKm) {
      bestKm = d;
      index = i;
    }
  });
  return { index, km: bestKm };
}

function shortest(pack, start, goal) {
  const adj = adjacency(pack);
  const dist = new Float64Array(pack.nodes.length);
  dist.fill(Infinity);
  dist[start] = 0;
  const prev = new Int32Array(pack.nodes.length);
  prev.fill(-1);
  const heap = [start];
  const heapDist = [0];
  const swap = (i, j) => {
    const node = heap[i];
    heap[i] = heap[j];
    heap[j] = node;
    const weight = heapDist[i];
    heapDist[i] = heapDist[j];
    heapDist[j] = weight;
  };
  const up = (i) => {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heapDist[parent] <= heapDist[i]) break;
      swap(parent, i);
      i = parent;
    }
  };
  const down = (i) => {
    for (;;) {
      let smallest = i;
      const left = i * 2 + 1;
      const right = left + 1;
      if (left < heap.length && heapDist[left] < heapDist[smallest]) smallest = left;
      if (right < heap.length && heapDist[right] < heapDist[smallest]) smallest = right;
      if (smallest === i) break;
      swap(smallest, i);
      i = smallest;
    }
  };
  while (heap.length) {
    const u = heap[0];
    const du = heapDist[0];
    const last = heap.pop();
    const lastDist = heapDist.pop();
    if (heap.length) {
      heap[0] = last;
      heapDist[0] = lastDist;
      down(0);
    }
    if (du !== dist[u]) continue;
    if (u === goal) break;
    for (const edge of adj[u]) {
      const next = du + edge.w;
      if (next < dist[edge.to]) {
        dist[edge.to] = next;
        prev[edge.to] = u;
        heap.push(edge.to);
        heapDist.push(next);
        up(heap.length - 1);
      }
    }
  }
  if (!Number.isFinite(dist[goal])) return null;
  const path = [];
  for (let i = goal; i >= 0; i = prev[i]) {
    path.push(i);
    if (i === start) break;
  }
  path.reverse();
  if (path[0] !== start) return null;
  return path;
}

function stepsFor(pack, path) {
  const adj = adjacency(pack);
  const points = path.map((i) => {
    const [lat, lon] = pack.nodes[i];
    return { lat, lon };
  });
  let roadKm = 0;
  const hops = [];
  for (let i = 1; i < path.length; i++) {
    const edge = adj[path[i - 1]].find((e) => e.to === path[i]);
    const [la, lo] = pack.nodes[path[i - 1]];
    const [lb, lnb] = pack.nodes[path[i]];
    const d = edge ? edge.w : km(la, lo, lb, lnb);
    roadKm += d;
    hops.push({ name: edge?.name || '', bearing: bearing(la, lo, lb, lnb), km: d });
  }
  const groups = [];
  for (const hop of hops) {
    const last = groups.at(-1);
    const delta = last ? ((hop.bearing - last.bearing + 540) % 360) - 180 : 0;
    const corner = last && Math.abs(delta) > 45 && last.km > 0.04;
    if (!last || hop.name !== last.name || corner) {
      groups.push({ name: hop.name, km: hop.km, bearing: hop.bearing, delta: last ? delta : 0 });
    } else {
      last.km += hop.km;
      last.bearing = hop.bearing;
    }
  }
  const cleaned = [];
  for (const group of groups) {
    const prev = cleaned.at(-1);
    if (prev && group.km < 0.05) {
      prev.km += group.km;
      prev.bearing = group.bearing;
      continue;
    }
    cleaned.push({ ...group });
  }
  const shown = cleaned.slice(0, 12);
  const steps = shown.map((group, i) => {
    const turn = i === 0 ? 'Start' : group.delta > 45 ? 'Turn right' : group.delta < -45 ? 'Turn left' : 'Continue';
    const road = group.name ? ` on ${group.name}` : '';
    const dist = group.km < 1 ? `${Math.round(group.km * 1000)} m` : `${group.km.toFixed(1)} km`;
    return `${turn}${road} · ${dist}`;
  });
  if (cleaned.length > shown.length) steps.push('Continue on the saved roads to the gate');
  return { points, roadKm, steps };
}

const cache = new Map();

export async function loadRoadPack(id) {
  if (cache.has(id)) return cache.get(id);
  const res = await fetch(`${BASE}maps/${id}.json`);
  if (!res.ok) throw new Error('missing');
  const pack = await res.json();
  cache.set(id, pack);
  return pack;
}

export async function driveToShrine(site, from) {
  const pack = await loadRoadPack(site.id);
  if (!pack.nodes?.length) return { error: 'This shrine has no drivable roads in the offline pack.' };
  const goal = gateNode(pack, site.lat, site.lon);
  const start = from ? startNode(pack, goal.index, from.lat, from.lon) : null;
  if (!start) return { error: 'Allow location so the offline roads can start from where you are.' };
  if (start.index === goal.index) {
    const away = goal.km < 1 ? `${Math.round(goal.km * 1000)} m` : `${goal.km.toFixed(1)} km`;
    return {
      error: goal.km > 0.4
        ? `The nearest saved road is ${away} from the gate. The rest is on foot.`
        : `You are already on the nearest saved road, ${away} from the gate.`,
    };
  }
  const path = shortest(pack, start.index, goal.index);
  if (!path || path.length < 2) return { error: 'No drivable connection in this offline pack.' };
  const route = stepsFor(pack, path);
  return {
    ...route,
    outside: start.km > 0.8 && km(from.lat, from.lon, site.lat, site.lon) > (pack.radius || 7000) / 1000 * 0.85,
    straightKm: km(from.lat, from.lon, site.lat, site.lon),
    snapKm: start.km,
    goalKm: goal.km,
    radiusKm: Math.round((pack.radius || 7000) / 1000),
  };
}
