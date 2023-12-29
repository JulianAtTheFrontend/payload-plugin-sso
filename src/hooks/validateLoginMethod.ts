import { ExtendedPayloadRequest, BeforeLoginHookWithExtendedReq } from '../plugins/types';
import APIError from "payload/dist/errors/APIError";

/*
 * This hook prevents the user to login with a login method that is not the one used to create the account.
 * This happens when a user signed up using "Apple" and tries to login with "Google" which firstly will him authorize. (and his email exists)
 */

export const validateLoginMethod: BeforeLoginHookWithExtendedReq<any> = async ({ req, user }: { req: ExtendedPayloadRequest, user: any }) => {
    const currentlyUsedLoginMethod = req.currentLoginMethod || 'emailAndPassword'
    if (user.loginMethod === currentlyUsedLoginMethod) return user;
  const errorMessage = req.locale === 'de'
    ? 'Du musst dich mit der gleichen Methode anmelden, mit der du dein Konto erstellt hast.'
    : 'You must login with the same method you used to create your account.';
  throw new APIError(errorMessage, 400, undefined, true);
}

