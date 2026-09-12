export interface StorageLocation {
  id: string;
  name: string;
  parentId: string | null;
}

export interface StorageLocationNode extends StorageLocation {
  children: StorageLocationNode[];
}
