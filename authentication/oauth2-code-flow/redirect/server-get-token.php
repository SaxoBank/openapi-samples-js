<?php

// Set your return content type
header('Content-Type: application/json; charset=utf-8');

/**
 * Return an error in the same format as used by the API
 * @param string $message The message to return in the JSON response.
 */
function handleErrorAndDie($message) {
    http_response_code(500);
    die(
        json_encode(
            array(
                'developerMessage' => $message,
                'endUserMessage' => '',
                'errorCode' => 'Forbidden',
                'errorId' => 405
            )
        )
    );
}

/**
 * Return the bearer token
 * @param string $code This argument must contain the code.
 */
function getToken($code) {
    $appKey = 'faf2acbb48754413a043676b9c2c2bd5';
    $secret = 'ENTER_YOUR_SECRET';
    if ($secret == 'ENTER_YOUR_SECRET') {
        handleErrorAndDie("Add your appKey and secret to the PHP!");  // After doing this, remove this check as well!
    }
    $data = array(
        'client_id' => $appKey,
        'client_secret' => $secret,
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
            // This bundle was generated at Wed Jan 1 04:12:10 2020 GMT.
            'cafile' => 'cacert-2020-01-01.pem',
            'verify_peer' => true,
            'verify_peer_name' => true
        )
    );
    $context  = stream_context_create($options);
    $result = @file_get_contents('https://sim.logonvalidation.net/token', false, $context);
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
