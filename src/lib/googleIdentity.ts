export const GOOGLE_CREDENTIAL_EVENT = "thelawala:google-credential";

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

type GoogleCredentialResponse = { credential: string };
type GoogleId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: () => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

export function isGoogleIdentityConfigured() {
  return Boolean(GOOGLE_CLIENT_ID);
}

export function initializeGoogleIdentity(prompt = false) {
  const googleId = window.google?.accounts?.id;
  if (!googleId || !isGoogleIdentityConfigured()) return false;
  googleId.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      window.dispatchEvent(
        new CustomEvent(GOOGLE_CREDENTIAL_EVENT, { detail: response.credential }),
      );
    },
    cancel_on_tap_outside: true,
  });
  if (prompt) googleId.prompt();
  return true;
}

export function waitForGoogleIdentity(prompt = false) {
  if (!isGoogleIdentityConfigured()) return () => {};
  if (initializeGoogleIdentity(prompt)) return () => {};
  const interval = window.setInterval(() => {
    if (!initializeGoogleIdentity(prompt)) return;
    window.clearInterval(interval);
  }, 250);
  return () => window.clearInterval(interval);
}
