/**
 * Learn sections:
 * https://www.developer.saxo/openapi/learn/oauth-certificate-based-authentication
 * https://www.developer.saxo/openapi/learn/managing-certificates-in-myaccount
*/

/**
 * The PEM file is created using OpenSSL:
 * openssl pkcs12 -in DOWNLOADED-CERTIFICATE.p12 -out private-key-with-cert.pem -clcerts -nodes -passin pass:CERTIFICATE-PASSWORD-RECEIVED-WHEN-DOWNLOADING
 *
 * Make sure this file cannot be downloaded via the internet!
 * Don't store it in a folder accessible from outside, or include the contents in your code.
 */

const { readFileSync } = require('fs');
const { sign } = require('jsonwebtoken');
require("dotenv").config();

// Change your .env file so it has your information
const appKey = process.env.AppKey;
const appSecret = process.env.AppSecret;
const tokenUrl = process.env.TokenUrl;
const userId = process.env.UserId;
const serviceProviderUrl = process.env.ServiceProviderUrl; // On https://www.developer.saxo/openapi/appmanagement this can be found under the application redirect URL.
const certificatePath = process.env.CertificatePath;
const thumbprint = process.env.Thumbprint; // Thumbprint of X509 certificate used for signing JWT.
const algorithm = "RS256"; // Algorithm used to sign JWT. We only support RS256 at the moment.

let unpackedResponse = {};

/**
 * Create and sign the assertion.
 * @return {string} The assertion.
 */
const getAssertion = () => {
    console.log("Creating Assertion...")

    const payload = {
        spurl: serviceProviderUrl
    };

    const options = {
        header: {
        x5t: thumbprint
        },
        algorithm: algorithm,
        issuer: appKey,
        expiresIn: '3 seconds', // Lifetime of assertion - keep this short, the token is generated directly afterwards.
        subject: userId,
        audience: tokenUrl
    };

    // The generated assertion/jwt can be validated using https://jwt.io
    // More info about using jsonwebtoken: https://github.com/auth0/node-jsonwebtoken
    const privateKey = readFileSync(certificatePath);
    const assertion = sign(payload, privateKey, options);
    console.log("UserId: " + userId);
    console.log("AppKey: " + appKey);
    console.log("ServiceProviderUrl: " + serviceProviderUrl);
    console.log("ThumbPrint: " + thumbprint);
    console.log("\nAssertion created:\n" + assertion);
    return assertion;
}

/**
 * Get tokens with retry logic
 * @param {number} retries - Number of retry attempts
 * @return {object}
 */
const getTokens = async (retries = 3) => {
    const assertion = getAssertion();
    const requestBody = new URLSearchParams({
        grant_type: "urn:saxobank:oauth:grant-type:personal-jwt",
        assertion: assertion,
    });

    return await retryRequest(() => tokenRequest(requestBody), retries);
};

/**
 * Renew tokens with retry logic
 * @param {number} retries - Number of retry attempts
 * @return {object}
 */
const renewTokens = async (retries = 3) => {
    const requestBody = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: unpackedResponse.refresh_token,
    });

    return await retryRequest(() => tokenRequest(requestBody), retries);
};

/**
 * Request tokens
 * @param {URLSearchParams} requestBody
 * @return {object}
 */
const tokenRequest = async (requestBody) => {
    const basicToken = btoa(appKey + ":" + appSecret);

    const response = await fetch(tokenUrl, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basicToken}`,
        },
        method: "POST",
        body: requestBody,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
};

/**
 * Retry logic with exponential back-off for requests
 * @param {Function} functionToRetry
 * @param {number} retries - Number of retry attempts
 * @return {object}
 */
const retryRequest = async (functionToRetry, retries) => {
    let attempt = 0;
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (attempt < retries) {
        try {
            return await functionToRetry();
        } catch (error) {
            attempt++;
            if (attempt >= retries || !shouldRetry(error)) {
                throw new Error(`Failed after ${retries} attempts: ${error.message}`);
            }
            const backoffTime = Math.pow(2, attempt) * 100; // Exponential back-off
            await delay(backoffTime);
        }
    }
};

/**
 * Determine if the request should be retried based on the error
 * @param {Error} error - The error thrown
 * @return {boolean}
 */
const shouldRetry = (error) => {
    // Retry on network errors (status 5xx) but not on client errors (status 4xx)
    if (error.message.includes('HTTP error! status:')) {
        const statusCode = parseInt(error.message.split(': ')[1], 10);
        return statusCode >= 500 && statusCode < 600;
    }
    return false;
};

const apiUrl = "https://gateway.saxobank.com/sim/openapi"; // On production, this is "https://gateway.saxobank.com/openapi"

/**
 * Request something from the API, to prove the received token is valid.
 * @param {string} endpoint The endpoint to call
 * @return {object}
 */
async function SendGetRequest(endpoint) {
    const response = await fetch (
        apiUrl + endpoint,
        {
            headers: {
                Authorization: "Bearer " + unpackedResponse.access_token,
            },
            method: "GET",
        }
    );

    if (response.ok) {
        const responseJson = await response.json();
        return responseJson;
    } else {
        const responseText = await response.text();
        console.log("Error getting response.\n\n" + responseText);
        console.log(response);
    }
}

async function run() {
    console.log("Requesting tokens...");
    unpackedResponse = await getTokens();
    console.log("\nResponse:");
    console.log(unpackedResponse);
    
    console.log("\nRequesting exchanges...");
    const exchanges = await SendGetRequest("/ref/v1/exchanges");
    exchanges.Data = exchanges.Data.slice(0,3);
    console.log("Response - showing first 3:");
    console.log(exchanges);
    
    console.log("\nRenewing tokens...");
    unpackedResponse = await renewTokens();
    console.log("Response:");
    console.log(unpackedResponse);
    
    console.log("\nRequesting currencies...");
    const Currencies = (await SendGetRequest("/ref/v1/currencies"));
    Currencies.Data = Currencies.Data.slice(0,3);
    console.log("Response - showing first 3:");
    console.log(Currencies);
}
  
run().catch(console.error);
