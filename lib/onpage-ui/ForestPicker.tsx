import type { Forest } from '@/lib/storage';
import { useWords } from '@/lib/theme';
import { ForestIcon } from '@/lib/theme/SpriteIcon';
import { Picker } from './Picker';

interface ForestPickerProps {
  forests: Forest[];
  currentForestId: string | null;
  onSwitchForest(id: string): void;
  /** The last row, "+ Create new forest". The toolbar then asks for a name. */
  onCreateNew(): void;
}

/** The forest drop-down at the top of the toolbar (the list itself is Picker.tsx). */
export function ForestPicker(props: ForestPickerProps) {
  const words = useWords();
  return (
    <Picker
      ariaLabel={`Current ${words.forest}`}
      placeholder={`Choose a ${words.forest}`}
      currentId={props.currentForestId}
      onPick={props.onSwitchForest}
      items={props.forests.map((f) => ({ id: f.id, label: f.name, icon: <ForestIcon icon={f.icon} size={20} /> }))}
      extra={{ label: `+ Create new ${words.forest}`, onClick: props.onCreateNew }}
    />
  );
}
