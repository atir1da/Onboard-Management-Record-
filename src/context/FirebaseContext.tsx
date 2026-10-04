import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { 
  auth, 
  db, 
  loginWithGoogle, 
  loginWithEmail,
  signUpWithEmail,
  logoutUser, 
  testConnection 
} from "../firebase";
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  Unsubscribe 
} from "firebase/firestore";
import { UserProfile } from "../types/userProfile";
import { syncUserProfileWithSystem } from "../utils/userProfileSync";

interface FirebaseContextType {
  currentUser: FirebaseUser | null;
  isAuthReady: boolean;
  isConnected: boolean;
  userProfile: UserProfile | null;
  isProfileComplete: boolean;
  isLoadingProfile: boolean;
  loginWithGoogle: () => Promise<FirebaseUser | null>;
  login: () => Promise<FirebaseUser | null>;
  loginWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  signUpWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  saveFirestoreProfile: (profile: Omit<UserProfile, "isLoggedIn">) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  currentUser: null,
  isAuthReady: false,
  isConnected: false,
  userProfile: null,
  isProfileComplete: false,
  isLoadingProfile: false,
  loginWithGoogle: async () => null,
  login: async () => null,
  loginWithEmail: async () => { throw new Error("Not implemented"); },
  signUpWithEmail: async () => { throw new Error("Not implemented"); },
  logout: async () => {},
  saveFirestoreProfile: async () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    // Check initial connection
    testConnection().then(connected => {
      setIsConnected(connected);
    });

    let profileUnsub: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      // Unsubscribe any previous profile listener
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      setCurrentUser(user);
      setIsAuthReady(true);

      if (user) {
        setIsLoadingProfile(true);
        // Real-Time Multi-Device Sync for User Profile Document in Firestore
        try {
          const userDocRef = doc(db, "users", user.uid);
          profileUnsub = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              // Validate mandatory fields
              if (
                data.fullName?.trim() && 
                data.seafarerId?.trim() && 
                data.department && 
                data.rank
              ) {
                const profile: UserProfile = {
                  fullName: data.fullName,
                  department: data.department,
                  rank: data.rank,
                  seafarerId: data.seafarerId,
                  nationality: data.nationality || "Filipino",
                  email: data.email || user.email || "",
                  userId: user.uid,
                  isLoggedIn: true
                };
                setUserProfile(profile);
                setIsProfileComplete(true);
                // Sync to local system, crew list, and watchkeeper
                syncUserProfileWithSystem(profile);
              } else {
                setIsProfileComplete(false);
              }
            } else {
              // Document does not exist yet -> mandatory onboarding required
              setIsProfileComplete(false);
            }
            setIsLoadingProfile(false);
          }, (error) => {
            console.error("Firestore onSnapshot error on users doc:", error);
            setIsLoadingProfile(false);
          });
        } catch (error) {
          console.error("Error setting up user profile listener in Firestore:", error);
          setIsLoadingProfile(false);
        }
      } else {
        setUserProfile(null);
        setIsProfileComplete(false);
        setIsLoadingProfile(false);
      }
    });

    return () => {
      if (profileUnsub) {
        profileUnsub();
      }
      authUnsubscribe();
    };
  }, []);

  const handleLoginWithGoogle = async () => {
    try {
      const user = await loginWithGoogle();
      return user;
    } catch (error) {
      console.error("Firebase Google Login failed:", error);
      throw error;
    }
  };

  const handleLoginWithEmail = async (email: string, pass: string) => {
    try {
      const user = await loginWithEmail(email, pass);
      return user;
    } catch (error: any) {
      const code = error?.code || '';
      if (code !== 'auth/invalid-credential' && code !== 'auth/user-not-found' && code !== 'auth/wrong-password') {
        console.error("Firebase Email Login failed:", error);
      }
      throw error;
    }
  };

  const handleSignUpWithEmail = async (email: string, pass: string) => {
    try {
      const user = await signUpWithEmail(email, pass);
      return user;
    } catch (error: any) {
      const code = error?.code || '';
      if (code !== 'auth/email-already-in-use') {
        console.error("Firebase Email SignUp failed:", error);
      }
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUserProfile(null);
      setIsProfileComplete(false);
    } catch (error) {
      console.error("Firebase Logout failed:", error);
      throw error;
    }
  };

  const handleSaveFirestoreProfile = async (profileData: Omit<UserProfile, "isLoggedIn">) => {
    if (!currentUser) {
      throw new Error("Cannot save profile: No authenticated user");
    }

    const completeProfile: UserProfile = {
      ...profileData,
      email: currentUser.email || "",
      userId: currentUser.uid,
      isLoggedIn: true
    };

    // Save to Firestore users/{uid}
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, {
      userId: currentUser.uid,
      fullName: completeProfile.fullName,
      email: completeProfile.email || "",
      department: completeProfile.department,
      rank: completeProfile.rank,
      seafarerId: completeProfile.seafarerId,
      nationality: completeProfile.nationality,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Update local state and system sync
    setUserProfile(completeProfile);
    setIsProfileComplete(true);
    syncUserProfileWithSystem(completeProfile);
  };

  return (
    <FirebaseContext.Provider
      value={{
        currentUser,
        isAuthReady,
        isConnected,
        userProfile,
        isProfileComplete,
        isLoadingProfile,
        loginWithGoogle: handleLoginWithGoogle,
        login: handleLoginWithGoogle,
        loginWithEmail: handleLoginWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        logout: handleLogout,
        saveFirestoreProfile: handleSaveFirestoreProfile
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}
