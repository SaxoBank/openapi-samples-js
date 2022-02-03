# Sample for authentication using Certificate Based Authentication

The Certificate Based Authentication (CBA) flow is suitable for server-to-server integrations where authentication must to be done without human intervention.

JSON Web Token (JWT) is used to securely transmit information between the application and Saxobank.

> **_NOTE:_** The CBA flow is not available for most apps. You need to contact SaxoBank to apply for approval.

In order to keep secrets private, JavaScript is not a good language for this flow, since everything is available via the browser.
However, there is a [NodeJs sample](https://github.com/SaxoBank/openapi-samples-js/tree/master/authentication/oauth2-certificate-flow/example_nodejs) and [one for PHP](https://github.com/SaxoBank/openapi-samples-js/tree/master/authentication/oauth2-certificate-flow/example_php).

A tutorial on this grant type: https://www.developer.saxo/openapi/learn/oauth-certificate-based-authentication

Steps:
1. You already have an account on SIM. With the CBA you'll sign in with this account.
2. Sign in on [SaxoTraderGO on SIM](https://www.saxotrader.com/sim/d/myAccount) to get a certificate. There is a [manual for this](https://www.developer.saxo/openapi/learn/managing-certificates-in-myaccount).  Saxo cannot do this for you, the certificate is confidential.
3. [Create an app](https://www.developer.saxo/openapi/appmanagement) dedicated for this purpose. Use the Grant Type "Code". The Redirect URL can be any URL, but try to make it unique. If it is not unique, Saxo will create a unique URL for you.
4. Ask Saxo to give your app CBA privileges. For this, Saxo needs your ClientId and AppKey.
5. Once your app has CBA privileges, your good to go. See the Github for a [NodeJs](https://github.com/SaxoBank/openapi-samples-js/tree/master/authentication/oauth2-certificate-flow/example_nodejs) and [C#](https://github.com/SaxoBank/openapi-samples-csharp/tree/master/authentication/Authentication_Cba) sample.