import path from 'path'

import { payloadCloud } from '@payloadcms/plugin-cloud'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { webpackBundler } from '@payloadcms/bundler-webpack'
import { slateEditor } from '@payloadcms/richtext-slate'
import { buildConfig } from 'payload/config'

import Users from './collections/Users'
import {ssoPlugin} from "./plugins/ssoPlugin";

export default buildConfig({
  serverURL: process.env.APP_URL,
  csrf: [
    'PUT YOUR DOMAINS HERE TO ALLOW COOKIES TO BE SET',
  ],
  admin: {
    user: Users.slug,
    bundler: webpackBundler(),
  },
  editor: slateEditor({}),
  collections: [Users],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  plugins: [
    // apple
    ssoPlugin({
      strategy: 'apple',
      addNativeEndpoint: true,
      arity: 6, // req, accessToken, refreshToken, profile, params, cb
      responseMode: 'form_post',
      authCollection: 'users',
      clientID: process.env.APPLE_CLIENT_ID,
      clientSecret: null,
      teamID: process.env.APPLE_TEAM_ID,
      privateKeyLocation: './src/plugins/keys/AppleAuthKey.p8',
      keyIdentifier: process.env.APPLE_KEY_ID,
      authorizationURL: process.env.APPLE_AUTH_URL,
      tokenURL: process.env.APPLE_TOKEN_URL,
      callbackURL: process.env.APPLE_CALLBACK_URL,
      scope: ["name", "email"],
      passReqToCallback: true,
    }),
    // google
    ssoPlugin({
      strategy: 'google',
      addNativeEndpoint: false,
      arity: 4, // accessToken, refreshToken, profile, cb
      authCollection: 'users',
      clientID: process.env.GOOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorizationURL: process.env.GOOGLE_AUTH_URL,
      tokenURL: process.env.GOOGLE_TOKEN_URL,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    }),
  ],
  db: mongooseAdapter({ url: process.env.MONGODB_URI }),
})
