import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logoutUser, 
  testConnection, 
  handleFirestoreError, 
  OperationType 
} from "../firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection 
} from "firebase/firestore";

interface FirebaseContextType {
  currentUser: FirebaseUser | null;
  isAuthReady: boolean;
  isConnected: boolean;
  login: () => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  currentUser: null,
  isAuthReady: false,
  isConnected: false,
  login: async () => null,
  logout: async () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check initial connection
    testConnection().then(connected => {
      setIsConnected(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);

      if (user) {
        // Synchronize or create user document in Firestore
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);

          if (!userSnap.exists()) {
            const rawProfile = localStorage.getItem("sms_user_profile");
            let localProfile: any = {};
            if (rawProfile) {
              try { localProfile = JSON.parse(rawProfile); } catch (e) {}
            }

            await setDoc(userDocRef, {
              userId: user.uid,
              fullName: user.displayName || localProfile.fullName || "Navigator Officer",
              email: user.email || "",
              rank: localProfile.rank || "2nd Officer",
              department: localProfile.department || "Deck",
              nationality: localProfile.nationality || "Filipino",
              seafarerId: localProfile.seafarerId || `SEID-${Math.floor(100000 + Math.random() * 900000)}`,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Error setting up user profile in Firestore:", error);
          // Non-fatal for initial profile
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      return user;
    } catch (error) {
      console.error("Firebase Login failed:", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Firebase Logout failed:", error);
      throw error;
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        currentUser,
        isAuthReady,
        isConnected,
        login: handleLogin,
        logout: handleLogout
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}
