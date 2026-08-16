export interface FolderItem {
  catalog_id: string;
  position: number;
  added_at: string;
}

export interface Folder {
  id: string;
  name: string;
  feed_token: string;
  item_count: number;
  items: FolderItem[];
}

export type Route =
  | { name: 'home' }
  | { name: 'category'; category: string }
  | { name: 'session'; id: string }
  | { name: 'folders' }
  | { name: 'folder'; id: string }
  | { name: 'subscribe'; token: string }
  | { name: 'account' }
  | { name: 'not-found' };
