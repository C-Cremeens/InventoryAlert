import { CredentialsSignin } from "next-auth";

export const GOOGLE_SIGNIN_REQUIRED_CODE = "google_signin_required";

export class GoogleSignInRequiredError extends CredentialsSignin {
  code = GOOGLE_SIGNIN_REQUIRED_CODE;
}
