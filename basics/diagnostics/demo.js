/*jslint this: true, browser: true, for: true, long: true */
/*global window console demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * Check if a method is supported through the proxy of the client.
     * @param {string} method The method to test (PUT, PATCH, HEAD, OPTIONS).
     * @param {string} url The URL.
     * @return {void}
     */
    function testRequest(method, url) {
        let isMethodSupported = false;  // Be negative
        fetch(url, {"method": method}).then(function (response) {
            if (response.ok) {
                isMethodSupported = true;
                if (method === "GET" || method === "POST") {
                    console.log("Request to " + method + " " + response.url + " is successful.\nWhen GET, or POST fails, probably nothing will work.");
                } else {
                    console.log("Request to " + method + " " + response.url + " is successful.\nNo need to use the X-HTTP-Method-Override header.");
                }
            }
        }).finally(function () {
            if (!isMethodSupported) {
                // There are reasons for sysadmins to activate "HTTP Verb Tampering".
                // Using this tunneling workaround goes against REST principles.
                // Quoting Scott Hanselman on this:
                // "You are all correct, this is lame, but it's the reality in many large (stupid) enterprises.
                //  I'm not saying it's good, nor am I saying it's recommended. It simply IS."
                console.error("The method " + method + " is not supported (HTTP Verb Tampering).\nAs a workaround you can tunnel the request in a POST including the header {'X-HTTP-Method-Override': '" + method + "'}");
                // When the header itself is blocked too, a batch request can be considered.
            }
        });
    }

    function testGetRequest() {
        testRequest("GET", demo.apiUrl + "/root/v1/diagnostics/get");
    }

    function testPostRequest() {
        testRequest("POST", demo.apiUrl + "/root/v1/diagnostics/post");
    }

    function testPutRequest() {
        testRequest("PUT", demo.apiUrl + "/root/v1/diagnostics/put");
    }

    function testPatchRequest() {
        testRequest("PATCH", demo.apiUrl + "/root/v1/diagnostics/patch");
    }

    function testDeleteRequest() {
        testRequest("DELETE", demo.apiUrl + "/root/v1/diagnostics/delete");
    }

    document.getElementById("idBtnTestGetRequest").addEventListener("click", function () {
        demo.run(testGetRequest, testRequest);
    });
    document.getElementById("idBtnTestPostRequest").addEventListener("click", function () {
        demo.run(testPostRequest, testRequest);
    });
    document.getElementById("idBtnTestPutRequest").addEventListener("click", function () {
        demo.run(testPutRequest, testRequest);
    });
    document.getElementById("idBtnTestPatchRequest").addEventListener("click", function () {
        demo.run(testPatchRequest, testRequest);
    });
    document.getElementById("idBtnTestDeleteRequest").addEventListener("click", function () {
        demo.run(testDeleteRequest, testRequest);
    });
}());
