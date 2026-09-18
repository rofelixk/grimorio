import { Color } from '@models/card.model';

export interface StorageLocation {
  id: string;
  name: string;
  parentId: string | null;
  color?: Color;
}

export interface StorageLocationNode extends StorageLocation {
  children: StorageLocationNode[];
}
