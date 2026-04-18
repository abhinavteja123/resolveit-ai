import { createContext, useState, useEffect, useContext } from 'react';
import { auth, googleProvider } from '../firebaseConfig';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '',
          picture: firebaseUser.photoURL || '',
        });
        setToken(idToken);
        // Fetch admin status from backend
        try {
          const res = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          setIsAdmin(res.data.is_admin === true);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setToken(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google Sign-In (works for both new and existing users)
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  // Email/Password Sign In
  const loginWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  // Email/Password Sign Up (Register)
  const registerWithEmail = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      const idToken = await result.user.getIdToken();
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        name: displayName || '',
        picture: '',
      });
      setToken(idToken);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setToken(null);
  };

  // Refresh token periodically (Firebase tokens expire after ~1h)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const freshToken = await currentUser.getIdToken(true);
        setToken(freshToken);
      }
    }, 50 * 60 * 1000); // Every 50 minutes

    return () => clearInterval(interval);
  }, [user]);

  const value = {
    user,
    token,
    loading,
    isAdmin,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
