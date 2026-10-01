import type { ImageItem, LayoutSettings, DocumentPage, ProjectData } from '../types';

const DB_NAME = 'printcraft_storage_db';
const DB_VERSION = 1;
const STORE_IMAGES = 'images_store';
const META_STORAGE_KEY = 'printcraft_project_meta_v1';

// Open / initialize IndexedDB
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save images to IndexedDB (supports large base64/blob storage without localStorage quota limits)
 */
export async function saveImagesToDb(images: ImageItem[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    const store = tx.objectStore(STORE_IMAGES);

    // Clear existing to match current memory state
    store.clear();

    for (const img of images) {
      store.put(img);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save images to IndexedDB:', err);
  }
}

/**
 * Load all images from IndexedDB
 */
export async function loadImagesFromDb(): Promise<ImageItem[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const store = tx.objectStore(STORE_IMAGES);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not load images from IndexedDB:', err);
    return [];
  }
}

/**
 * Clear all images from IndexedDB
 */
export async function clearImagesFromDb(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    tx.objectStore(STORE_IMAGES).clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn('Could not clear IndexedDB:', err);
  }
}

export interface ProjectMetadata {
  projectName: string;
  settings: LayoutSettings;
  pages: DocumentPage[];
  activePageIndex: number;
  updatedAt: number;
}

/**
 * Save lightweight project metadata to localStorage
 */
export function saveProjectMetadata(meta: Omit<ProjectMetadata, 'updatedAt'>): void {
  try {
    const data: ProjectMetadata = {
      ...meta,
      updatedAt: Date.now(),
    };
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save project metadata to localStorage:', err);
  }
}

/**
 * Load project metadata from localStorage
 */
export function loadProjectMetadata(): ProjectMetadata | null {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectMetadata;
  } catch (err) {
    console.warn('Failed to parse project metadata from localStorage:', err);
    return null;
  }
}

/**
 * Export full project state to a downloadable JSON file
 */
export function exportProjectFile(projectData: ProjectData): void {
  const jsonStr = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const safeName = (projectData.projectName || 'PrintCraft_Project').replace(/[^a-z0-9_-]/gi, '_');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.printcraft.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import a full project state from an uploaded JSON file
 */
export function importProjectFile(file: File): Promise<ProjectData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as ProjectData;
        if (!parsed.pages || !Array.isArray(parsed.pages)) {
          throw new Error('Invalid project file: missing pages structure.');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read project file'));
    reader.readAsText(file);
  });
}
