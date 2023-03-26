/*jslint this: true, browser: true, for: true, long: true, unordered: true */
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
     * Get and unpack the JWT header.
     * @return {void}
     */
    function getHeader() {
        let description;
        let jwt = document.getElementById("idBearerToken").value.split(".");
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
            description = JSON.stringify(header, null, 4);
            description += "\n\nAlgorithm used for signature: " + header.alg;
            description += "\nX.509 Certificate Thumbprint: " + header.x5t;
            console.log(description);
        } catch (e) {
            console.error("Probably the JSON is invalid.\n" + headerString + "\n" + e);
        }
    }

    /**
     * Get and unpack the JWT payload.
     * @return {void}
     */
    function getPayload() {

        function getSecondsUntilExpiration(exp) {
            const now = new Date();
            return Math.floor((exp * 1000 - now.getTime()) / 1000);
        }

        let description;
        let jwt = document.getElementById("idBearerToken").value.split(".");
        let payloadString;
        let payload;
        let time;
        let secondsUntilExp;
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
            description = JSON.stringify(payload, null, 4);
            description += "\n\nClaims:\nOpenApi Access: " + payload.oaa;
            description += "\nIssuer: " + payload.iss;
            description += "\nIssuer is Saxobank App: " + payload.isa;
            description += "\nApplication ID: " + payload.aid;
            description += "\nDataGroup ID (app type): " + payload.dgi;
            description += "\nUserKey: " + payload.uid;
            description += "\nClientKey: " + payload.cid;
            description += "\nTool ID: " + payload.tid;
            description += "\nSession ID: " + payload.sid;
            time = new Date(payload.exp * 1000);
            secondsUntilExp = getSecondsUntilExpiration(payload.exp);
            description += "\nExpiration Time: " + time.toLocaleDateString() + " " + time.toLocaleTimeString() + " (" + (
                secondsUntilExp > 0
                ? secondsUntilExp + " seconds remaining"
                : "expired"
            ) + ")";
            console.log(description);
        } catch (e) {
            console.error("Probably the JSON is invalid.\n" + payloadString + "\n" + e);
        }
    }

    /**
     * Get and verify the JWT signature.
     * @return {void}
     */
    function verify() {
        let jwt = document.getElementById("idBearerToken").value.split(".");
        let description;
        if (jwt.length !== 3) {
            console.error("Invalid token. There must be three parts, separated by a dot.");
            return;
        }
        description = "Verification of the claims is done in the backend. The signature is used to verify the message wasn't changed along the way, and it can also verify that the sender of the JWT is who it says it is.\n\nThe signature is compared with the hash of both header and payload.\n\nECDSASHA256(" + jwt[0] + "." + jwt[1] + ", publicKey, privateKey)\n==\n" + jwt[2];
        console.log(description);
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetHeader", "func": getHeader, "funcsToDisplay": [getHeader]},
        {"evt": "click", "elmId": "idBtnGetPayload", "func": getPayload, "funcsToDisplay": [getPayload]},
        {"evt": "click", "elmId": "idBtnVerify", "func": verify, "funcsToDisplay": [verify]}
    ]);
}());
