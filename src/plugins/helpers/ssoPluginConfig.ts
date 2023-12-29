import {Config} from "payload/config";

/**
 * This function is used to configure the server-side settings.
 *
 * @param {Config} incoming - The incoming configuration.
 * @returns {Object} - The server-side configuration.
 */
const getServerSideConfig = (incoming: Config): object => {
  return {
    ...incoming.admin,
    webpack: (webpackConfig: any) => {
      const config = incoming.admin?.webpack?.(webpackConfig) || webpackConfig
      return {
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...config.resolve?.alias,
            axios: false,
            'passport-oauth2': false,
            'connect-mongo': false,
            'express-session': false,
            'fs': false,
            'jsonwebtoken': false,
            passport: false,
          },
        },
      }
    },
  }
};


/**
 * This function is used to configure the client-side settings.
 *
 * @param {Config} incoming - The incoming configuration.
 * @returns {Object} - The client-side configuration.
 */
const getClientSideConfig = (incoming: Config): object => {
  return {
    ...incoming.admin,
    components: {
      ...incoming.admin?.components,
    },
  }
}

export { getServerSideConfig, getClientSideConfig };
