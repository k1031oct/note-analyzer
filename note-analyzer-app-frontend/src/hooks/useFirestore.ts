import { useState, useEffect } from 'react';
import { onSnapshot, type Query } from 'firebase/firestore';

export const useFirestoreQuery = <T,>(q: Query | null) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as T);
      setData(docs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore query error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [q]);

  return { data, loading };
};
