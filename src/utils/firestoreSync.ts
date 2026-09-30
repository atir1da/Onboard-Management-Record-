import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";

/**
 * Saves or updates a bridge watch entry in Firestore.
 */
export async function syncWatchToFirestore(watch: any): Promise<void> {
  if (!auth.currentUser || !watch.id) return;
  const path = `watches/${watch.id}`;
  try {
    await setDoc(doc(db, "watches", watch.id), {
      ...watch,
      updatedAt: new Date().toISOString(),
      syncedByUserId: auth.currentUser.uid
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a watch entry from Firestore.
 */
export async function deleteWatchFromFirestore(watchId: string): Promise<void> {
  if (!auth.currentUser || !watchId) return;
  const path = `watches/${watchId}`;
  try {
    await deleteDoc(doc(db, "watches", watchId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribes to real-time bridge watches from Firestore when user is authenticated.
 */
export function subscribeToFirestoreWatches(
  onUpdate: (watches: any[]) => void,
  onError?: (error: any) => void
) {
  if (!auth.currentUser) return () => {};

  const path = "watches";
  const watchesQuery = query(collection(db, path));

  return onSnapshot(
    watchesQuery,
    (snapshot) => {
      const records: any[] = [];
      snapshot.forEach(docSnap => {
        records.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (records.length > 0) {
        onUpdate(records);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Syncs active crew member to Firestore.
 */
export async function syncCrewMemberToFirestore(crewMember: any): Promise<void> {
  if (!auth.currentUser || !crewMember.rank) return;
  const cleanId = crewMember.rank.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const path = `crew/${cleanId}`;
  try {
    await setDoc(doc(db, "crew", cleanId), {
      ...crewMember,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Syncs safety drill to Firestore.
 */
export async function syncDrillToFirestore(drill: any): Promise<void> {
  if (!auth.currentUser || !drill.id) return;
  const path = `safety_drills/${drill.id}`;
  try {
    await setDoc(doc(db, "safety_drills", drill.id), {
      ...drill,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
