export function authErrorMessage(error) {
  const messages = {
    'auth/invalid-credential': 'We couldn’t sign you in. Check your email and password and try again.',
    'auth/user-not-found': 'We couldn’t sign you in. Check your email and password and try again.',
    'auth/wrong-password': 'We couldn’t sign you in. Check your email and password and try again.',
    'auth/email-already-in-use': 'An account already uses this email. Sign in instead to continue.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/popup-closed-by-user': 'The Google window was closed. You can try again or continue as a guest.',
    'auth/popup-blocked': 'Allow the Google sign-in popup, or use email to continue.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment before trying again.',
    'auth/network-request-failed': 'We couldn’t connect. Check your connection and try again.',
    'auth/operation-not-allowed': 'This sign-in option is not enabled yet. Please try email or Google, or contact the app administrator.',
    'auth/admin-restricted-operation': 'Guest access needs to be enabled by the app administrator. Email and Google are still available.',
    'auth/credential-already-in-use': 'That account already has a workspace. Sign in to switch to it, or use a different email to keep this guest workspace.',
    'auth/account-exists-with-different-credential': 'This email uses a different sign-in method. Use the original method to access that account.',
    'permission-denied': 'Your account is signed in, but we couldn’t finish setting up your workspace. Please retry.',
  };
  return messages[error?.code] || 'We couldn’t complete that request. Please try again. You can also explore as a guest.';
}
