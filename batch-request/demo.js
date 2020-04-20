/*jslint this: true, browser: true, for: true, long: true */
/*global window console accountKey run processError apiUrl */

/**
 * Create the POST data for the batch request.
 * @return {void}
 */
function composeBatchRequest() {
    let postData = "";
    let requestId = 0;

    function addToBatch(path) {
        const host = "https://gateway.saxobank.com";
        let fullPath = apiUrl + path;
        fullPath = fullPath.substring(host.length);
        requestId += 1;
        postData += "--+\r\nContent-Type:application/http; msgtype=request\r\n\r\nGET " + fullPath + " HTTP/1.1\r\nX-Request-Id:" + requestId + "\r\nAccept-Language:en\r\nHost:gateway.saxobank.com\r\n\r\n\r\n";
    }

    addToBatch("/port/v1/clients/me");
    addToBatch("/port/v1/accounts/me");
    addToBatch("/port/v1/orders/me");
    addToBatch("/port/v1/netpositions/me");
    postData += "--+--\r\n";  // Add the end tag
    document.getElementById("idRequestBody").value = postData;
    console.log(requestId + " requests waiting in the batch.");
}

/**
 * Example of a batch request.
 * @return {void}
 */
function doBatchRequest() {
    fetch(
        apiUrl + "/port/batch",  // Grouping is done per service group, so "/ref" for example, must be in a different batch.
        {
            "headers": {
                "Content-Type": "multipart/mixed; boundary=\"+\"",
                "Accept": "*/*",
                "Accept-Language": "en, *;q=0.5",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                "Cache-Control": "no-cache"
            },
            "body": document.getElementById("idRequestBody").value.replace(/\n/g, "\r\n"),
            "method": "POST"
        }
    ).then(function (response) {
        if (response.ok) {
            response.text().then(function (responseText) {
                const responseArray = responseText.split("\n");
                let lineNumber;
                let line;
                let responseCount = 0;
                let responseJson;
                for (lineNumber = 0; lineNumber < responseArray.length; lineNumber += 1) {
                    line = responseArray[lineNumber].trim();
                    if (line.charAt(0) === "{") {
                        try {
                            responseJson = JSON.parse(line);
                            console.debug(responseJson);
                            responseCount += 1;
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
                document.getElementById("idRequestBody").value = responseText;
                console.log("Found " + responseCount + " responses.");
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

(function () {
    document.getElementById("idBtnGetRequest").addEventListener("click", function () {
        run(composeBatchRequest);
    });
    document.getElementById("idBtnGetResponse").addEventListener("click", function () {
        run(doBatchRequest);
    });
    displayVersion("port");
}());
