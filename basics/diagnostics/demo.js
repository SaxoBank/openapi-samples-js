/*jslint this: true, browser: true, for: true, long: true */
/*global window console run apiUrl */

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
    testRequest("GET", apiUrl + "/root/v1/diagnostics/get");
}

function testPostRequest() {
    testRequest("POST", apiUrl + "/root/v1/diagnostics/post");
}

function testPutRequest() {
    testRequest("PUT", apiUrl + "/root/v1/diagnostics/put");
}

function testPatchRequest() {
    testRequest("PATCH", apiUrl + "/root/v1/diagnostics/patch");
}

function testDeleteRequest() {
    testRequest("DELETE", apiUrl + "/root/v1/diagnostics/delete");
}

(function () {
    document.getElementById("idBtnTestGetRequest").addEventListener("click", function () {
        run(testGetRequest, testRequest);
    });
    document.getElementById("idBtnTestPostRequest").addEventListener("click", function () {
        run(testPostRequest, testRequest);
    });
    document.getElementById("idBtnTestPutRequest").addEventListener("click", function () {
        run(testPutRequest, testRequest);
    });
    document.getElementById("idBtnTestPatchRequest").addEventListener("click", function () {
        run(testPatchRequest, testRequest);
    });
    document.getElementById("idBtnTestDeleteRequest").addEventListener("click", function () {
        run(testDeleteRequest, testRequest);
    });
}());
