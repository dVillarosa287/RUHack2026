import '@xyflow/react/dist/style.css';
import './graph.css';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { createLineBoilVariable } from '@/lib/engine/lineBoil';
import { addRoot, deleteRoot, getFolders, getForest, getRoots, getSeedsForForest, saveSeed, updateSeed, type Folder, type Root, type Seed, type SpriteType } from '@/lib/storage';
import { cap, countOf, useWords } from '@/lib/theme';
import { ForestHeader } from './ForestHeader';
import { ForestExport } from './ForestExport';
import { GrowFromLink } from './GrowFromLink';
import { NODE_TYPES, type GraphNode, type LargeTreeNodeType, type SeedNodeType } from './GraphNodes';
import { circleAround, clearSpotNear, largeTreePages, largeTreeSpot, layoutNewSeeds, type Point } from './graphLayout';
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
            <GrowFromLink forestId={forestId} seeds={data.seeds} showGraphLink={false} />
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
  const { screenToFlowPosition, setNodes: setFlowNodes } = useReactFlow();
  const box = useRef<HTMLDivElement>(null);
  // Spots the layout gave this visit, kept until storage has them, so a seed is only laid out once.
  const placed = useRef(new Map<string, Point>());
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [writingNote, setWritingNote] = useState(false);

  // Line boil on every sprite in the graph, the same wobble as the sprites on web pages (lib/engine/lineBoil.ts).
  // It animates one CSS variable on the graph's box, so nodes added or redrawn later boil too (graph.css, .fo-boil).
  useEffect(() => (box.current ? createLineBoilVariable(box.current) : undefined), []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const words = useWords(); // the hints below use the theme's words ("grow a root" or "draw a link")
  // Linking: Shift+click a seed to start a link, Shift+click another to toggle a root between them.
  const [linkStartId, setLinkStartId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null); // light line to the mouse
  const shiftHeld = useRef(false); // so a Shift+click does not also open the detail panel
  const rightDrag = useRef<{ pointerId: number; nodeId: string; client: Point; origin: Point; positions: Map<string, Point>; currentPositions: Map<string, Point> } | null>(null);
  // The right-click menu on a large tree: its page and where it opens, in pixels inside the graph box.
  const [treeMenu, setTreeMenu] = useState<{ url: string; x: number; y: number } | null>(null);
  const treeMenuRef = useRef<HTMLDivElement>(null);
  const pages = useMemo(() => largeTreePages(seeds), [seeds]);

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
      nodeId,
      client: { x: event.clientX, y: event.clientY },
      origin,
      positions: new Map(nodes.filter((node) => group.has(node.id)).map((node) => [node.id, { ...node.position }])),
      currentPositions: new Map(nodes.filter((node) => group.has(node.id)).map((node) => [node.id, { ...node.position }])),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, [edges, nodes, screenToFlowPosition]);

  // Moves the dragged group so it follows the mouse. The new spots are worked out right away (not inside React's
  // update), so the drop below always saves where the nodes really are, even if the last move and the release arrive together.
  const moveRightDrag = useCallback((drag: NonNullable<typeof rightDrag.current>, clientX: number, clientY: number) => {
    const current = screenToFlowPosition({ x: clientX, y: clientY });
    const delta = { x: current.x - drag.origin.x, y: current.y - drag.origin.y };
    for (const [nodeId, start] of drag.positions) drag.currentPositions.set(nodeId, { x: start.x + delta.x, y: start.y + delta.y });
    setNodes((currentNodes) => currentNodes.map((node) => {
      const position = drag.currentPositions.get(node.id);
      return position ? { ...node, position } : node;
    }));
  }, [screenToFlowPosition]);

  const onRightDragMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = rightDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    moveRightDrag(drag, event.clientX, event.clientY);
    event.preventDefault();
  }, [moveRightDrag]);

  const finishRightDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = rightDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    rightDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    moveRightDrag(drag, event.clientX, event.clientY); // the release point counts too
    for (const [nodeId, position] of drag.currentPositions) {
      if (!nodeId.startsWith('tree:')) void updateSeed(nodeId, { graphX: Math.round(position.x), graphY: Math.round(position.y) }).catch(() => {});
    }
    // A right-click on a large tree that did not move (4px, as in ForestGrid) opens its menu instead of being a drag.
    const moved = Math.abs(event.clientX - drag.client.x) + Math.abs(event.clientY - drag.client.y) > 4;
    if (event.type === 'pointerup' && !moved && drag.nodeId.startsWith('tree:') && box.current) {
      const rect = box.current.getBoundingClientRect();
      setTreeMenu({ url: drag.nodeId.slice('tree:'.length), x: event.clientX - rect.left - box.current.clientLeft, y: event.clientY - rect.top - box.current.clientTop });
    }
  }, [moveRightDrag]);

  // Recenter: put each web's seeds in a circle around its large tree (circleAround), then save them like a drag.
  // Webs are done one after another, so a later web faces the new spots of an earlier one. Large trees stay put.
  const recenterWebs = useCallback((urls: string[]) => {
    const now = new Map(nodes.map((n) => [n.id, n.position]));
    const moved = new Map<string, Point>();
    for (const url of urls) {
      const seedIds = pages.get(url);
      const center = now.get('tree:' + url);
      if (!seedIds || !center) continue;
      for (const [id, spot] of circleAround(center, seedIds, roots, now)) {
        now.set(id, spot);
        moved.set(id, spot);
      }
    }
    setNodes((nds) => nds.map((n) => (moved.has(n.id) ? { ...n, position: moved.get(n.id)! } : n)));
    for (const [id, spot] of moved) void updateSeed(id, { graphX: Math.round(spot.x), graphY: Math.round(spot.y) }).catch(() => {});
  }, [nodes, pages, roots]);

  // The tree menu closes on a click anywhere outside it, or on Esc.
  useEffect(() => {
    if (!treeMenu) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (!treeMenuRef.current?.contains(e.target as Node)) setTreeMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setTreeMenu(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [treeMenu]);

  // Add a root between two seeds, or remove it if one exists already (one root per pair, whichever way it was drawn).
  const toggleRoot = useCallback(
    (a: string, b: string) => {
      const existing = roots.find((r) => (r.fromSeedId === a && r.toSeedId === b) || (r.fromSeedId === b && r.toSeedId === a));
      if (existing) void deleteRoot(existing.id);
      else void addRoot({ forestId, fromSeedId: a, toSeedId: b, source: 'manual', reason: '' });
    },
    [roots, forestId],
  );

  // Shift+click a seed: the first one is the link start, the second one toggles a root between them.
  // Shift+click the start again to cancel. Large trees (ids start with "tree:") cannot be linked.
  const onNodeClick = useCallback(
    (event: MouseEvent, node: GraphNode) => {
      if (!event.shiftKey || node.type !== 'seed') return;
      // The click also selected the node; undo that so the detail panel stays shut while linking.
      setFlowNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
      setSelectedId(null);
      if (!linkStartId) setLinkStartId(node.id);
      else {
        if (node.id !== linkStartId) toggleRoot(linkStartId, node.id);
        setLinkStartId(null);
        setPreview(null);
      }
    },
    [linkStartId, toggleRoot, setFlowNodes],
  );

  // Esc cancels a link. Also remember whether Shift is down (see shiftHeld).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      shiftHeld.current = e.shiftKey;
      if (e.type === 'keydown' && e.key === 'Escape') {
        setLinkStartId(null);
        setPreview(null);
      }
    };
    const onBlur = () => (shiftHeld.current = false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // The link start was deleted (for example in another tab): forget it.
  useEffect(() => {
    if (linkStartId && !seeds.some((s) => s.id === linkStartId)) setLinkStartId(null);
  }, [seeds, linkStartId]);

  // While linking, draw a light line from the link start's middle to the mouse (screen positions, inside the graph box).
  const onBoxPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onRightDragMove(event);
      if (!linkStartId || !box.current) return;
      const boxRect = box.current.getBoundingClientRect();
      const left = boxRect.left + box.current.clientLeft; // the svg starts inside the box's border
      const top = boxRect.top + box.current.clientTop;
      const sprite = box.current.querySelector(`.react-flow__node[data-id="${CSS.escape(linkStartId)}"] .fo-seed-sprite`);
      if (!sprite) return;
      const r = sprite.getBoundingClientRect();
      setPreview({ x1: r.left + r.width / 2 - left, y1: r.top + r.height / 2 - top, x2: event.clientX - left, y2: event.clientY - top });
    },
    [linkStartId, onRightDragMove],
  );

  // Select a root and press Delete or Backspace to remove it.
  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    for (const e of deleted) if (e.id.startsWith('root:')) void deleteRoot(e.id.slice('root:'.length));
  }, []);

  const onSelectionChange = useCallback(({ nodes: picked }: OnSelectionChangeParams) => {
    if (shiftHeld.current) return; // Shift+click is for linking, not for opening the detail panel
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

  // Hover focus: the hovered node and its neighbors stay bright, their lines light up, everything else fades
  // (graph.css). Only classes are added here; the real nodes and edges in state are left untouched.
  const lit = useMemo(() => (hoveredId ? hoverNeighborhood(hoveredId, edges) : null), [hoveredId, edges]);
  const shownNodes = useMemo(
    () =>
      nodes.map((n) => {
        const hoverClass = !lit ? '' : n.id === hoveredId ? 'fo-hovered' : lit.has(n.id) ? 'fo-lit' : 'fo-dim';
        const className = `${hoverClass} ${n.id === linkStartId ? 'fo-link-start' : ''}`.trim();
        return className ? { ...n, className } : n;
      }),
    [nodes, lit, hoveredId, linkStartId],
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
          onPointerMove={onBoxPointerMove}
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
          onNodeClick={onNodeClick}
          onPaneClick={() => { setLinkStartId(null); setPreview(null); }}
          onEdgesDelete={onEdgesDelete}
          onSelectionChange={onSelectionChange}
          nodesConnectable={false} // links are made with Shift+click, not by dragging
          selectionKeyCode={null} // Shift is ours: no Shift-drag selection box
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
                {pages.size > 0 && (
                  <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink shadow-md shadow-drop hover:bg-primary-strong" onClick={() => recenterWebs([...pages.keys()])}>
                    Recenter All {cap(words.webs)}
                  </button>
                )}
              </div>
            )}
          </Panel>
          {seeds.length === 0 ? (
            <Panel position="top-center" className="rounded-lg bg-surface px-3 py-2 text-sm text-ink-muted">{words.emptyGraph}</Panel>
          ) : (
            <Panel position="bottom-center" className="rounded-lg bg-surface px-3 py-1 text-xs text-ink-muted">Shift+click one {words.seed}, then another, to {words.growRoot}. Do it again, or click the line and press Delete, to remove it.</Panel>
          )}
          {linkStartId && seedsById.get(linkStartId) && (
            <Panel position="top-center" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink shadow-md shadow-drop">
              Shift+click another to link (Esc cancels)
            </Panel>
          )}
        </ReactFlow>
        {linkStartId && preview && (
          <svg className="fo-link-preview" aria-hidden="true">
            <line x1={preview.x1} y1={preview.y1} x2={preview.x2} y2={preview.y2} />
          </svg>
        )}
        {treeMenu && (
          <div ref={treeMenuRef} className="absolute z-10 rounded-lg border border-edge bg-surface py-1 text-sm text-ink shadow-md shadow-drop" style={{ left: treeMenu.x, top: treeMenu.y }}>
            <button className="block w-full px-3 py-1.5 text-left hover:bg-primary-soft" onClick={() => { recenterWebs([treeMenu.url]); setTreeMenu(null); }}>
              Recenter This {cap(words.web)}
            </button>
          </div>
        )}
      </div>
      {selected && <NodeDetail seed={selected} roots={roots} seedsById={seedsById} folders={folders} onClose={closeDetail} onSelectSeed={(id) => setFlowNodes((nds) => nds.map((n) => (n.selected !== (n.id === id) ? { ...n, selected: n.id === id } : n)))} />}
    </div>
  );
}
