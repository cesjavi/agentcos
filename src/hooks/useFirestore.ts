import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  type QueryConstraint
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const EMPTY_CONSTRAINTS: QueryConstraint[] = [];

export function useFirestoreCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = EMPTY_CONSTRAINTS,
  options: { idField?: string; enabled?: boolean } = {}
) {
  const { idField = 'id', enabled = true } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const q = query(collection(db, collectionName), ...constraints);
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({
            [idField]: doc.id,
            ...doc.data(),
          })) as unknown as T[];
          setData(docs);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`Firestore error in collection ${collectionName}:`, err);
          handleFirestoreError(err, OperationType.LIST, collectionName);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error(`Query construction error for ${collectionName}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [collectionName, enabled, constraints]);

  return { data, loading, error };
}
