/*jslint this: true, browser: true, for: true, long: true */
/*global window console demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "accessTokenElm": document.getElementById("idBearerToken"),
        "retrieveTokenHref": document.getElementById("idHrefRetrieveToken"),
        "tokenValidateButton": document.getElementById("idBtnValidate"),
        "accountsList": document.getElementById("idCbxAccount"),
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * This function is taken from php-Akita_OpenIDConnect
     * https://github.com/ritou/php-Akita_OpenIDConnect/blob/master/src/Akita/OpenIDConnect/Util/Base64.php
     * @param {string} str The string to encode
     * @return {string} The base64Encoded string
     */
    function base64UrlEncode(str) {
        const enc = window.btoa(str);
        return enc.replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
    }

    /**
     * This function converts the alg claim in the token header to a hash algorithm.
     * @param {string} accessToken The token containing the header
     * @return {string} The hash algorithm
     */
    function getAlgorithmFromToken(accessToken) {
        const header = getHeader(accessToken);
        const hashBits = parseInt(header.alg.substring(2));
        if (hashBits !== 256 && hashBits !== 384 && hashBits !== 512) {
            console.error("Unsupported hash algorithm: " + header.alg);
            return;
        }
        console.log("Alg claim " + header.alg + " in header converts to algorithm: SHA-" + hashBits);
        return "SHA-" + hashBits;
    }

    /**
     * This function extracts the hash algo and does the hashing.
     * Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
     * @param {string} message The text to hash
     * @param {Object} header The header object extracted from the jwt
     * @return {string} The hash
     */
    async function digestMessage(algorithm, message) {
        const msgUint8 = new TextEncoder().encode(message);  // Encode as (utf-8) Uint8Array
        const hashBuffer = await window.crypto.subtle.digest(algorithm, msgUint8);  // Hash the message
        const firstHalfOfHashBuffer = new window.Uint8Array(hashBuffer, 0, hashBuffer.byteLength / 2);  // First half into byte array
        const hash = String.fromCharCode.apply(String, firstHalfOfHashBuffer);  // Convert bytes to string
        return base64UrlEncode(hash);
    }

    /**
     * Get and unpack the JWT header.
     * @param {string} accessToken The accessToken from the authenticate response
     * @return {Object} Header object
     */
    function getHeader(accessToken) {
        let jwt = accessToken.split(".");
        let headerString;
        let header;
        if (jwt.length !== 3) {
            console.error("Invalid token. There must be three parts, separated by a dot.");
            return;
        }
        try {
            headerString = window.atob(jwt[0]);
        } catch (e) {
            console.error("Header is not a valid Base64 encoded string.\n" + jwt[0] + "\n" + e);
            return;
        }
        try {
            header = JSON.parse(headerString);
            return header;
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Get and unpack the JWT payload.
     * @param {string} accessToken The accessToken from the authenticate response.
     * @return {Object} Payload object
     */
    function getPayload(accessToken) {
        let jwt = accessToken.split(".");
        let payloadString;
        let payload;
        if (jwt.length !== 3) {
            console.error("Invalid token. There must be three parts, separated by a dot.");
            return;
        }
        try {
            payloadString = window.atob(jwt[1]);
        } catch (e) {
            console.error("Body is not a valid Base64 encoded string.\n" + jwt[1] + "\n" + e);
            return;
        }
        try {
            payload = JSON.parse(payloadString);
            return payload;
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Access Token hash value.
     * Its value is the base64url encoding of the left-most half of the hash of the octets of the ASCII representation of the access_token value,
     * where the hash algorithm used is the hash algorithm used in the alg Header Parameter of the ID Token's JOSE Header.
     * For instance, if the alg is RS256, hash the access_token value with SHA-256, then take the left-most 128 bits and base64url encode them.
     * The at_hash value is a case sensitive string.
     * If the ID Token is issued from the Authorization Endpoint with an access_token value, which is the case for the response_type value code id_token token,
     * this is REQUIRED; otherwise, its inclusion is OPTIONAL.
     */
    function validateToken() {

        function getSecondsUntilExpiration(exp) {
            const now = new Date();
            return Math.floor((exp * 1000 - now.getTime()) / 1000);
        }

        const accessToken = document.getElementById("idBearerToken").value;
        const idToken = document.getElementById("idEdtIdToken").value;
        const payload = getPayload(accessToken);
        const secondsUntilExp = getSecondsUntilExpiration(payload.exp);
        let description = (
            secondsUntilExp > 0
            ? "AccessToken is valid for " + secondsUntilExp + " more seconds.\n"
            : "AccessToken is already expired. However:\n"
        );
        if (!payload.hasOwnProperty("at_hash")) {
            console.error("The at_hash claim is not available in the token. Is this an OIDC JWT token?");
            return;
        }
        digestMessage(getAlgorithmFromToken(accessToken), idToken).then(function (hash) {
            description += "Claim at_hash: " + payload.at_hash + "\n";
            description += "Hashed id_token: " + hash + "\n";
            if (payload.at_hash === hash) {
                console.log(description + "The at_hash claim matches with the hashed id_token. Token is valid!");
            } else {
                console.error(description + "There is an issue with this token. Don't trust it!");
            }
        });
    }

    /**
     * Code hash value.
     * Its value is the base64url encoding of the left-most half of the hash of the octets of the ASCII representation of the code value,
     * where the hash algorithm used is the hash algorithm used in the alg Header Parameter of the ID Token's JOSE Header.
     * For instance, if the alg is HS512, hash the code value with SHA-512, then take the left-most 256 bits and base64url encode them.
     * The c_hash value is a case sensitive string.
     * If the ID Token is issued from the Authorization Endpoint with a code, which is the case for the response_type values code id_token and code id_token token,
     * this is REQUIRED; otherwise, its inclusion is OPTIONAL.
     */
    function validateCode() {
        const accessToken = document.getElementById("idBearerToken").value;
        const code = document.getElementById("idEdtCode").value;
        const payload = getPayload(accessToken);
        let description = "";
        if (!payload.hasOwnProperty("c_hash")) {
            console.error("The c_hash claim is not available in the token. Is the token requested with a code? Or is it a refreshed token?");
            return;
        }
        digestMessage(getAlgorithmFromToken(accessToken), code).then(function (hash) {
            description += "Claim c_hash: " + payload.c_hash + "\n";
            description += "Hashed code: " + hash + "\n";
            if (payload.c_hash === hash) {
                console.log(description + "The c_hash claim matches with the hashed code. Valid!");
            } else {
                console.error(description + "There is a mismatch between code and token. Don't trust it!");
            }
        });
    }

    /**
     * State hash value.
     * Its value is the base64url encoding of the left-most half of the hash of the octets of the ASCII representation of the state value,
     * where the hash algorithm used is the hash algorithm used in the alg header parameter of the ID Token's JOSE header.
     * For instance, if the alg is HS512, hash the state value with SHA-512, then take the left-most 256 bits and base64url encode them.
     * The s_hash value is a case sensitive string.
     */
    function validateState() {
        const accessToken = document.getElementById("idBearerToken").value;
        const state = document.getElementById("idEdtState").value;
        const payload = getPayload(accessToken);
        let description = "";
        if (!payload.hasOwnProperty("s_hash")) {
            console.error("The s_hash claim is not available in the token. Is a state supplied in the redirect URL?");
            return;
        }
        digestMessage(getAlgorithmFromToken(accessToken), state).then(function (hash) {
            description += "Claim s_hash: " + payload.s_hash + "\n";
            description += "Hashed state: " + hash + "\n";
            if (payload.s_hash === hash) {
                console.log(description + "The s_hash claim matches with the hashed state. Valid!");
            } else {
                console.error(description + "There is a mismatch between state and token. Don't trust it!");
            }
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnValidateToken", "func": validateToken, "funcsToDisplay": [validateToken, getAlgorithmFromToken, digestMessage, base64UrlEncode]},
        {"evt": "click", "elmId": "idBtnValidateCode", "func": validateCode, "funcsToDisplay": [validateCode, getAlgorithmFromToken, digestMessage, base64UrlEncode]},
        {"evt": "click", "elmId": "idBtnValidateState", "func": validateState, "funcsToDisplay": [validateState, getAlgorithmFromToken, digestMessage, base64UrlEncode]}
    ]);
}());
