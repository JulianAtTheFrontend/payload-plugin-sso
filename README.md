# Payload Plugin SSO

This is not a plugin you can install directly into your project. Rather copy the files you need and make adjustments. 

It is a fork of the [payload-plugin-oauth](https://github.com/thgh/payload-plugin-oauth) with some adjustments, e.g. to also enable Apple auth.
This plugin is using webpack as a bundler so if you'd like to use Vite you will need to do some changes.

## How to use
Right now the plugin is configured for Google and Apple. You can add more providers, just make sure to add the correct arity (there are some comments in the code to further explain this).
This plugin is used for (external) users to authenticate. If you want admin users to login you might want to add some SSO Buttons to your admin login page.

## How it's working
- a user will be authorized either by a native app or passport-oauth2
- upon success a new user will be created, or an existing user will be used
- a new dynamic password will be generated and saved to the db on every login
- the user will be logged in and redirected to your app url

## Some notes
This plugin uses Payloads Local API to login users. This will make it easy for you to use hooks and other customizations. Please double check if this can be a security issue in you case. An alternative would be create and send a cookie directly (but comes with some disadvantages.)
