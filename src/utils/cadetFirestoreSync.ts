import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query 
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { CadetTaskItem } from "../types/cadetTraining";
import { DEFAULT_CADET_TASKS } from "../constants/cadetDefaultTasks";

const CADET_LOCAL_STORAGE_KEY = "sms_cadet_tasks";

/**
 * Loads tasks from localStorage or provides initial defaults.
 */
export function getStoredCadetTasks(): CadetTaskItem[] {
  try {
    const saved = localStorage.getItem(CADET_LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read cadet tasks from localStorage:", e);
  }
  return DEFAULT_CADET_TASKS;
}

/**
 * Saves tasks to localStorage and fires sync event.
 */
export function saveCadetTasksLocally(tasks: CadetTaskItem[]): void {
  try {
    localStorage.setItem(CADET_LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent("sms_cadet_tasks_updated", { detail: tasks }));
  } catch (e) {
    console.error("Failed to save cadet tasks locally:", e);
  }
}

/**
 * Saves or updates a cadet task in Cloud Firestore.
 */
export async function syncCadetTaskToFirestore(task: CadetTaskItem): Promise<void> {
  if (!auth.currentUser || !task.id) return;
  const path = `cadet_tasks/${task.id}`;
  try {
    await setDoc(doc(db, "cadet_tasks", task.id), {
      ...task,
      updatedAt: new Date().toISOString(),
      syncedByUserId: auth.currentUser.uid
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a cadet task from Cloud Firestore.
 */
export async function deleteCadetTaskFromFirestore(taskId: string): Promise<void> {
  if (!auth.currentUser || !taskId) return;
  const path = `cadet_tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, "cadet_tasks", taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribes to real-time cadet tasks from Firestore when user is authenticated.
 */
export function subscribeToFirestoreCadetTasks(
  onUpdate: (tasks: CadetTaskItem[]) => void,
  onError?: (error: any) => void
) {
  if (!auth.currentUser) return () => {};

  const path = "cadet_tasks";
  const tasksQuery = query(collection(db, path));

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      const records: CadetTaskItem[] = [];
      snapshot.forEach(docSnap => {
        records.push(docSnap.data() as CadetTaskItem);
      });
      if (records.length > 0) {
        onUpdate(records);
      }
    },
    (err) => {
      console.warn("Firestore cadet tasks subscription warning:", err);
      if (onError) onError(err);
    }
  );
}
