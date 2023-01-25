# Sample for logoff

This sample shows how to kill the browser session. Normally there is no use case for this, you just remove the bearer and refresh token.

However, after authentication you might get a question for which user you want to create the session. This is the case when you have multiple account types, for example your personal account, an account with someone else, or a corporate account.

It is not possible to switch between these users. For switching, the pattern is to sign out and sign in again.

Interactive demo: <https://saxobank.github.io/openapi-samples-js/authentication/sign-out/>
