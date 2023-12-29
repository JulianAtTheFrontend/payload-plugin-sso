import type { CollectionBeforeOperationHook } from 'payload/types';
import payload from "payload";

/*
 * This hook disables a verification email if the user was logged in with Google or Apple.
 */

export const disableVerificationEmailOnSSO: CollectionBeforeOperationHook = async ({ args, operation }) => {
  if (operation === 'create' && args?.data?.loginMethod !== 'emailAndPassword') {
    return {
      ...args,
      disableVerificationEmail: true,
      forgotPassword: false,
    };
  }
}
