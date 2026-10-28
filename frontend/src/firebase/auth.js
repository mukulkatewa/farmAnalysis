import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInAnonymously,
  linkWithCredential,
  linkWithPopup,
} from "firebase/auth";
import { createAuthActions } from './authActions';

const actions = createAuthActions(auth, { createUserWithEmailAndPassword, signInAnonymously, linkWithCredential, linkWithPopup, EmailAuthProvider, GoogleAuthProvider, signInWithPopup });
export const doContinueAsGuest = actions.guest;

export const doCreateUserWithEmailAndPassword = async (email, password) => {
  return actions.createAccount(email, password);
};

export const doSignInWithEmailAndPassword = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const doSignInWithGoogle = async (options) => {
  return actions.google(options);
};

export const doSignOut = () => {
  return auth.signOut();
};

export const doPasswordReset = (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const doPasswordChange = (password) => {
  return updatePassword(auth.currentUser, password);
};

export const doSendEmailVerification = () => {
  return sendEmailVerification(auth.currentUser, {
    url: `${window.location.origin}/home`,
  });
};
