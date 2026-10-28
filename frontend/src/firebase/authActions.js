// The same Firebase UID must survive guest-to-account upgrades.
export function createAuthActions(auth, sdk) {
  return {
    async guest() {
      if (auth.currentUser) return { user: auth.currentUser };
      return sdk.signInAnonymously(auth);
    },
    async createAccount(email, password) {
      if (auth.currentUser?.isAnonymous) {
        const result = await sdk.linkWithCredential(auth.currentUser, sdk.EmailAuthProvider.credential(email, password));
        await result.user.getIdToken(true);
        return result;
      }
      return sdk.createUserWithEmailAndPassword(auth, email, password);
    },
    async google({ upgrade = true } = {}) {
      const provider = new sdk.GoogleAuthProvider();
      if (auth.currentUser?.isAnonymous && upgrade) {
        const result = await sdk.linkWithPopup(auth.currentUser, provider);
        await result.user.getIdToken(true);
        return result;
      }
      return sdk.signInWithPopup(auth, provider);
    },
  };
}
