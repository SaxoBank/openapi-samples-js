<?php

/*
 *
 * This is the file server-get-token.php, used to retrieve a token for using the API.
 *
 */

// Load the file with the app settings:
require "server-config.php";

// Set your return content type
header('Content-Type: application/json; charset=utf-8');

/**
 * Return an error in the same format as used by the API
 * @param string $message The message to return in the JSON response.
 */
function handleErrorAndDie($message) {
    http_response_code(401);
    die(
        json_encode(
            array(
                'Message' => $message,
                'ErrorCode' => 'Unauthorized'
            )
        )
    );
}

/**
 * Return the bearer token
 * @param string $code This argument must contain the code retrieved after a successful login.
 */
function getToken($code) {
    global $configuration;
    $data = array(
        'client_id' => $configuration->appKey,
        'client_secret' => $configuration->appSecret,
        'grant_type' => 'authorization_code',
        'code' => $code);
    $options = array(
        'http' => array(
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data),
            'ignore_errors' => true
        ),
        'ssl' => array(
            // This Mozilla CA certificate store is downloaded from:
            // https://curl.haxx.se/docs/caextract.html
            // This bundle was generated at Tue Jan 19 04:12:04 2021 GMT.
            'cafile' => 'cacert-2021-01-19.pem',
            'verify_peer' => true,
            'verify_peer_name' => true
        )
    );
    $context  = stream_context_create($options);
    // If you are looking here, probably something is wrong.
    // Is PHP properly installed (including OpenSSL extension)?
    // Troubleshooting:
    //  You can follow these steps to see what is going wrong:
    //  1. Run PHP in development mode, with warnings displayed, by using the development.ini.
    //  2. Remove the @ before "file_get_contents".
    //  3. Echo the $result and exit with "die();":
    //     $result = file_get_contents($configuration->tokenEndpoint, false, $context);
    //     echo $result;
    //     die();
    //  4. Examinate the response of the POST http://localhost/openapi-samples-js/authentication/oauth2-code-flow/redirect/backend-php/server-get-token.php
    //     That response probably contains warnings like:
    //       file_get_contents(): Unable to find the wrapper &quot;https&quot; - did you forget to enable it when you configured PHP?
    //       file_get_contents(): open_basedir restriction in effect. File(https://sim.logonvalidation.net/token) is not within the allowed path(s): (C:\inetpub\wwwroot)
    //  5. Resolve the warnings.
    $result = @file_get_contents($configuration->tokenEndpoint, false, $context);
    if (!$result) {
        handleErrorAndDie(error_get_last()['message']);
    }
    $result_object = json_decode($result);
    if (json_last_error() == JSON_ERROR_NONE) {
        if (property_exists($result_object, 'error')) {
            http_response_code(500);
        } else if (property_exists(json_decode($result), 'code')) {
            http_response_code(json_decode($result)->code);
        }
        echo $result;
    } else {
        // Something bad happened, no json in response (404 Not Found?)
        handleErrorAndDie($result);
    }
}

/**
 * Make sure no garbage is send to the token server
 * @param string $input_var Input variable to clean from wrong characters
 */
function sanitizeInputVar($input_var) {
    return filter_var($input_var, FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);
}

// Get and decode the post data
$request_params = json_decode(file_get_contents('php://input'));
if ($request_params == null || !isset($request_params->code)) {
    handleErrorAndDie('Missing parameter. Required is "code".');
}

// Request a token
getToken(sanitizeInputVar($request_params->code));
