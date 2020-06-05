/*
Learn sections:
https://www.developer.saxo/openapi/learn/oauth-certificate-based-authentication
https://www.developer.saxo/openapi/learn/managing-certificates-in-myaccount
*/

// Change the configuration so all 5 constants contain your data:
const userId = "1234";  // This is the user who has created the certificate (in Chrome!)
const appKey = "Your app key";  // The appKey of the app which is entitled to authenticate via a certificate
const appSecret = "Your app secret";
const serviceProviderUrl = "Your unique identifier";  // This is the unique identifier of the app, not per se an URL
// The certificate thumbprint (aka fingerprint) can be found in the "Manage Computer Certificates" app, under Personal/Certificates/Saxo Bank Client Certificate: details
//  (after installing the p12 certificate, which is not required for this example).
const certThumbPrint = "Fingerprint of your certificate";

const authProviderUrl = "https://sim.logonvalidation.net/token";  // On production, this will be "https://live.logonvalidation.net/token"
const apiUrl = "https://gateway.saxobank.com/sim/openapi";  // On production, this is "https://gateway.saxobank.com/openapi"

const fs = require("fs");  // Used to load the certificate file
const jwt = require("jsonwebtoken");  // A library used for signing the token
const fetch = require("node-fetch");  // Used to request the token and call the API

// The PEM file is created using OpenSSL:
// openssl pkcs12 -in DOWNLOADED-CERTIFICATE.p12 -out private-key-with-cert.pem -clcerts -nodes -passin pass:CERTIFICATE-PASSWORD-RECEIVED-WHEN-DOWNLOADING
const privateKey = fs.readFileSync("private-key-with-cert.pem");

/**
 * Create and sign the assertion.
 * @return {string} The signed JWT.
 */
function createJwt() {
    const payload = {
        "spurl": serviceProviderUrl  // On https://www.developer.saxo/openapi/appmanagement this can be found under the application redirect URL
    };
    const options = {
        "header": {
            "x5t": certThumbPrint
        },
        "algorithm": "RS256",
        "issuer": appKey,
        "expiresIn": "1 minute",  // Lifetime of assertion - keep this short, the token is generated directly afterwards
        "subject": userId,
        "audience": authProviderUrl
    };
    // The generated assertion/jwt can be validated using https://jwt.io
    // More info about using jsonwebtoken: https://github.com/auth0/node-jsonwebtoken
    const assertion = jwt.sign(payload, privateKey, options);
    console.log("Private key used to sign the JWT:\n" + privateKey);
    console.log("Assertion has been created:\n" + assertion);
    return assertion;
}

/**
 * Request a token using the JWT.
 * @param {string} assertion The signed JWT.
 * @param {Function} successCallback Do something with the token.
 * @return {void}
 */
function requestToken(assertion, successCallback) {
    const postData = new URLSearchParams();
    postData.append("assertion", assertion);
    postData.append("grant_type", "urn:saxobank:oauth:grant-type:personal-jwt");

    // The client_id and client_secret can be submitted as postData (see below), but this example uses the Authorization header:
    //postData.append("client_id", appKey);
    //postData.append("client_secret", appSecret);
    fetch(
        authProviderUrl,
        {
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + Buffer.from(appKey + ":" + appSecret).toString("base64")  // In plain JavaScript: "Basic " + btoa(appKey + ":" + appSecret)
            },
            "method": "POST",
            "body": postData
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                console.log("Token received:\n" + JSON.stringify(responseJson, null, 4));
                successCallback(responseJson);
            });
        } else {
            response.text().then(function (responseText) {
                console.log("Error getting token.\n\n" + responseText);
                console.log(response);
            });
        }
    }).catch(function (error) {
        console.log(error);
    });
}

/**
 * Refresh the token.
 * Should you refresh the token, or just generate a new one?
 * Well, if you generate a new token, you create a new session and the streaming session must be recreated.
 * And if you refresh the token, the session is extended, keeping up the streaming session.
 * So it is recommended to refresh the token.
 * @param {Object} tokenObject The Bearer token object.
 * @return {void}
 */
function requestTokenRefresh(tokenObject) {
    // If you run into a 401 NotAuthenticated, this might be caused by not accepting the terms and conditions.
    // To fix this, you must use this app once with the Authorization Code Flow for your userId and accept the Disclaimer after signing in.
    // You can use this URL, replacing the appKey with yours (add a new redirect URL http://127.0.0.1/):
    // https://sim.logonvalidation.net/authorize?client_id= + appKey + &response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%2F
    const postData = new URLSearchParams();
    postData.append("refresh_token", tokenObject.refresh_token);
    postData.append("grant_type", "refresh_token");

    // The client_id and client_secret can be submitted as postData (see below), but this example uses the Authorization header:
    //postData.append("client_id", appKey);
    //postData.append("client_secret", appSecret);
    fetch(
        authProviderUrl,
        {
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + Buffer.from(appKey + ":" + appSecret).toString("base64")  // In plain JavaScript: "Basic " + btoa(appKey + ":" + appSecret)
            },
            "method": "POST",
            "body": postData
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                console.log("New token received:\n" + JSON.stringify(responseJson, null, 4));
                // Now you might want to refresh the websocket connections with the new token...
            });
        } else {
            response.text().then(function (responseText) {
                console.log("Error refreshing token.\n\n" + responseText);
                console.log(response);
            });
        }
    }).catch(function (error) {
        console.log(error);
    });
}

/**
 * Request something from the API, to prove the received token is valid.
 * @param {Object} tokenObject The Bearer token object.
 * @return {void}
 */
function requestApiData(tokenObject) {
    fetch(
        // The examples on Github (https://saxobank.github.io/openapi-samples-js/) are intended for individual logins.
        // This flow is intended for maintaining multiple customers, so it is recommended to explicitly specify clientKeys, accountKeys, etc.
        // Get all users: apiUrl + "/port/v1/users?$inlinecount=AllPages&ClientKey={ClientKey}&IncludeSubUsers=true",
        apiUrl + "/ref/v1/exchanges",
        {
            "headers": {
                "Authorization": "Bearer " + tokenObject.access_token
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                console.log("Response from API received (" + responseJson.Data.length + " exchanges)");
                // For demonstration purposes, we'll refresh the token..
                requestTokenRefresh(tokenObject);
            });
        } else {
            response.text().then(function (responseText) {
                console.log("Error getting response.\n\n" + responseText);
                console.log(response);
            });
        }
    }).catch(function (error) {
        console.log(error);
    });
}

// Create the JWT token:
const assertion = createJwt();
// Request the Bearer token and if successfull, use it to call the API:
requestToken(assertion, requestApiData);
