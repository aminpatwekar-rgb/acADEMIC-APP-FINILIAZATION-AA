import { CanvasStroke, PaperPattern } from './engine';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export interface NotebookPage {
  id: string;
  pageNumber: number;
  strokes: CanvasStroke[];
  backgroundImage?: string;
  pattern: PaperPattern;
}

export interface NotebookDocument {
  id: string;
  title: string;
  pages: NotebookPage[];
  currentPageIndex: number;
}

export function createEmptyDocument(title: string = 'Assignment Notebook'): NotebookDocument {
  return {
    id: Math.random().toString(36).substring(2, 9),
    title,
    pages: [
      {
        id: Math.random().toString(36).substring(2, 9),
        pageNumber: 1,
        strokes: [],
        pattern: 'ruled',
      }
    ],
    currentPageIndex: 0,
  };
}

export async function saveDocumentToFirebaseStorage(
  docId: string,
  pages: { pageNumber: number; dataUrl: string }[]
): Promise<string[]> {
  const urls: string[] = [];

  for (const page of pages) {
    const storageRef = ref(storage, `submissions/${docId}/page_${page.pageNumber}.png`);
    try {
      await uploadString(storageRef, page.dataUrl, 'data_url');
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    } catch (err) {
      console.warn('Firebase Storage upload fallback (offline or CORS). Saving data inline.', err);
      // Fallback to storing dataUrl directly if storage bucket security or CORS blocks in iframe
      urls.push(page.dataUrl);
    }
  }

  return urls;
}
