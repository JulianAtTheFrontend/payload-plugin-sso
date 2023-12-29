// Payload
import payload from "payload";

// Helper
import verifyAppleToken from "verify-apple-id-token";
import crypto from "crypto";
import { sign, decode } from "jsonwebtoken";
import fs from "fs";
import axios from "axios";

// Types
import {SSOPluginOptions, CurrentLoginMethod, ExtendedPayloadRequest, GoogleUserResponse} from "../types";
import { Response } from "express";
import { User } from "payload/generated-types";


/**
 * This function generates a client secret for Single Sign-On (SSO) using the provided options.
 * It signs an empty payload with the private key located at `options.privateKeyLocation` and sets various JWT properties.
 *
 * @returns {string} - This function returns a signed JWT that can be used as a client secret for SSO.
 */
const generateClientSecret = ({ options } : { options: SSOPluginOptions }): string => {
  let privateKey: Buffer;
  try {
    // check if private key file exists
    privateKey = fs.readFileSync(options.privateKeyLocation);
  } catch (error) {
    throw new Error('Private key file could not be read.');
  }

  return sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "1d",
    audience: 'https://appleid.apple.com',
    subject: options.clientID,
    issuer: options.teamID,
    keyid: options.keyIdentifier,
  });
};


/**
 * Asynchronously verifies a user's identity using Single Sign-On (SSO) with Apple's identity token.
 * It first verifies the token, then checks if the user already exists in the database.
 * If the user exists, it logs them in; if not, it registers a new user and then logs them in.
 */
const verifyUser = async ({ req, res } : { req: ExtendedPayloadRequest, res: Response }) => {
  const { email, givenName, familyName, identityToken } = req.body;

  try {
    const jwtClaims = await verifyAppleToken({
      idToken: identityToken,
      clientId: 'YOUR CLIENT ID',
    });

    // is valid
    const userEmail = email || jwtClaims.email;
    const userName = `${givenName} ${familyName}` || 'ANONYM';
    const options = {
      authCollection: 'users',
      strategy: 'apple',
    }

    // @ts-ignore
    const existingUser = await lookupUserByEmail({ options, userEmail });
    if (existingUser) {
      // User exists, login
      req.user = existingUser;
    } else {
      // User does not exist, register
      // @ts-ignore
      req.user = await registerNewUserWithSSO({options, userEmail, userName, loginMethod: options.strategy});
    }
    // @ts-ignore
    await loginWithSSO({ req, res, loginMethod: options.strategy, collection: options.authCollection, redirect: false });

  } catch (error) {
    // Failed authentication, redirect to login page.
    res.redirect(`${process.env.APP_CLIENT_URL}?error=true`);
  }
}


/**
 * This function is used to log in a user with Single Sign-On (SSO).
 * It sets the current login method to prevent logging in with correct credentials but a different method.
 * It then attempts to log in using the local API.
 *
 * @returns {Promise<void>} - This function returns a promise that resolves to void. It has no return value because it's used for its side effects (logging in a user).
 * @throws {Error} - This function will throw an error if the login attempt fails.
 *
 * **CAUTION**: This function logs in a user with a random password generated by the `useClientSecretGenerator` function which is stored in the database.
 * Depending on your use case, you may want to change this behaviour.
 */
const loginWithSSO = async ({ req, res, loginMethod, collection, redirect } : { req: ExtendedPayloadRequest, res: Response, loginMethod: CurrentLoginMethod, collection: 'users', redirect: boolean }): Promise<void> => {
  try {
    // Set current login method to prevent logging in with correct credentials but different method
    req.currentLoginMethod = loginMethod;

    // Get dynamic password from user object
    const dynamicPassword = req.user.newDynamicPassword;
    // Logging in with local API
    await payload.login({
      req,
      res,
      collection, // should be 'users' for users-collection
      overrideAccess: false,
      data: {
        email: req.user.email,
        password: dynamicPassword
      },
    });

    if (redirect) {
      // Successful authentication, redirect home.
      res.redirect(process.env.APP_CLIENT_URL);
    } else {
      res.status(200).json({ message: 'Authentication successful' });
    }

  } catch (error: any) {
    if (redirect) {
      // Failed authentication, redirect to login page.
      res.redirect(`${process.env.APP_CLIENT_URL}?error=true`);
    } else {
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
}


/**
 * This function is used to look up a user by their email address.
 * It queries the specified collection for a user with the provided email address and returns the first match.
 *
 * @returns {Promise<User | undefined>} - This function returns a promise that resolves to the first user found with the provided email address, or undefined if no user is found.
 *
 * **CAUTION**: This function returns all fields of the user document, including hidden ones. Be careful not to expose sensitive information.
 */
const lookupUserByEmail = async ({ options, userEmail } : { options: SSOPluginOptions, userEmail: string }): Promise<User | undefined> => {
  // lookup user by email
  const users = await payload.find({
    collection: options.authCollection,
    showHiddenFields: true,
    where: {
      email: {
        equals: userEmail
      }
    },
  })

  const user = users?.docs[0];
  if (user) {

    // Create new dynamic password
    const newDynamicPassword = generateDynamicPassword(userEmail);

    // Update user with new dynamic password
    await payload.update({
      overrideAccess: true,
      id: user.id,
      collection: options.authCollection,
      data: {
        password: newDynamicPassword,
      },
    });

    // Add new dynamic password to user object
    // @ts-ignore
    user.newDynamicPassword = newDynamicPassword;

    // Results will be one as multiple users with same email is not allowed
    return user
  }
  // return null if no user exists with this email
  // a new user will be created after this
  return null;
}


/**
 * This function generates a dynamic password using the user's email and a random string.
 *
 * This function uses the HMAC-SHA256 algorithm to generate a dynamic password.
 * The HMAC key is the user's email and the message is a random string.
 * The output is a hexadecimal string.
 *
 * @returns {string} The dynamic password.
 */
const generateDynamicPassword = (email:string): string => {
  // Use the user's email and a random string to generate a dynamic password
  return crypto.createHmac('sha256', email)
    .update(crypto.randomBytes(16).toString('hex'))
    .digest('hex');
}

/**
 * This function is used to register a new user with Single Sign-On (SSO).
 * It generates a random password, registers the new user via the Local API, and automatically verifies the user's email.
 *
 * @returns {Promise<User>} - This function returns a promise that resolves to the newly registered user.
 * @throws {Error} - This function will throw an error if the user registration or email verification update fails.
 */
const registerNewUserWithSSO = async ({ options, userEmail, userName, loginMethod } : { options: SSOPluginOptions, userEmail: string, userName: string, loginMethod: CurrentLoginMethod }): Promise<User> => {
  // Creates a new user on first signup

  // Generate a dynamic password
  const newDynamicPassword = generateDynamicPassword(userEmail);

  let registered: User;
  try {
    // Register new user via Local API
    registered = await payload.create({
      collection: options.authCollection,
      showHiddenFields: true,
      data: {
        email: userEmail,
        firstName: userName,
        password: newDynamicPassword,
        loginMethod: loginMethod,
        activated: false,
      },
    });
  } catch (error) {
    throw new Error('Failed to register new user.');
  }

  try {
    // A before Operation Hook is called here to disable the sending of a verification email
    // Auto verify email
    await payload.update({
      id: registered.id,
      collection: options.authCollection,
      data: {
        _verified: true,
      },
    });
  } catch (error) {
    throw new Error('Failed to update user verification status.');
  }

  // Add new dynamic password to user object
  // @ts-ignore
  registered.newDynamicPassword = newDynamicPassword;

  return registered;
}


/**
 * This function is used to get user information from Google's OAuth2 API.
 * It sends a GET request to the API with the provided access token and returns the user's name and email.

 * @returns {Promise<Object>} - This function returns a promise that resolves to an object containing the user's name and email.
 * @throws {Error} - This function will throw an error if the API request fails or if the response does not contain the expected user information.
 */
const getUserinfo = async ({ accessToken } : { accessToken: string }): Promise<GoogleUserResponse> => {
  const { data: user } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    params: { access_token: accessToken },
  })
  if (!user) throw new Error('Failed to get userinfo');
  return {
    name: user.name,
    email: user.email,
  }
};


/**
 * This function is used to handle the authentication strategy for Single Sign-On (SSO) with either Apple or Google.
 * It retrieves the user's email and name, checks if the user already exists in the database, and either logs in the existing user or registers a new user.
 *
 * @returns {Promise<void>} - This function does not return a value. It calls the callback function with the result of the operation.
 */
const handleSSOStrategy = async ({ options, req, profile, accessToken, cb} : { options: SSOPluginOptions, req?: any, profile: any, accessToken: string, cb: any}): Promise<void> => {
  try {
    let userEmail = '';
    let userName = '';

    if (options.strategy === 'apple') {
      let user = {} as any;
      if (req?.body?.user) user = JSON.parse(req.body.user);
      const decoded = decode(profile?.id_token) as any;
      userEmail = user?.email || decoded.email;
      userName = `${user?.name?.firstName} ${user?.name?.lastName}` || 'ANONYM';
    }

    if (options.strategy === 'google') {
      const user = await getUserinfo({ accessToken });
      userEmail = user?.email;
      userName = user?.name || 'ANONYM';
    }

    const existingUser = await lookupUserByEmail({options, userEmail});
    if (existingUser) {
      // User exists, login
      cb(null, existingUser)
      return
    } else {
      // User does not exist, register
      const registeredUser = await registerNewUserWithSSO({options, userEmail, userName, loginMethod: options.strategy});
      cb(null, registeredUser)
    }
  } catch (error: any) {
    // will cause the failureRedirect to be called
    cb(null, false);
  }


}

export { handleSSOStrategy, verifyUser, getUserinfo, generateClientSecret, lookupUserByEmail, registerNewUserWithSSO, loginWithSSO };