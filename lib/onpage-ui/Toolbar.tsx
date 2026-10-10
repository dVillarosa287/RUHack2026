import { useState } from 'react';
import type { Forest, SpriteType } from '@/lib/storage';
import { COLORS, SPRITES, SPRITE_ORDER } from '@/lib/theme';
import { ShovelIcon } from '@/lib/theme/ShovelIcon';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

export type Tool = 'none' | 'plant' | 'dig';

interface ToolbarProps {
  forests: Forest[];
  currentForestId: string | null;
  tool: Tool;
  spriteType: SpriteType;
  colorId: string;
  status: string;
  onPickSprite(type: SpriteType): void;
  onPickShovel(): void;
  onPickColor(id: string): void;
  onSwitchForest(id: string): void;
  onCreateForest(name: string): void;
  onOpenCurrentForest(): void;
  onOpenAllForests(): void;
}

export function Toolbar(props: ToolbarProps) {
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const submitName = () => {
    const name = draftName.trim();
    if (name) props.onCreateForest(name);
    setDraftName('');
    setNaming(false);
  };

  return (
    <div className="fo-toolbar">
      <div className="fo-forest-row">
        {naming ? (
          <>
            <input
              autoFocus
              value={draftName}
              placeholder="Name of the new forest"
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitName();
                if (e.key === 'Escape') setNaming(false);
              }}
            />
            <button className="fo-small-button" onClick={submitName}>Create</button>
          </>
        ) : (
          <>
            <select aria-label="Current forest" value={props.currentForestId ?? ''} onChange={(e) => props.onSwitchForest(e.target.value)}>
              {props.forests.map((f) => (
                <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
              ))}
            </select>
            <button className="fo-small-button" title="Create a new forest" onClick={() => setNaming(true)}>+ New</button>
          </>
        )}
      </div>

      <div className="fo-panel">
        <div className="fo-row">
          {SPRITE_ORDER.map((type) => (
            <button key={type} className="fo-tool" title={SPRITES[type].label} aria-pressed={props.tool === 'plant' && props.spriteType === type} onClick={() => props.onPickSprite(type)}>
              <SpriteIcon type={type} size={26} />
            </button>
          ))}
          <div className="fo-divider" />
          <button className="fo-tool" title="Shovel: click a highlight or marker to remove it" aria-pressed={props.tool === 'dig'} onClick={props.onPickShovel}>
            <ShovelIcon size={26} />
          </button>
        </div>

        <div className="fo-row">
          {COLORS.map((c) => (
            <button key={c.id} className="fo-swatch" title={c.name} aria-label={c.name} aria-pressed={props.colorId === c.id} style={{ background: c.hex }} onClick={() => props.onPickColor(c.id)} />
          ))}
        </div>

        <div className="fo-hint">
          {props.tool === 'plant' && 'Drag over text to highlight it, or click to place a marker. Esc to stop.'}
          {props.tool === 'dig' && 'Click a highlight or a marker to remove it. Esc to stop.'}
          {props.tool === 'none' && 'Pick a sprite, then drag over text or click the page.'}
        </div>

        <div className="fo-row">
          <button className="fo-button" onClick={props.onOpenCurrentForest}>Current Forest</button>
          <button className="fo-button" onClick={props.onOpenAllForests}>View Forests</button>
        </div>

        <div className="fo-status" role="status">{props.status}</div>
      </div>
    </div>
  );
}
