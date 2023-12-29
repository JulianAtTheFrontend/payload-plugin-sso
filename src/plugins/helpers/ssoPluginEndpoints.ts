import {Config, Endpoint} from "payload/config";

// Passport
import passport from 'passport'
import session from "express-session";
import MongoStore from 'connect-mongo';

// Helpers
import { loginWithSSO, verifyUser } from "./ssoAuthentication";
import crypto from "crypto";

// Types
import type { SSOPluginOptions, ExtendedPayloadRequest } from "../types";

const getUpdatedEndpoints = ({ incoming, options } : { incoming: Config, options: SSOPluginOptions }) => {


  /**
   * This endpoint handles the session for the SSO strategy.
   * It uses the express-session middleware to manage session state.
   */
  const sessionEndpoint: Endpoint = {
    path: `/${options.strategy}/*`,
    method: options.responseMode === 'form_post' ? 'post' : 'get',
    root: true,
    handler: async (req, res, next) => {
      const store = await MongoStore.create({ mongoUrl: process.env.MONGODB_URI });
      return session({
        resave: false,
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
        store,
      })(req, res, next);
    },
  };

  /**
   * This endpoint initiates the authentication process for the SSO strategy.
   * It redirects the user to the SSO provider's login page.
   */
  const authorizeEndpoint: Endpoint = {
    path: `/${options.strategy}/authorize`,
    method: 'get',
    root: true,
    handler: passport.authenticate(options.strategy, {
      state: crypto.randomBytes(5).toString('hex'),
      ...(options.responseMode && { response_mode: options.responseMode })
    }),
  };

  /**
   * This endpoint handles the callback from the SSO provider.
   * It authenticates the user and redirects them to the login page if authentication fails.
   */
  const callbackEndpoint: Endpoint = {
    path: `/${options.strategy}/callback`,
    method: options.responseMode === 'form_post' ? 'post' : 'get',
    root: true,
    handler: passport.authenticate(options.strategy, {
      failureRedirect: `${process.env.APP_CLIENT_URL}?error=true`,
    })
  };

  /**
   * This endpoint handles the SSO login.
   * It uses the useLoginWithSSO function to log the user in.
   */
  const ssoLoginEndpoint: Endpoint = {
    path: `/${options.strategy}/callback`,
    method: options.responseMode === 'form_post' ? 'post' : 'get',
    root: true,
    async handler(req: ExtendedPayloadRequest, res) {
      await loginWithSSO({ req, res, loginMethod: options.strategy, collection: options.authCollection, redirect: true });
    },
  };

  const oldEndpoints = incoming?.endpoints || [];
  let newEndpoints = [sessionEndpoint, authorizeEndpoint, callbackEndpoint, ssoLoginEndpoint];

  /**
   * This endpoint receives the response object from the native app,
   * verifies the identity token, and either creates a new user or logs in with the existing user.
   */
  if (options.addNativeEndpoint) {
    const nativeAppleSignInEndpoint: Endpoint = {
      path: `/${options.strategy}/native-sign-in`,
      method: 'post',
      root: true,
      async handler(req: ExtendedPayloadRequest, res) {
        await verifyUser({ req, res });
      },
    };
    newEndpoints = [...newEndpoints, nativeAppleSignInEndpoint];
  }

  return oldEndpoints.concat(newEndpoints);
}

export { getUpdatedEndpoints };
