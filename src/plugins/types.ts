import {PayloadRequest, SanitizedCollectionConfig} from 'payload/types'
import type {StrategyOptions} from "passport-oauth2";

export type CurrentLoginMethod = 'apple' | 'google' | 'emailAndPassword';

export interface ExtendedPayloadRequest<T = any> extends PayloadRequest<T> {
  currentLoginMethod: CurrentLoginMethod
}

export interface RequestContext {
  [key: string]: unknown;
}

export type BeforeLoginHookWithExtendedReq<T> = (args: {
  collection: SanitizedCollectionConfig;
  context: RequestContext;
  req: ExtendedPayloadRequest<T>; // Replace PayloadRequest with ExtendedPayloadRequest
  user: T;
}) => any;

export interface SSOPluginOptions extends StrategyOptions {
  arity: number,
  addNativeEndpoint: boolean,
  responseMode?: string,
  strategy: CurrentLoginMethod,
  authCollection: 'users',
  callbackPath?: string
  callbackURL: string
  clientID: string
  clientSecret?: string
  teamID?: string
  keyIdentifier?: string
  privateKeyLocation?: string
  passReqToCallback?: boolean
  authorizationURL: string
  tokenURL: string
  scope: Array<string>
}

export type GoogleUserResponse = {
  name: string;
  email: string;
};
