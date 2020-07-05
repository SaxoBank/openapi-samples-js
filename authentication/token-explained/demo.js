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
    let alg;

    /**
     * Get and unpack the JWT header.
     * @return {void}
     */
    function getHeader() {
        let description;
        let jwt;
        let header;
        try {
            jwt = document.getElementById("idBearerToken").value.split(".");
            header = JSON.parse(window.atob(jwt[0]));
            alg = header.alg;
            description = JSON.stringify(header, null, 4);
            description += "\n\nAlgorithm used for signature: " + alg;
            description += "\nX.509 Certificate Thumbprint: " + header.x5t;
            console.log(description);
        } catch (e) {
            console.error(e);
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
        let jwt;
        let payload;
        let time;
        let secondsUntilExp;
        try {
            jwt = document.getElementById("idBearerToken").value.split(".");
            payload = JSON.parse(window.atob(jwt[1]));
            description = JSON.stringify(payload, null, 4);
            description += "\n\nClaims:\nOpenApi Access: " + payload.oaa;
            description += "\nIssuer: " + payload.iss;
            description += "\nApplication ID: " + payload.aid;
            description += "\nUserKey: " + payload.uid;
            description += "\nClientKey: " + payload.cid;
            description += "\nISA??: " + payload.isa;
            description += "\nTID??: " + payload.tid;
            description += "\nSession ID: " + payload.sid;
            description += "\nDGI??: " + payload.dgi;
            time = new Date(payload.exp * 1000);
            secondsUntilExp = getSecondsUntilExpiration(payload.exp);
            description += "\nExpiration Time: " + time.toLocaleDateString() + " " + time.toLocaleTimeString() + " (" + (
                secondsUntilExp > 0
                ? secondsUntilExp + " seconds remaining"
                : "expired"
            ) + ")";
            console.log(description);
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Get and verify the JWT signature.
     * @return {void}
     */
    function verify() {
        let jwt;
        let payload;
        try {
            jwt = document.getElementById("idBearerToken").value.split(".");
            payload = JSON.parse(window.atob(jwt[2]));
            alg = payload.alg;
            console.log(JSON.stringify(payload, null, 4));
        } catch (e) {
            console.error(e);
        }
    }

    document.getElementById("idBtnGetHeader").addEventListener("click", function () {
        demo.run(getHeader);
    });
    document.getElementById("idBtnGetPayload").addEventListener("click", function () {
        demo.run(getPayload);
    });
    document.getElementById("idBtnVerify").addEventListener("click", function () {
        demo.run(verify);
    });
    demo.displayVersion("trade");
}());
