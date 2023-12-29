// Payload
import payload from 'payload'
import { Config } from 'payload/config'

// Passport
import OAuth2Strategy, { VerifyCallback } from 'passport-oauth2'
import session from 'express-session'
import passport from 'passport'

// Helpers
import { getUpdatedEndpoints } from './helpers/ssoPluginEndpoints';
import { generateClientSecret, handleSSOStrategy } from "./helpers/ssoAuthentication";
import { getClientSideConfig, getServerSideConfig } from "./helpers/ssoPluginConfig";

// Types
import type {SSOPluginOptions} from './types'

/**
 * This function validates what to run on client/server side and returns the correct config.
 */
const ssoPlugin = (options: SSOPluginOptions) => (incoming: Config): Config => {
  return typeof session !== 'function'
    ? ssoPluginClient(incoming, options)
    : ssoPluginServer(incoming, options);
}


/**
 * This function returns the (incoming) client side config for the SSO plugin without any changes.
 * Edit the Client Side config if you need changes in the admin panel.
 */
const ssoPluginClient = (incoming: Config, options: SSOPluginOptions): Config => {
  return {
    ...incoming,
    admin: getClientSideConfig(incoming),
  }
}


/**
 * This function inits the passport strategy and returns the server side config for the SSO plugin with the updated endpoints.
 */
const ssoPluginServer = (incoming: Config, options: SSOPluginOptions): Config => {
  if (!options.clientSecret && options.strategy === 'apple') {
    options.clientSecret = generateClientSecret({options});
  }

  // Passport strategy depending on arity
  // passport-oauth2 is running different functions depending on arity and does not support object destructuring
  // you might want to add different strategies for different arities, best practice is to log out all parameters and check which ones were used by your SSO provider
  const strategy = options.arity === 4
  ? new OAuth2Strategy(options, async (accessToken: string, refreshToken: string, profile: {}, cb: VerifyCallback ) => {
      return await handleSSOStrategy({ options, profile, accessToken, cb });
    })
  : new OAuth2Strategy(options, async (req: any, accessToken: string, refreshToken: string, profile: any, params: any, cb: VerifyCallback ) => {
      return await handleSSOStrategy({ options, profile, accessToken, cb });
    })

  passport.use(options.strategy, strategy)
  passport.serializeUser((user: any, done) => {
    done(null, user.id)
  })
  passport.deserializeUser(async (id: string, done) => {
    const ok = await payload.findByID({ collection: options.authCollection, id })
    done(null, ok)
  })

  return {
    ...incoming,
    admin: getServerSideConfig(incoming),
    endpoints: getUpdatedEndpoints({ incoming, options }),
  }
}

export { ssoPlugin };

