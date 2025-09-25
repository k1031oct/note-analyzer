import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Check if default classifications need to be created
        const classificationsRef = collection(db, "classifications");
        const q = query(classificationsRef, where("authorId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // User has no classifications, let's create the defaults
          const defaultPrimary = [
            '集客（閲覧数）',
            '誘因（興味関心）',
            '提案（有料記事）'
          ];
          const defaultSecondary = [
            'トレンド（流行）',
            '専門（差別化）',
            '恒常（鉄板ジャンル）'
          ];

          const primaryCollectionRef = collection(db, "classifications");
          for (const name of defaultPrimary) {
            await addDoc(primaryCollectionRef, { authorId: currentUser.uid, name, createdAt: serverTimestamp() });
          }

          const secondaryCollectionRef = collection(db, "secondary_classifications");
          for (const name of defaultSecondary) {
            await addDoc(secondaryCollectionRef, { authorId: currentUser.uid, name, createdAt: serverTimestamp() });
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("ログインエラー:", error);
    }
  }, []);

  const logout = useCallback(() => {
    signOut(auth);
  }, []);

  const value = { user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};