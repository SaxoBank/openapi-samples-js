<?php

/**
 * Learn sections:
 * https://www.developer.saxo/openapi/learn/oauth-certificate-based-authentication
 * https://www.developer.saxo/openapi/learn/managing-certificates-in-myaccount
 */

// Change the configuration so all 5 constants contain your data:
$userId = '1234';  // This is the user who has created the certificate (in Chrome!)
$appKey = 'Your app key';  // The appKey of the app which is entitled to authenticate via a certificate
$appSecret = 'Your app secret';
$serviceProviderUrl = 'Your unique identifier';  // This is the unique identifier of the app, not per se an URL
// The certificate thumbprint (aka fingerprint) can be found in the 'Manage Computer Certificates' app, under Personal/Certificates/Saxo Bank Client Certificate: details
//  (after installing the p12 certificate, which is not required for this example).
$certThumbPrint = 'Fingerprint of your certificate';

$authProviderUrl = 'https://sim.logonvalidation.net/token';  // On production, this will be 'https://live.logonvalidation.net/token'
$apiUrl = 'https://gateway.saxobank.com/sim/openapi';  // On production, this is 'https://gateway.saxobank.com/openapi'

/**
 * The PEM file is created using OpenSSL:
 * openssl pkcs12 -in DOWNLOADED-CERTIFICATE.p12 -out private-key-with-cert.pem.php -clcerts -nodes -passin pass:CERTIFICATE-PASSWORD-RECEIVED-WHEN-DOWNLOADING
 *
 * Make sure this file cannot be downloaded via internet!
 * Store it in a folder not accessible from outside, or use the PHP extension so it cannot be downloaded.
 */
$privateKeyFile = "private-key-with-cert.pem.php";

// Set your return content type
header('Content-Type: text/plain; charset=utf-8');
//header('Content-Type: application/json; charset=utf-8');

require_once('JWT.php');

/**
 * Create and sign the assertion.
 * @return {string} The signed JWT.
 */
function createJwtAssertion() {
    global $authProviderUrl;
    global $privateKeyFile;
    global $userId;
    global $appKey;
    global $appSecret;
    global $serviceProviderUrl;
    global $certThumbPrint;
    $privateKey = file_get_contents($privateKeyFile);
    $header = [
        'x5t' => $certThumbPrint,
        'alg' => 'RS256'
    ];
    $payload = [
        'iss' => $appKey,  // Issuer - Value should be AppKey of client application.
        'sub' => $userId,  // UserId - Value should be the user id for which token is needed.
        'exp' => time() + 3,  // Expiry / Lifetime of assertion - keep this short, the token is generated directly afterwards.
        'aud' => $authProviderUrl,  // Audience - Value should be the AuthenticationUrl.
        'spurl' => $serviceProviderUrl  // AppUrl - On https://www.developer.saxo/openapi/appmanagement this can be found under the application redirect URL.
    ];
    // The generated assertion/jwt can be validated using https://jwt.io
    // More info about using jsonwebtoken: https://github.com/auth0/node-jsonwebtoken
    $assertion = JWT::encode($payload, $privateKey, $header);
    echo 'userId: ' . $userId . "\n";
    echo 'appKey: ' . $appKey . "\n";
    echo 'serviceProviderUrl: ' . $serviceProviderUrl . "\n";
    echo 'certThumbPrint: ' . $certThumbPrint . "\n";
    echo "\nAssertion has been created:\n" . $assertion . "\n";
    return $assertion;
}

/**
 * Request a token using the JWT.
 * @param {string} assertion The signed JWT.
 * @return {Object} The token object, or false when failed.
 */
function requestToken($assertion) {
    // If you run into a 401 NotAuthenticated, this might be caused by not accepting the terms and conditions.
    // To fix this, you must use this app once with the Authorization Code Flow for your userId and accept the Disclaimer after signing in.
    // You can use this URL, replacing the appKey with yours (add a new redirect URL http://127.0.0.1/):
    // https://sim.logonvalidation.net/authorize?client_id= + appKey + &response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%2F
    global $authProviderUrl;
    global $appKey;
    global $appSecret;
    // Initial request for a token with a code
    $data = [
        'assertion' => $assertion,
        'grant_type' => 'urn:saxobank:oauth:grant-type:personal-jwt',
        'client_id' => $appKey,
        'client_secret' => $appSecret
    ];
    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data),
            'ignore_errors' => false
        ],
        'ssl' => [
            // This Mozilla CA certificate store is downloaded from:
            // https://curl.haxx.se/docs/caextract.html
            // This bundle was generated at Tue Apr 26 03:12:05 2022 GMT.
            'cafile' => 'cacert-2022-04-26.pem',
            'verify_peer' => true,
            'verify_peer_name' => true
        ]
    ];
    $context = stream_context_create($options);
    // Request the token..
    $result = @file_get_contents($authProviderUrl, false, $context);
    if (!$result) {
        echo "Something bad happened while requesting the token:\n" . error_get_last()['message'];
        return false;
    }
    $result_object = json_decode($result);
    if (json_last_error() == JSON_ERROR_NONE) {
        if (property_exists($result_object, 'error')) {
            echo "Response indicates an error:\n" . $result;
            return false;
        } else {
            echo "\nToken received:\n" . $result;
            return $result_object;
        }
    } else {
        // Something bad happened, no json in response (404 Not Found?)
        echo "Something bad happened while requesting the token:\n" . json_last_error();
        return false;
    }
}

/**
 * Refresh the token.
 * Should you refresh the token, or just generate a new one?
 * Well, if you generate a new token, you create a new session and the streaming session must be recreated.
 * And if you refresh the token, the session is extended, keeping up the streaming session.
 * So it is recommended to refresh the token.
 * @param {string} refreshToken The refresh token.
 * @return {Object} The refreshed token, or false when failed.
 */
function requestTokenRefresh($refreshToken) {
    global $authProviderUrl;
    global $appKey;
    global $appSecret;
    // Subsequential request for a token with a refresh_token
    $data = [
        'refresh_token' => $refreshToken,
        'grant_type' => 'refresh_token',
        'client_id' => $appKey,
        'client_secret' => $appSecret
    ];
    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data),
            'ignore_errors' => false
        ],
        'ssl' => [
            // This Mozilla CA certificate store is downloaded from:
            // https://curl.haxx.se/docs/caextract.html
            // This bundle was generated at Tue Apr 26 03:12:05 2022 GMT.
            'cafile' => 'cacert-2022-04-26.pem',
            'verify_peer' => true,
            'verify_peer_name' => true
        ]
    ];
    $context = stream_context_create($options);
    // Request the token..
    $result = @file_get_contents($authProviderUrl, false, $context);
    if (!$result) {
        echo "Something bad happened while requesting the token:\n" . error_get_last()['message'];
        return false;
    }
    $result_object = json_decode($result);
    if (json_last_error() == JSON_ERROR_NONE) {
        if (property_exists($result_object, 'error')) {
            echo "Response indicates an error:\n" . $result;
            return false;
        } else {
            echo "\nNew token received:\n" . $result;
            return $result_object;
        }
    } else {
        // Something bad happened, no json in response (404 Not Found?)
        echo "Something bad happened while requesting the token:\n" . json_last_error();
        return false;
    }
}

/**
 * Call an API endpoint to demonstrate the token is valid.
 * @param {string} token The Bearer token.
 * @return {void}
 */
function requestApiData($token) {
    global $apiUrl;
    $options = [
        'http' => [
            'header'  => 'Authorization: Bearer ' . $token . "\r\n",
            'method'  => 'GET',
            'ignore_errors' => false
        ],
        'ssl' => [
            // This Mozilla CA certificate store is downloaded from:
            // https://curl.haxx.se/docs/caextract.html
            // This bundle was generated at Tue Apr 26 03:12:05 2022 GMT.
            'cafile' => 'cacert-2022-04-26.pem',
            'verify_peer' => true,
            'verify_peer_name' => true
        ]
    ];
    $context = stream_context_create($options);
    // The examples on Github (https://saxobank.github.io/openapi-samples-js/) are intended for individual logins.
    // This flow is intended for maintaining multiple customers, so it is recommended to explicitly specify clientKeys, accountKeys, etc.
    // Get all users: apiUrl + "/port/v1/users?ClientKey={ClientKey}&IncludeSubUsers=true",
    $result = @file_get_contents($apiUrl . '/ref/v1/exchanges', false, $context);
    if (!$result) {
        echo "Something bad happened while requesting the data:\n" . error_get_last()['message'];
    } else {
        $result_object = json_decode($result);
        if (json_last_error() == JSON_ERROR_NONE) {
            if (property_exists($result_object, 'error')) {
                echo "Response indicates an error:\n" . $result;
            } else {
                echo "\n\nResponse from API received (" . count($result_object -> Data) . " exchanges)\n";
            }
        } else {
            // Something bad happened, no json in response (404 Not Found?)
            echo "Something bad happened while requesting the data:\n" . json_last_error();
        }
    }
}

// Create the JWT token:
$jwtAssertion = createJwtAssertion();

// Request the Bearer token:
$tokenObject = requestToken($jwtAssertion);

if (!$tokenObject) {
    echo 'An error occurred while requesting the token.';
} else {
    // Call the API:
    requestApiData($tokenObject -> access_token);

    // For demonstration purposes, we'll refresh the token..
    $tokenObject = requestTokenRefresh($tokenObject -> refresh_token);
    // Now you might want to refresh the websocket connections with the new token...
}