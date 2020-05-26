# Sample for authentication using Certificate Based Authentication

The Certificate Based Authentication flow is suitable for server-to-server integrations where authentication must to be done without human intervention.
JSON Web Token (JWT) is used to securely transmit information between the application and Saxobank.

In order to keep secrets private, JavaScript is not a good language for this flow, since everything is available via the browser. However, there is a NodeJs sample, availabe here: https://github.com/SaxoBank/openapi-samples-js/tree/master/authentication/oauth2-certificate-flow/example_nodejs

A tutorial on this grant type: https://www.developer.saxo/openapi/learn/oauth-certificate-based-authentication
