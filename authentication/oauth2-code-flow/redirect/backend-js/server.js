const express = require("express");
const morgan = require("morgan");
const path = require("path");
const fetch = require("node-fetch");
const port = process.env.PORT || 1337;

/*
 * appKey: The client identification of your app, supplied by Saxo (Client ID)
 * clientSecret: The secret which gives access to the API (Client Secret)
 * tokenEndpoint: The URL of the authentication provider (https://www.developer.saxo/openapi/learn/environments)
 *
 * IMPORTANT NOTICE:
 * The following credentials give access to SIM, if the redirect URL is http://localhost:1337/ (NodeJs example) and
 * http://localhost/openapi-samples-js/authentication/oauth2-code-flow/redirect/ (PHP example).
 * If you want to use your own redirect URL, you must create your own Code Flow application:
 * https://www.developer.saxo/openapi/appmanagement.
 * And needless to say, when you have an app for Live, be sure you don't publish the credentials on Github!
 *
 */
const configurationObject = {
    "appKey": "faf2acbb48754413a043676b9c2c2bd5",
    "appSecret": "c074e19278f74700b21d66287a30c14e",
    "tokenEndpoint": "https://sim.logonvalidation.net/token"
};

function apiHandler(request, response) {
    const query = request.body;

    function sendResponse(httpStatusCode, responseObject) {
        const responseBody = JSON.stringify(responseObject);
        // Tempting, but don't log outgoing data, because this is sensitive information!
        response.writeHead(httpStatusCode, {"Content-Type": "application/json"});
        response.end(responseBody);
    }

    function returnError(httpStatusCode, errorCode, errorMessage) {
        const responseObject = {
            "Message": errorMessage,
            "ErrorCode": errorCode
        };
        console.error(errorMessage);
        sendResponse(httpStatusCode, responseObject);
    }

    function requestToken() {
        const data = new URLSearchParams();
        // Tempting, but don't log incoming data, because this is sensitive information!
        data.append("client_id", configurationObject.appKey);
        data.append("client_secret", configurationObject.appSecret);
        if (query.code) {
            data.append("grant_type", "authorization_code");
            data.append("code", query.code);
        } else if (query.refresh_token) {
            data.append("grant_type", "refresh_token");
            data.append("refresh_token", query.refresh_token);
        } else {
            returnError(400, "BadRequest", "Invalid query parameters");
            return;
        }
        fetch(
            configurationObject.tokenEndpoint,
            {
                "method": "POST",
                "body": data
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    sendResponse(200, responseJson);
                });
            } else {
                returnError(response.status, "Unauthorized", response.statusText);
            }
        }).catch(function (error) {
            returnError(401, "Unauthorized", error);
        });
    }

    requestToken();
}

// Start Express server
const server = express();
server.use(morgan("combined"));  // The request logger
server.use(express.json());
// The redirect web page runs on http://localhost:1337/index.html
server.use(express.static(path.join(__dirname, "..")));
// The backend is available for POST on http://localhost:1337/server
server.post("/server", apiHandler);
server.listen(port);

console.log("Server listening on port %j", port);

// Handle stop signals
const exitfn = function () {
    process.exit(0);
};
process.on("SIGINT", exitfn);
process.on("SIGTERM", exitfn);
