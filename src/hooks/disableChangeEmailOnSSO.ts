import type { CollectionBeforeOperationHook } from 'payload/types';

/*
 * This hook disables the ability to change the email address if the user was logged in with Google or Apple.
 */

export const disableChangeEmailOnSSO: CollectionBeforeOperationHook = async ({ args, operation }) => {
    if (operation === 'update' && args.data?.loginMethod !== 'emailAndPassword') {
        const updated = { ...args };
        // keep original email
        delete updated.data.email;
        return updated
    }
}
