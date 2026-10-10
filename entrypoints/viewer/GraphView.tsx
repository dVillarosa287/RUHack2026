import '@xyflow/react/dist/style.css';
import './graph.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ForestHeader } from './ForestHeader';
import { NODE_TYPES, type GraphNode, type LargeTreeNodeType, type SeedNodeType } from './GraphNodes';
import { clearSpotNear, largeTreePages, largeTreeSpot, layoutNewSeeds, type Point } from './graphLayout';
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

  if (!data) return <p>Loading…</p>;
  if (!data.forest) return <p>This forest no longer exists.</p>;

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return (
    <>
      <ForestHeader
        forest={data.forest}
        summary={`${plural(data.seeds.length, 'seed')}, ${plural(data.roots.length, 'root')}`}
        actions={<a href={forestHref(forestId)} className="rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft">List view</a>}
      />
      {/* The provider lets the parts inside use React Flow's helpers, such as finding the middle of the view. */}
      <ReactFlowProvider>
        <ForestGraph forestId={forestId} seeds={data.seeds} roots={data.roots} folders={data.folders} />
      </ReactFlowProvider>
    </>
  );
}

/** Moves each large tree near the middle of its seeds. Called after every change, so trees follow dragged seeds. */
function placeLargeTrees(nodes: GraphNode[]): GraphNode[] {
  const where = new Map(nodes.map((n) => [n.id, n.position]));
  const allSeeds = nodes.filter((n) => n.type === 'seed').map((n) => n.position);
  return nodes.map((n) => {
    if (n.type !== 'largeTree') return n;
    const spots = n.data.seedIds.map((id) => where.get(id)).filter((p): p is Point => !!p);
    return { ...n, position: largeTreeSpot(spots, allSeeds) };
  });
}

function ForestGraph({ forestId, seeds, roots, folders }: { forestId: string; seeds: Seed[]; roots: Root[]; folders: Folder[] }) {
  const { screenToFlowPosition, setNodes: setFlowNodes } = useReactFlow();
  const box = useRef<HTMLDivElement>(null);
  // Spots the layout gave this visit, kept until storage has them, so a seed is only laid out once.
  const placed = useRef(new Map<string, Point>());
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [writingNote, setWritingNote] = useState(false);

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
        position: { x: 0, y: 0 },
        data: { title: seeds.find((s) => s.url === url)?.pageTitle || url, seedIds },
        measured: old.get('tree:' + url)?.measured,
        draggable: false,
        selectable: false,
        connectable: false,
        deletable: false,
        focusable: false,
        zIndex: -1,
      }));
      return placeLargeTrees([...treeNodes, ...seedNodes]);
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

  const onNodesChange = useCallback((changes: NodeChange<GraphNode>[]) => setNodes((nds) => placeLargeTrees(applyNodeChanges(changes, nds))), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  // Save a node's spot when the user lets go of it (not on every mouse move).
  const onNodeDragStop = useCallback((_event: unknown, _node: GraphNode, dragged: GraphNode[]) => {
    for (const n of dragged) {
      if (n.type === 'seed') void updateSeed(n.id, { graphX: Math.round(n.position.x), graphY: Math.round(n.position.y) }).catch(() => {});
    }
  }, []);

  // A root is drawn by dragging from one seed's dot to another seed. One root per pair, whichever way it was drawn.
  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return;
      const exists = roots.some((r) => (r.fromSeedId === c.source && r.toSeedId === c.target) || (r.fromSeedId === c.target && r.toSeedId === c.source));
      if (!exists) void addRoot({ forestId, fromSeedId: c.source, toSeedId: c.target, source: 'manual', reason: '' });
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

  const seedsById = useMemo(() => new Map(seeds.map((s) => [s.id, s])), [seeds]);
  const selected = selectedId ? seedsById.get(selectedId) : undefined;

  return (
    <div className="fo-graph flex gap-4" style={{ height: 'calc(100vh - 190px)', minHeight: 420 }}>
      <div ref={box} className="relative min-w-0 flex-1 overflow-hidden rounded-xl border-2 border-edge/30 bg-surface-alt">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          nodeOrigin={[0.5, 0.5]}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
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
              <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink shadow-md shadow-drop hover:bg-primary-strong" onClick={() => setWritingNote(true)}>
                + Text note
              </button>
            )}
          </Panel>
          {seeds.length === 0 ? (
            <Panel position="top-center" className="rounded-lg bg-surface px-3 py-2 text-sm text-ink-muted">Nothing planted yet. Plant seeds on a web page, or add a text note.</Panel>
          ) : (
            <Panel position="bottom-center" className="rounded-lg bg-surface/80 px-3 py-1 text-xs text-ink-muted">Drag from a sprite's dot to another sprite to grow a root. Click a root and press Delete to remove it.</Panel>
          )}
        </ReactFlow>
      </div>
      {selected && <NodeDetail seed={selected} roots={roots} seedsById={seedsById} folders={folders} onClose={closeDetail} />}
    </div>
  );
}
