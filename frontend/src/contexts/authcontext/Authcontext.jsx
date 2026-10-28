/* eslint-disable react-refresh/only-export-components -- Context hooks intentionally share their provider module. */
import React, { useContext, useState, useEffect } from "react";
import { auth } from "../../firebase/firebase";
import { GoogleAuthProvider } from "firebase/auth";
import { onIdTokenChanged } from "firebase/auth";

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.error('Firebase Auth is not initialized. Please check your Firebase configuration.');
      setLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(
      auth,
      initializeUser,
      (error) => {
        console.error('Auth state change error:', error);
        // Handle specific error codes
        if (error.code === 'auth/api-key-not-valid') {
          console.error('Firebase API key is invalid. Please check your .env file.');
        } else if (error.code === 'auth/network-request-failed') {
          console.error('Network error. Please check your internet connection.');
        } else {
          console.error('Authentication error:', error.message);
        }
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  async function initializeUser(user) {
    if (user) {
      // Keep the original user object to preserve Firebase methods like getIdToken()
      setCurrentUser(user);
      setIsGuest(user.isAnonymous === true);

      // check if provider is email and password login
      const isEmail = user.providerData.some(
        (provider) => provider.providerId === "password"
      );
      setIsEmailUser(isEmail);

      // check if the auth provider is google or not
      const isGoogle = user.providerData.some(
        (provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID
      );
      setIsGoogleUser(isGoogle);

      setUserLoggedIn(true);
    } else {
      setCurrentUser(null);
      setUserLoggedIn(false);
      setIsGuest(false);
      setIsGoogleUser(false);
      setIsEmailUser(false);
    }

    setLoading(false);
  }

  const value = {
    userLoggedIn,
    isEmailUser,
    isGoogleUser,
    isGuest,
    currentUser,
    setCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
