<?php

/*
 *
 * This is the file server-refresh-token.php, used to refresh a token for using the API.
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
 * @param string $refreshToken This argument must contain the refresh_token.
 */
function getToken($refreshToken) {
    global $configuration;
    $data = array(
        'client_id' => $configuration->appKey,
        'client_secret' => $configuration->appSecret,
        'grant_type' => 'refresh_token',
        'refresh_token' => $refreshToken);
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
            // This bundle was generated at Tue Apr 26 03:12:05 2022 GMT.
            'cafile' => 'cacert-2022-04-26.pem',
            'verify_peer' => true,
            'verify_peer_name' => true
        )
    );
    $context  = stream_context_create($options);
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
if ($request_params == null || !isset($request_params->refresh_token)) {
    handleErrorAndDie('Missing parameter. Required is "refresh_token".');
}

// Request a token
getToken(sanitizeInputVar($request_params->refresh_token));
