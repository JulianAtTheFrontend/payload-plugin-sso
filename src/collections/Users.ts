import { CollectionConfig } from 'payload/types';

// Hooks
import { disableVerificationEmailOnSSO } from '../hooks/disableVerificationEmailOnSSO';
import { disableChangeEmailOnSSO } from '../hooks/disableChangeEmailOnSSO';
import { validateLoginMethod } from '../hooks/validateLoginMethod';


const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: {
      en: 'User',
      de: 'Benutzer',
    },
    plural: {
      en: 'Users',
      de: 'Benutzer',
    },
  },
  auth: {
    cookies: {
      sameSite: 'none',
      secure: true,
    },
    tokenExpiration: 3600,
  },
  admin: {
    useAsTitle: 'email',
    description: {
      en: 'Here you can see all users, that have created an account. Make sure to activate them, so they can use the app.',
      de: 'Hier kannst du alle Benutzer sehen, die ein Konto erstellt haben. Stelle sicher, dass du sie aktivierst, damit sie die App verwenden können.',
    },
    defaultColumns: ['profileImage', 'email', 'firstName', 'lastName', 'activated'],
    disableDuplicate: true,
    hideAPIURL: true,
    listSearchableFields: ['email', 'firstName', 'lastName'],
    group: {
      en: 'Users',
      de: 'Benutzer',
    },
  },
  access: {
    create: () => true,
    delete: () => true,
    update: () => true,
    read: () => true,
    unlock: () => true,
  },
  fields: [
    {
      type: 'row',
      fields: [{
        name: 'firstName',
        label: {
          en: 'First Name',
          de: 'Vorname',
        },
        type: 'text',
      },
        {
          name: 'lastName',
          label: {
            en: 'Last Name',
            de: 'Nachname',
          },
          type: 'text',
        },]
    },
    {
      name: 'loginMethod',
      type: 'select',
      access: {
        create: () => false,
        update: () => false,
      },
      options: [
        {
          label: 'Email & Password',
          value: 'emailAndPassword',
        },
        {
          label: 'Google',
          value: 'google',
        },
        {
          label: 'Apple',
          value: 'apple',
        },
      ],
      defaultValue: 'emailAndPassword',
    },
  ],
  hooks: {
    beforeOperation: [disableVerificationEmailOnSSO, disableChangeEmailOnSSO],
    beforeLogin: [validateLoginMethod],
  }
}

export default Users;
