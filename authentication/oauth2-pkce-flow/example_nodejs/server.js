const { createServer } = require("http");
const { parse } = require("url");
const { randomBytes, createHash } = require("crypto");

const appKey = "73a8b487c3de4e42a03ed9177b5bb609";
const redirectUrl = `http://localhost:3000/authorize`;
const authorizationUrl = "https://sim.logonvalidation.net/authorize";
const tokenUrl = "https://sim.logonvalidation.net/token";

const codeVerifier = randomBytes(32).toString("hex");
const codeChallenge = createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

const fullAuthorizationUrl = `${authorizationUrl}?response_type=code&client_id=${appKey}&redirect_uri=${redirectUrl}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

let unpackedResponse = {};

const server = createServer(async (req, res) => {
  const path = parse(req.url, true).pathname;

  if (path === "/") {
    console.log(
      `\nRedirecting to authorization endpoint (${fullAuthorizationUrl}):`
    );
    console.log(unpackedResponse);
    res.writeHead(302, { Location: fullAuthorizationUrl }).end();
  } else if (path === `/${redirectUrl.split("/").pop()}`) {
    try {
      console.log("\nRequesting tokens...");
      unpackedResponse = await getTokens(req);
      console.log("Response:");
      console.log(unpackedResponse);

      console.log("\nRequesting exchanges...");
      const exchanges = await SendGetRequest("/ref/v1/exchanges");
      exchanges.Data = exchanges.Data.slice(0, 3);
      console.log("Response - showing first 3:");
      console.log(exchanges);

      console.log("\nRenewing tokens...");
      unpackedResponse = await renewTokens();
      console.log("Response:");
      console.log(unpackedResponse);

      console.log("\nRequesting currencies...");
      const Currencies = await SendGetRequest("/ref/v1/currencies");
      Currencies.Data = Currencies.Data.slice(0, 3);
      console.log("Response - showing first 3:");
      console.log(Currencies);
    } catch (error) {
      console.log(error);
    }
  }
});

const port = 3000;
server.listen(port, () => {
  console.log("Server is running on port " + port);
});

/**
 * Get tokens with retry logic
 * @param {number} retries - Number of retry attempts
 * @return {object}
 */
const getTokens = async (req, retries = 3) => {
  const query = parse(req.url, true).query;

  const requestBody = new URLSearchParams({
    grant_type: "authorization_code",
    code: query.code,
    redirect_uri: redirectUrl,
    client_id: appKey,
    code_verifier: codeVerifier,
  });

  return await retryRequest(() => tokenRequest(requestBody), retries);
};

/**
 * Renew tokens with retry logic
 * @param {number} retries - Number of retry attempts
 * @return {object}
 */
const renewTokens = async (retries = 3) => {
  let requestBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: unpackedResponse.refresh_token,
    redirect_uri: redirectUrl,
    code_verifier: codeVerifier,
  });

  return await retryRequest(() => tokenRequest(requestBody), retries);
};

/**
 * Request tokens
 * @param {URLSearchParams} requestBody
 * @return {object}
 */
const tokenRequest = async (requestBody) => {
  let response = await fetch(tokenUrl, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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
