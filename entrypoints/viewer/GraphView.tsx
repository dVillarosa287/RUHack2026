import '@xyflow/react/dist/style.css';
import './graph.css';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  Background,
  ConnectionLineType,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { addRoot, deleteRoot, getFolders, getForest, getRoots, getSeedsForForest, saveSeed, updateSeed, type Folder, type Root, type Seed, type SpriteType } from '@/lib/storage';
import { countOf, useWords } from '@/lib/theme';
import { ForestHeader } from './ForestHeader';
import { ForestExport } from './ForestExport';
import { NODE_TYPES, type GraphNode, type LargeTreeNodeType, type SeedNodeType } from './GraphNodes';
import { clearSpotNear, largeTreePages, largeTreeSpot, layoutAllSeeds, layoutNewSeeds, type Point } from './graphLayout';
import { NewNoteForm } from './NewNoteForm';
import { NodeDetail } from './NodeDetail';
import { forestHref } from './route';
import { useStored } from './useStored';

/** The forest as a graph of sprite nodes (React Flow). Opened by the "Graph view" button on the forest page. */
export function GraphView({ forestId }: { forestId: string }) {
  const data = useStored(
    async () => ({ forest: await getForest(forestId), seeds: await getSeedsForForest(forestId), roots: await getRoots(forestId), folders: await getFolders(forestId) }),
    [forestId],
  );
  const words = useWords(); // "seeds, roots" or "items, links", by theme

  if (!data) return <p>Loading…</p>;
  if (!data.forest) return <p>This {words.forest} no longer exists.</p>;

  return (
    <>
      <ForestHeader
        forest={data.forest}
        summary={`${countOf(data.seeds.length, words.seed, words.seeds)}, ${countOf(data.roots.length, words.root, words.roots)}`}
        actions={
          <>
            <a href={forestHref(forestId)} className="rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft">List view</a>
          </>
        }
      />
      {/* The provider lets the parts inside use React Flow's helpers, such as finding the middle of the view. */}
      <ReactFlowProvider>
        <ForestGraph forestId={forestId} seeds={data.seeds} roots={data.roots} folders={data.folders} />
      </ReactFlowProvider>
      <div className="mt-4 flex justify-center">
        <ForestExport forest={data.forest} seeds={data.seeds} />
      </div>
    </>
  );
}

/**
 * The nodes a right-button drag moves together. From a seed: the seed and the seeds rooted to it.
 * From a large tree: the tree and all of its seeds (its trunk lines), so the whole page's cluster moves at once.
 */
function connectedNodeIds(startId: string, edges: Edge[]): Set<string> {
  const connected = new Set([startId]);
  const fromTree = startId.startsWith('tree:');
  for (const edge of edges) {
    const follow = edge.id.startsWith('root:') || (fromTree && edge.id.startsWith('trunk:'));
    if (!follow) continue;
    const neighbor = edge.source === startId ? edge.target : edge.target === startId ? edge.source : null;
    if (neighbor) {
      connected.add(neighbor);
    }
  }
  return connected;
}

/** The hovered node and everything joined to it by any line (roots and large-tree lines), like Obsidian's hover focus. */
function hoverNeighborhood(hoveredId: string, edges: Edge[]): Set<string> {
  const lit = new Set([hoveredId]);
  for (const edge of edges) {
    if (edge.source === hoveredId) lit.add(edge.target);
    if (edge.target === hoveredId) lit.add(edge.source);
  }
  return lit;
}

function ForestGraph({ forestId, seeds, roots, folders }: { forestId: string; seeds: Seed[]; roots: Root[]; folders: Folder[] }) {
  const { screenToFlowPosition, setNodes: setFlowNodes, fitView } = useReactFlow();
  const box = useRef<HTMLDivElement>(null);
  // Spots the layout gave this visit, kept until storage has them, so a seed is only laid out once.
  const placed = useRef(new Map<string, Point>());
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [writingNote, setWritingNote] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const words = useWords(); // the hints below use the theme's words ("grow a root" or "draw a link")
  const rightDrag = useRef<{ pointerId: number; origin: Point; positions: Map<string, Point>; currentPositions: Map<string, Point> } | null>(null);

  // Where every seed goes: its saved spot, or for a seed that has none, a spot from the force layout.
  const spots = useMemo(() => {
    const known = new Map<string, Point>();
    for (const s of seeds) {
      const spot = s.graphX != null && s.graphY != null ? { x: s.graphX, y: s.graphY } : placed.current.get(s.id);
      if (spot) known.set(s.id, spot);
    }
    for (const [id, spot] of layoutNewSeeds(seeds, known)) {
      known.set(id, spot);
      placed.current.set(id, spot);
    }
    return known;
  }, [seeds]);

  // Save the new spots. From then on a node stays where it is, or where the user drags it.
  useEffect(() => {
    for (const s of seeds) {
      const spot = spots.get(s.id);
      if (spot && (s.graphX == null || s.graphY == null)) void updateSeed(s.id, { graphX: spot.x, graphY: spot.y }).catch(() => {});
    }
  }, [seeds, spots]);

  // Build the nodes from the seeds: one per seed, plus the large trees. Keeps what React Flow already measured.
  useEffect(() => {
    setNodes((prev) => {
      const old = new Map(prev.map((n) => [n.id, n]));
      const seedNodes: SeedNodeType[] = seeds.map((seed) => ({
        id: seed.id,
        type: 'seed',
        position: spots.get(seed.id) ?? { x: 0, y: 0 },
        data: { seed },
        selected: old.get(seed.id)?.selected,
        measured: old.get(seed.id)?.measured,
        deletable: false,
      }));
      const treeNodes: LargeTreeNodeType[] = [...largeTreePages(seeds)].map(([url, seedIds]) => ({
        id: 'tree:' + url,
        type: 'largeTree',
        position: old.get('tree:' + url)?.position ?? largeTreeSpot(seedIds.map((id) => spots.get(id)).filter((p): p is Point => !!p), seedNodes.map((n) => n.position)),
        data: { title: seeds.find((s) => s.url === url)?.pageTitle || url, seedIds },
        measured: old.get('tree:' + url)?.measured,
        draggable: true,
        selectable: false,
        connectable: false,
        deletable: false,
        focusable: false,
        zIndex: -1,
      }));
      return [...treeNodes, ...seedNodes];
    });
  }, [seeds, spots]);

  // The lines: roots the user drew, and the very subtle lines from each large tree to its seeds.
  useEffect(() => {
    const ids = new Set(seeds.map((s) => s.id));
    setEdges((prev) => {
      const wasSelected = new Set(prev.filter((e) => e.selected).map((e) => e.id));
      const rootEdges: Edge[] = roots
        .filter((r) => ids.has(r.fromSeedId) && ids.has(r.toSeedId))
        .map((r) => ({ id: 'root:' + r.id, source: r.fromSeedId, target: r.toSeedId, sourceHandle: 'out', targetHandle: 'in', type: 'straight', className: 'fo-root-edge', selected: wasSelected.has('root:' + r.id) }));
      const trunkEdges: Edge[] = [...largeTreePages(seeds)].flatMap(([url, seedIds]) =>
        seedIds.map((id) => ({ id: 'trunk:' + id, source: 'tree:' + url, target: id, sourceHandle: 'out', targetHandle: 'in', type: 'straight', className: 'fo-trunk-edge', selectable: false, deletable: false, focusable: false })),
      );
      return [...trunkEdges, ...rootEdges];
    });
  }, [seeds, roots]);

  const onNodesChange = useCallback((changes: NodeChange<GraphNode>[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  // Save a node's spot when the user lets go of it (not on every mouse move).
  const onNodeDragStop = useCallback((_event: unknown, _node: GraphNode, dragged: GraphNode[]) => {
    for (const n of dragged) {
      if (n.type === 'seed') void updateSeed(n.id, { graphX: Math.round(n.position.x), graphY: Math.round(n.position.y) }).catch(() => {});
    }
  }, []);

  const onRightDragStart = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 2) return;
    const nodeElement = (event.target as Element).closest('.react-flow__node');
    const nodeId = nodeElement?.getAttribute('data-id');
    if (!nodeId || !nodes.some((node) => node.id === nodeId)) return;
    const group = connectedNodeIds(nodeId, edges);
    const origin = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    rightDrag.current = {
      pointerId: event.pointerId,
      origin,
      positions: new Map(nodes.filter((node) => group.has(node.id)).map((node) => [node.id, { ...node.position }])),
      currentPositions: new Map(nodes.filter((node) => group.has(node.id)).map((node) => [node.id, { ...node.position }])),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, [edges, nodes, screenToFlowPosition]);

  const onRightDragMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = rightDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const delta = { x: current.x - drag.origin.x, y: current.y - drag.origin.y };
    setNodes((currentNodes) => currentNodes.map((node) => {
      const start = drag.positions.get(node.id);
      if (!start) return node;
      const position = { x: start.x + delta.x, y: start.y + delta.y };
      drag.currentPositions.set(node.id, position);
      return { ...node, position };
    }));
    event.preventDefault();
  }, [screenToFlowPosition]);

  const finishRightDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = rightDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    rightDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    for (const [nodeId, position] of drag.currentPositions) {
      if (!nodeId.startsWith('tree:')) void updateSeed(nodeId, { graphX: Math.round(position.x), graphY: Math.round(position.y) }).catch(() => {});
    }
  }, []);

  // A root is drawn by dragging from one seed's dot to another seed. One root per pair, whichever way it was drawn.
  // Drawing a root that already exists removes it instead, so the same gesture toggles a connection on and off.
  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return;
      const existing = roots.find((r) => (r.fromSeedId === c.source && r.toSeedId === c.target) || (r.fromSeedId === c.target && r.toSeedId === c.source));
      if (existing) void deleteRoot(existing.id);
      else void addRoot({ forestId, fromSeedId: c.source, toSeedId: c.target, source: 'manual', reason: '' });
    },
    [roots, forestId],
  );

  // Select a root and press Delete or Backspace to remove it.
  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    for (const e of deleted) if (e.id.startsWith('root:')) void deleteRoot(e.id.slice('root:'.length));
  }, []);

  const onSelectionChange = useCallback(({ nodes: picked }: OnSelectionChangeParams) => {
    setSelectedId(picked.length === 1 && picked[0]?.type === 'seed' ? picked[0].id : null);
  }, []);

  const closeDetail = () => setFlowNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));

  // "Spread out": lay out every seed again from scratch (not only the ones without a spot), save the new spots,
  // move the nodes now, and zoom so everything is in view. Large trees are not saved, so they are placed again here.
  function spreadOut() {
    const fresh = layoutAllSeeds(seeds);
    for (const [id, spot] of fresh) void updateSeed(id, { graphX: spot.x, graphY: spot.y }).catch(() => {});
    const trees = largeTreePages(seeds);
    setNodes((current) =>
      current.map((n) => {
        if (n.type === 'seed') return { ...n, position: fresh.get(n.id) ?? n.position };
        const mine = (trees.get(n.id.slice('tree:'.length)) ?? []).map((id) => fresh.get(id)).filter((p): p is Point => !!p);
        return { ...n, position: largeTreeSpot(mine, [...fresh.values()]) };
      }),
    );
    setTimeout(() => void fitView({ padding: 0.2, maxZoom: 1.2, duration: 400 }), 50);
  }

  // A text note is planted in the middle of what the user is looking at, in the nearest free spot.
  async function plantNote(note: { spriteType: SpriteType; color: string; text: string }) {
    const rect = box.current!.getBoundingClientRect();
    const middle = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    const spot = clearSpotNear(middle, nodes.map((n) => n.position), 110);
    // graphX and graphY are Seed fields that saveSeed keeps, so the note is saved with its spot in one write.
    const input = { forestId, kind: 'note' as const, url: '', pageTitle: '', ...note, graphX: Math.round(spot.x), graphY: Math.round(spot.y) };
    await saveSeed(input);
    setWritingNote(false);
  }

  // Hover focus: the hovered node and its neighbors stay bright, their lines light up, everything else fades
  // (graph.css). Only classes are added here; the real nodes and edges in state are left untouched.
  const lit = useMemo(() => (hoveredId ? hoverNeighborhood(hoveredId, edges) : null), [hoveredId, edges]);
  const shownNodes = useMemo(
    () => (lit ? nodes.map((n) => ({ ...n, className: n.id === hoveredId ? 'fo-hovered' : lit.has(n.id) ? 'fo-lit' : 'fo-dim' })) : nodes),
    [nodes, lit, hoveredId],
  );
  const shownEdges = useMemo(
    () => (lit ? edges.map((e) => ({ ...e, className: `${e.className ?? ''} ${e.source === hoveredId || e.target === hoveredId ? 'fo-lit' : 'fo-dim'}` })) : edges),
    [edges, lit, hoveredId],
  );

  const seedsById = useMemo(() => new Map(seeds.map((s) => [s.id, s])), [seeds]);
  const selected = selectedId ? seedsById.get(selectedId) : undefined;

  return (
    <div className="fo-graph flex gap-4" style={{ height: 'calc(100vh - 190px)', minHeight: 420 }}>
        <div
          ref={box}
          className="relative min-w-0 flex-1 overflow-hidden rounded-xl border-2 border-edge/30 bg-surface-alt"
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={onRightDragStart}
          onPointerMove={onRightDragMove}
          onPointerUp={finishRightDrag}
          onPointerCancel={finishRightDrag}
        >
        <ReactFlow
          nodes={shownNodes}
          edges={shownEdges}
          nodeTypes={NODE_TYPES}
          nodeOrigin={[0.5, 0.5]}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeMouseEnter={(_event, node) => setHoveredId(node.id)}
          onNodeMouseLeave={() => setHoveredId(null)}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onSelectionChange={onSelectionChange}
          isValidConnection={(c) => c.source !== c.target}
          connectionLineType={ConnectionLineType.Straight}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
          minZoom={0.2}
        >
          <Background color="var(--fo-edge)" gap={28} size={1.5} />
          <Controls showInteractive={false} />
          <Panel position="top-left">
            {writingNote ? (
              <NewNoteForm onPlant={(note) => void plantNote(note)} onCancel={() => setWritingNote(false)} />
            ) : (
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink shadow-md shadow-drop hover:bg-primary-strong" onClick={() => setWritingNote(true)}>
                  + Text note
                </button>
                <button
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink shadow-md shadow-drop hover:bg-primary-strong"
                  title="Arrange every node again with more room between them. This moves nodes you placed yourself."
                  onClick={spreadOut}
                >
                  Spread out
                </button>
              </div>
            )}
          </Panel>
          {seeds.length === 0 ? (
            <Panel position="top-center" className="rounded-lg bg-surface px-3 py-2 text-sm text-ink-muted">{words.emptyGraph}</Panel>
          ) : (
            <Panel position="bottom-center" className="rounded-lg bg-surface px-3 py-1 text-xs text-ink-muted">Drag from a sprite's dot to another sprite to {words.growRoot}. Drag it again, or click it and press Delete, to remove it.</Panel>
          )}
        </ReactFlow>
      </div>
      {selected && <NodeDetail seed={selected} roots={roots} seedsById={seedsById} folders={folders} onClose={closeDetail} />}
    </div>
  );
}
