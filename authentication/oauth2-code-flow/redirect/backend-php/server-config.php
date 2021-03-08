<?php

/*
 *
 * Settings file:
 * This is the file config.php, containing the configuration of the API.
 *
 * appKey: The client identification of your app, supplied by Saxo (Client ID)
 * clientSecret: The secret which gives access to the API (Client Secret)
 * tokenEndpoint: The URL of the authentication provider (https://www.developer.saxo/openapi/learn/environments)
 *
 * IMPORTANT NOTICE:
 * The following credentials give access to SIM, if the redirect URL is http://localhost:1337/ (NodeJs example) and
 * http://localhost/openapi-samples-js/authentication/oauth2-code-flow/redirect/ (PHP example).
 * If you want to use your own redirect URL, you must create your own Code Flow application:
 * https://www.developer.saxo/openapi/appmanagement.
 * And needless to say, when you have an app for Live, don't publish the credentials on Github!
 *
 */

// Configuration for Simulation (SIM):
$configuration = json_decode('{
    "appKey": "faf2acbb48754413a043676b9c2c2bd5",
    "appSecret": "c074e19278f74700b21d66287a30c14e",
    "tokenEndpoint": "https://sim.logonvalidation.net/token"
}');

// Configuration for Live:
/*
$configuration = json_decode('{
    "appKey": "Your app key",
    "appSecret": "Your app secret",
    "tokenEndpoint": "https://live.logonvalidation.net/token"
}');
*/
