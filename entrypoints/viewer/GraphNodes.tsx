import { Handle, Position, useConnection, type Node, type NodeProps } from '@xyflow/react';
import type { Seed } from '@/lib/storage';
import { spriteLabel, useThemeId } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

export type SeedNodeType = Node<{ seed: Seed }, 'seed'>;
export type LargeTreeNodeType = Node<{ title: string; seedIds: string[] }, 'largeTree'>;
export type GraphNode = SeedNodeType | LargeTreeNodeType;

export const SEED_SPRITE_SIZE = 56;
const LARGE_TREE_SIZE = 120;

/** A short label for a seed: its text, or what kind of seed it is (named in the theme `themeId`). */
export function seedLabel(seed: Seed, themeId?: string): string {
  const displayText = seed.displayText?.trim();
  if (displayText) return displayText;
  const text = seed.text.trim();
  if (!text) return spriteLabel(seed.spriteType, themeId);
  return text.length > 40 ? text.slice(0, 38) + '…' : text;
}

/**
 * Every line in the graph runs from the middle of one node to the middle of another, so each node has an
 * invisible handle in its middle: "out" for lines that start here, "in" for lines that end here.
 */
function MiddleHandles() {
  return (
    <>
      <Handle id="out" type="source" position={Position.Top} className="fo-middle-handle" isConnectable={false} />
      <Handle id="in" type="target" position={Position.Top} className="fo-middle-handle" isConnectable={false} />
    </>
  );
}

/**
 * One seed in the graph, drawn as its sprite. To grow a root, the user drags from the small dot on the sprite.
 * While they drag, every other seed is covered by an invisible drop area ("drop"), so letting go anywhere on a
 * node connects to it, not only on a tiny dot.
 */
export function SeedNode({ data, selected }: NodeProps<SeedNodeType>) {
  const { seed } = data;
  const dropHere = useConnection((c) => c.inProgress && c.fromNode.id !== seed.id);
  const themeId = useThemeId();

  return (
    <div className={`fo-seed-node${selected ? ' is-selected' : ''}`} title={seed.pageTitle || 'Your note'}>
      <div className="fo-seed-sprite">
        <SpriteIcon type={seed.spriteType} size={SEED_SPRITE_SIZE} grown={seed.growth === 'tree'} />
        <MiddleHandles />
        <Handle id="root" type="source" position={Position.Right} className="fo-root-handle" title="Drag to another node to grow a root" />
      </div>
      <span className="fo-seed-label">{seedLabel(seed, themeId)}</span>
      {dropHere && <Handle id="drop" type="target" position={Position.Top} className="fo-drop-handle" />}
    </div>
  );
}

/**
 * A large tree: stands for a web page with 2 or more seeds. Not a seed, cannot be moved or connected. It is drawn
 * as the grown sprout, so it follows the theme (a cloud in the Minimal theme).
 */
export function LargeTreeNode({ data }: NodeProps<LargeTreeNodeType>) {
  return (
    <div className="fo-tree-node" title={data.title}>
      <div className="fo-seed-sprite">
        <SpriteIcon type="sprout" grown size={LARGE_TREE_SIZE} />
        <MiddleHandles />
      </div>
      <span className="fo-tree-label">{data.title}</span>
    </div>
  );
}

export const NODE_TYPES = { seed: SeedNode, largeTree: LargeTreeNode };
