import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export const GOOGLE_WEB_CLIENT_ID =
  "249640936667-d4cflkcn6khkt75jte7l1hrbm0a7l5oe.apps.googleusercontent.com";

export const GOOGLE_IOS_CLIENT_ID =
  "249640936667-09tllcnhcd8mvvjdp8eeu64e40bibmlh.apps.googleusercontent.com";

let configured = false;

export function configureGoogleAuth() {
  if (configured) return;

  GoogleSignin.configure({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ["profile", "email"],
    offlineAccess: true,
  });

  configured = true;
}

export function getGoogleAuthErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  console.log(code)
  if (code === statusCodes.SIGN_IN_CANCELLED) {
    return "Google sign-in was cancelled.";
  }

  if (code === statusCodes.IN_PROGRESS) {
    return "Google sign-in is already in progress.";
  }

  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return "Google Play Services is not available on this device.";
  }

  return "Google sign-in failed. Please try again.";
}
