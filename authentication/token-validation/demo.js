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
     */
    function base64UrlEncode(str) {
        const enc = window.btoa(str);
        return enc.replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
    }

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
     * @param {Object} header The header object extracted from the jwt.
     */
    async function digestMessage(algorithm, message) {
        const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
        const hashBuffer = await window.crypto.subtle.digest(algorithm, msgUint8); // hash the message
        const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
        const hashArrayHalf = hashArray.slice(0, hashArray.length / 2);
        const hash = hashArrayHalf.map(function (b) {
            return String.fromCharCode(b);  // Convert bytes to chars
        }).join("");
        return base64UrlEncode(hash);
    }

    /**
     * Get and unpack the JWT header.
     * @param {string} accessToken The accessToken from the authenticate response.
     * @return {Object}
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
     * @return {Object}
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

        //const accessToken = document.getElementById("idBearerToken").value;
        const accessToken = "eyJ0eXAiOiJKV1QiLCJraWQiOiJnVVRBa3hiL3pVRTg2OVMxcTdDOGxXUytyUms9IiwiYWxnIjoiUlMyNTYifQ.eyJhdF9oYXNoIjoidlBEMUhhY3hXeVJHZEZQYzRwU1lDUSIsInN1YiI6Iih1c3IheHdvdWZ1c2VyMykiLCJpaWQiOiJQdmtDcllHa2RQNncwN058YXNSU3F1VlRkS3gtUDhsbTlwY0xIU1JjTm5kT3AxY1Z3b1dxS3I4LVhGOWVxb1pZIiwiYXVkaXRUcmFja2luZ0lkIjoiMWVlM2NkY2ItMmU0ZS00YThmLThjMzItNTFkY2VjMjdmMGFlLTMyMjM5NCIsImlzcyI6Imh0dHBzOi8vYXV0aC1leHQuc3NvY3BvYy5vbmUuZXU0MWQuaW5mLmlpdGVjaC5kazo0NDMvYW0vb2F1dGgyL2RjYSIsInRva2VuTmFtZSI6ImlkX3Rva2VuIiwic2lkIjoiNWM1ZDQwYjU2MjAwNGZlOGJlYjZhNDAzYWViZTEwNjQiLCJhY3IiOiIwIiwidWlkIjoiclIwTUd3d21ybnFjWVBTZkZCYm8zZz09IiwiYXpwIjoiU1RHT0FwcCIsImF1dGhfdGltZSI6MTY3OTY0NDQzNSwib2FsIjoiMkYiLCJleHAiOjE2Nzk2NDgwNTEsImlhdCI6MTY3OTY0NDQ1MSwiZXJyIjoiIiwidHJkIjoiLTEiLCJzdWJuYW1lIjoieHdvdWZ1c2VyMyIsInVuaWlkIjoiRDg3RUM2QzItOUU0Ny00MTYyLTEwOEItMDhEOENDM0Q4NDFEIiwibXVpZCI6IjIxNDczNDMzMzMiLCJhdWQiOiJTVEdPQXBwIiwiY19oYXNoIjoiMVN1c3k0Vkh1S3Vua3NCSnBEcWJuUSIsIm9yZy5mb3JnZXJvY2sub3BlbmlkY29ubmVjdC5vcHMiOiJfRWo2cEhpajZVTU9zcjZKajIyang3WHVKNU0iLCJzX2hhc2giOiJkVGFTN0RhdHRNZVV5WE9VWHJLcG5BIiwibmFtZSI6Ik4vQSIsInJlYWxtIjoiL2RjYSIsInRva2VuVHlwZSI6IkpXVFRva2VuIiwiYWlkIjoiNyIsImZhbWlseV9uYW1lIjoiTi9BIiwiY2lkIjoidXxseXQ5NFBrT0F4cERNME50QnFndz09In0.kBOc_t1Zxkohqk-oi1ZmEZVL1wGd_jkA04d6xJbkqs7FOOHZTQubNhgKFspsTXkF6qiFwjMzUyYUQWWsl_dWNNxnbpzj250iSZb1O7aW8kkFNdVoV52p036JaVnWLdnSg8u1xVI4eurs3vzBba4igUN1OkMHdSvbiBlmgHee1fsxIJ96Aa-8uuf4RCsBS1zkYT_VhCCgS0QUzVFoxcpQSDvD0X0woWBUdYOXD8pEFWW4xttvqe5GhBOK1XSVcaxjjqU14IqISDUNnTUjmjpC9DJPibDlZZ40ZLBGKCZRy5jjHYl5BDZuQjw96jGqoYlky2E04Bm7HN-HZiysQSyGoA";
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
            description += "at_hash claim: " + payload.at_hash + "\n";
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
        //const accessToken = document.getElementById("idBearerToken").value;
        const accessToken = "eyJ0eXAiOiJKV1QiLCJraWQiOiJnVVRBa3hiL3pVRTg2OVMxcTdDOGxXUytyUms9IiwiYWxnIjoiUlMyNTYifQ.eyJhdF9oYXNoIjoidlBEMUhhY3hXeVJHZEZQYzRwU1lDUSIsInN1YiI6Iih1c3IheHdvdWZ1c2VyMykiLCJpaWQiOiJQdmtDcllHa2RQNncwN058YXNSU3F1VlRkS3gtUDhsbTlwY0xIU1JjTm5kT3AxY1Z3b1dxS3I4LVhGOWVxb1pZIiwiYXVkaXRUcmFja2luZ0lkIjoiMWVlM2NkY2ItMmU0ZS00YThmLThjMzItNTFkY2VjMjdmMGFlLTMyMjM5NCIsImlzcyI6Imh0dHBzOi8vYXV0aC1leHQuc3NvY3BvYy5vbmUuZXU0MWQuaW5mLmlpdGVjaC5kazo0NDMvYW0vb2F1dGgyL2RjYSIsInRva2VuTmFtZSI6ImlkX3Rva2VuIiwic2lkIjoiNWM1ZDQwYjU2MjAwNGZlOGJlYjZhNDAzYWViZTEwNjQiLCJhY3IiOiIwIiwidWlkIjoiclIwTUd3d21ybnFjWVBTZkZCYm8zZz09IiwiYXpwIjoiU1RHT0FwcCIsImF1dGhfdGltZSI6MTY3OTY0NDQzNSwib2FsIjoiMkYiLCJleHAiOjE2Nzk2NDgwNTEsImlhdCI6MTY3OTY0NDQ1MSwiZXJyIjoiIiwidHJkIjoiLTEiLCJzdWJuYW1lIjoieHdvdWZ1c2VyMyIsInVuaWlkIjoiRDg3RUM2QzItOUU0Ny00MTYyLTEwOEItMDhEOENDM0Q4NDFEIiwibXVpZCI6IjIxNDczNDMzMzMiLCJhdWQiOiJTVEdPQXBwIiwiY19oYXNoIjoiMVN1c3k0Vkh1S3Vua3NCSnBEcWJuUSIsIm9yZy5mb3JnZXJvY2sub3BlbmlkY29ubmVjdC5vcHMiOiJfRWo2cEhpajZVTU9zcjZKajIyang3WHVKNU0iLCJzX2hhc2giOiJkVGFTN0RhdHRNZVV5WE9VWHJLcG5BIiwibmFtZSI6Ik4vQSIsInJlYWxtIjoiL2RjYSIsInRva2VuVHlwZSI6IkpXVFRva2VuIiwiYWlkIjoiNyIsImZhbWlseV9uYW1lIjoiTi9BIiwiY2lkIjoidXxseXQ5NFBrT0F4cERNME50QnFndz09In0.kBOc_t1Zxkohqk-oi1ZmEZVL1wGd_jkA04d6xJbkqs7FOOHZTQubNhgKFspsTXkF6qiFwjMzUyYUQWWsl_dWNNxnbpzj250iSZb1O7aW8kkFNdVoV52p036JaVnWLdnSg8u1xVI4eurs3vzBba4igUN1OkMHdSvbiBlmgHee1fsxIJ96Aa-8uuf4RCsBS1zkYT_VhCCgS0QUzVFoxcpQSDvD0X0woWBUdYOXD8pEFWW4xttvqe5GhBOK1XSVcaxjjqU14IqISDUNnTUjmjpC9DJPibDlZZ40ZLBGKCZRy5jjHYl5BDZuQjw96jGqoYlky2E04Bm7HN-HZiysQSyGoA";
        const code = document.getElementById("idEdtCode").value;
        const payload = getPayload(accessToken);
        let description = "";
        if (!payload.hasOwnProperty("c_hash")) {
            console.error("The c_hash claim is not available in the token. Is the token requested with a code? Or is it a refreshed token?");
            return;
        }
        digestMessage(getAlgorithmFromToken(accessToken), code).then(function (hash) {
            description += "c_hash claim: " + payload.c_hash + "\n";
            description += "Hashed code: " + hash + "\n";
            if (payload.c_hash === hash) {
                console.log(description + "The c_hash claim matches with the hashed code. Valid!");
            } else {
                console.error(description + "There is an issue with this token. Don't trust it!");
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
        //const accessToken = document.getElementById("idBearerToken").value;
        const accessToken = "eyJ0eXAiOiJKV1QiLCJraWQiOiJnVVRBa3hiL3pVRTg2OVMxcTdDOGxXUytyUms9IiwiYWxnIjoiUlMyNTYifQ.eyJhdF9oYXNoIjoidlBEMUhhY3hXeVJHZEZQYzRwU1lDUSIsInN1YiI6Iih1c3IheHdvdWZ1c2VyMykiLCJpaWQiOiJQdmtDcllHa2RQNncwN058YXNSU3F1VlRkS3gtUDhsbTlwY0xIU1JjTm5kT3AxY1Z3b1dxS3I4LVhGOWVxb1pZIiwiYXVkaXRUcmFja2luZ0lkIjoiMWVlM2NkY2ItMmU0ZS00YThmLThjMzItNTFkY2VjMjdmMGFlLTMyMjM5NCIsImlzcyI6Imh0dHBzOi8vYXV0aC1leHQuc3NvY3BvYy5vbmUuZXU0MWQuaW5mLmlpdGVjaC5kazo0NDMvYW0vb2F1dGgyL2RjYSIsInRva2VuTmFtZSI6ImlkX3Rva2VuIiwic2lkIjoiNWM1ZDQwYjU2MjAwNGZlOGJlYjZhNDAzYWViZTEwNjQiLCJhY3IiOiIwIiwidWlkIjoiclIwTUd3d21ybnFjWVBTZkZCYm8zZz09IiwiYXpwIjoiU1RHT0FwcCIsImF1dGhfdGltZSI6MTY3OTY0NDQzNSwib2FsIjoiMkYiLCJleHAiOjE2Nzk2NDgwNTEsImlhdCI6MTY3OTY0NDQ1MSwiZXJyIjoiIiwidHJkIjoiLTEiLCJzdWJuYW1lIjoieHdvdWZ1c2VyMyIsInVuaWlkIjoiRDg3RUM2QzItOUU0Ny00MTYyLTEwOEItMDhEOENDM0Q4NDFEIiwibXVpZCI6IjIxNDczNDMzMzMiLCJhdWQiOiJTVEdPQXBwIiwiY19oYXNoIjoiMVN1c3k0Vkh1S3Vua3NCSnBEcWJuUSIsIm9yZy5mb3JnZXJvY2sub3BlbmlkY29ubmVjdC5vcHMiOiJfRWo2cEhpajZVTU9zcjZKajIyang3WHVKNU0iLCJzX2hhc2giOiJkVGFTN0RhdHRNZVV5WE9VWHJLcG5BIiwibmFtZSI6Ik4vQSIsInJlYWxtIjoiL2RjYSIsInRva2VuVHlwZSI6IkpXVFRva2VuIiwiYWlkIjoiNyIsImZhbWlseV9uYW1lIjoiTi9BIiwiY2lkIjoidXxseXQ5NFBrT0F4cERNME50QnFndz09In0.kBOc_t1Zxkohqk-oi1ZmEZVL1wGd_jkA04d6xJbkqs7FOOHZTQubNhgKFspsTXkF6qiFwjMzUyYUQWWsl_dWNNxnbpzj250iSZb1O7aW8kkFNdVoV52p036JaVnWLdnSg8u1xVI4eurs3vzBba4igUN1OkMHdSvbiBlmgHee1fsxIJ96Aa-8uuf4RCsBS1zkYT_VhCCgS0QUzVFoxcpQSDvD0X0woWBUdYOXD8pEFWW4xttvqe5GhBOK1XSVcaxjjqU14IqISDUNnTUjmjpC9DJPibDlZZ40ZLBGKCZRy5jjHYl5BDZuQjw96jGqoYlky2E04Bm7HN-HZiysQSyGoA";
        const state = document.getElementById("idEdtState").value;
        const payload = getPayload(accessToken);
        let description = "";
        if (!payload.hasOwnProperty("s_hash")) {
            console.error("The s_hash claim is not available in the token. Is a state supplied in the redirect URL?");
            return;
        }
        digestMessage(getAlgorithmFromToken(accessToken), state).then(function (hash) {
            description += "s_hash claim: " + payload.s_hash + "\n";
            description += "Hashed state: " + hash + "\n";
            if (payload.s_hash === hash) {
                console.log(description + "The s_hash claim matches with the hashed state. Valid!");
            } else {
                console.error(description + "There is an issue with this token. Don't trust it!");
            }
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnValidateToken", "func": validateToken, "funcsToDisplay": [validateToken, getAlgorithmFromToken, digestMessage, base64UrlEncode]},
        {"evt": "click", "elmId": "idBtnValidateCode", "func": validateCode, "funcsToDisplay": [validateCode, getAlgorithmFromToken, digestMessage, base64UrlEncode]},
        {"evt": "click", "elmId": "idBtnValidateState", "func": validateState, "funcsToDisplay": [validateState, getAlgorithmFromToken, digestMessage, base64UrlEncode]}
    ]);
}());
