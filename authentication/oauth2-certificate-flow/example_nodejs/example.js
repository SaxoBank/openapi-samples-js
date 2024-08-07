/**
 * Learn sections:
 * https://www.developer.saxo/openapi/learn/oauth-certificate-based-authentication
 * https://www.developer.saxo/openapi/learn/managing-certificates-in-myaccount
 */

const apiUrl = "https://gateway.saxobank.com/sim/openapi"; // On production, this is "https://gateway.saxobank.com/openapi"

import "dotenv/config";
import { readFileSync } from "fs"; // Used to load the certificate file
import jsonwebtoken from "jsonwebtoken"; // A library used for signing the token
import fetch from "node-fetch"; // Used to request the token and call the API

/**
 * The PEM file is created using OpenSSL:
 * openssl pkcs12 -in DOWNLOADED-CERTIFICATE.p12 -out private-key-with-cert.pem -clcerts -nodes -passin pass:CERTIFICATE-PASSWORD-RECEIVED-WHEN-DOWNLOADING
 *
 * Make sure this file cannot be downloaded via internet!
 * Store it in a folder not accessible from outside, or include the contents in your javascript.
 */
const privateKeyFile = "private-key-with-cert.pem";

/**
 * Create and sign the assertion.
 * @return {string} The signed JWT.
 */
function createJwtAssertion() {
  const x5t = process.env.Thumbprint;
  const issuer = process.env.AppKey;
  const subject = process.env.UserId;
  const audience = process.env.TokenUrl;
  const spurl = process.env.ServiceProviderUrl;
  const expiresIn = 3;

  const payload = {
    spurl, // This is a unique value provided by Saxo during the application registration process
  };
  const privateKey = readFileSync(privateKeyFile);
  const options = {
    header: {
      x5t, // Thumbprint of X509 certificate used for signing JWT.
    },
    algorithm: "RS256", // Algorithm used to sign JWT. We only support RS256.
    issuer, // Value should be AppKey of client application.
    expiresIn, // Lifetime of assertion - keep this short, the token is generated directly afterwards.
    subject, // UserId - Value should be the user id for which token is needed.
    audience, // Audience - Value should be the AuthenticationUrl.
  };

  // The generated assertion/jwt can be validated using https://jwt.io
  // More info about using jsonwebtoken: https://github.com/auth0/node-jsonwebtoken
  const assertion = jsonwebtoken.sign(payload, privateKey, options);

  console.log("AppKey used: " + process.env.AppKey);
  console.log("Assertion has been created:\n" + assertion);
  return assertion;
}

/**
 * Request a token using the JWT.
 * @param {string} assertion The signed JWT.
 * @return {Promise}
 */
async function requestToken(assertion) {
  // If you run into a 401 NotAuthenticated, this might be caused by not accepting the terms and conditions.
  // To fix this, you must use this app once with the Authorization Code Flow for your userId and accept the Disclaimer after signing in.
  // You can use this URL, replacing the appKey with yours (add a new redirect URL http://127.0.0.1/):
  // https://sim.logonvalidation.net/authorize?client_id= + process.env.AppKey + &response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%2F
  const postData = new URLSearchParams();
  postData.append("assertion", assertion);
  postData.append("grant_type", "urn:saxobank:oauth:grant-type:personal-jwt");

  // The client_id and client_secret can be submitted as postData (see below), but this example uses the Authorization header:
  //postData.append("client_id", process.env.AppKey);
  //postData.append("client_secret", process.env.AppSecret);
  const response = await fetch(process.env.TokenUrl, {
    headers: getRequestHeaders(),
    method: "POST",
    body: postData,
  });

  if (response.ok) {
    const responseJson = await response.json();
    return responseJson;
  } else {
    console.log(response);
    console.log("Response headers:");
    console.log(response.headers.raw());
    console.log(
      "Error getting token: " + response.status + " " + response.statusText
    );
    const responseText = await response.text();
    console.log(responseText);
  }
}

/**
 * Refresh the token.
 * Should you refresh the token, or just generate a new one?
 * Well, if you generate a new token, you create a new session and the streaming session must be recreated.
 * And if you refresh the token, the session is extended, keeping up the streaming session.
 * So it is recommended to refresh the token.
 * @param {Object} tokenObject The Bearer token object.
 * @return {Promise}
 */
async function requestTokenRefresh(tokenObject) {
  const postData = new URLSearchParams();
  postData.append("refresh_token", tokenObject.refresh_token);
  postData.append("grant_type", "refresh_token");

  // The client_id and client_secret can be submitted as postData (see below), but this example uses the Authorization header:
  //postData.append("client_id", process.env.AppKey);
  //postData.append("client_secret", process.env.AppSecret);
  const response = await fetch(process.env.TokenUrl, {
    headers: getRequestHeaders(),
    method: "POST",
    body: postData,
  });
  if (response.ok) {
    const responseJson = await response.json();
    console.log(
      "New token received:\n" + JSON.stringify(responseJson, null, 4)
    );
    // Now you might want to refresh the websocket connections with the new token...
  } else {
    const responseText = await response.text();
    console.log("Error refreshing token.\n\n" + responseText);
    console.log(response);
  }
}

function getRequestHeaders() {
  const buffer = Buffer.from(process.env.AppKey + ":" + process.env.AppSecret);
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: "Basic " + buffer.toString("base64"),
  };
}

/**
 * Request something from the API, to prove the received token is valid.
 * @param {Object} tokenObject The Bearer token object.
 * @return {Promise}
 */
async function requestExchanges(tokenObject) {
  const response = await fetch(
    // The examples on Github (https://saxobank.github.io/openapi-samples-js/) are intended for individual logins.
    // This flow is intended for maintaining multiple customers, so it is recommended to explicitly specify clientKeys, accountKeys, etc.
    // Get all users: apiUrl + "/port/v1/users?ClientKey={ClientKey}&IncludeSubUsers=true",
    apiUrl + "/ref/v1/exchanges",
    {
      headers: {
        Authorization: "Bearer " + tokenObject.access_token,
      },
      method: "GET",
    }
  );

  if (response.ok) {
    const responseJson = await response.json();
    return responseJson;
  } else {
    const responseText = response.text();
    console.log("Error getting response.\n\n" + responseText);
    console.log(response);
  }
}

// Create the JWT token:
const jwtAssertion = createJwtAssertion();

// Request the Bearer token
const cbaResponse = await requestToken(jwtAssertion);
console.log("Token received:\n" + JSON.stringify(cbaResponse, null, 2));

// If successful, use the token to call the API
if (cbaResponse) {

  const exchanges = await requestExchanges(cbaResponse);
  console.log(exchanges)

  // For demonstration purposes, we'll refresh the token immediately after use.
  // In production, you should only refresh the token shortly before it expires.
  const refreshResponse =  await requestTokenRefresh(tokenObject);
  console.log("Refresh of token:\n" + JSON.stringify(refreshResponse, null, 2));
}
