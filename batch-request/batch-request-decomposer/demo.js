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
     * Search for the response.
     * @param {string} requestId The ID of the request.
     * @param {string} response The response of the batch request.
     * @return {string} The individual response
     */
    function findResponse(requestId, response) {
        let isPartCorrect = false;
        let partLineNumber = 0;
        let httpResponseCode = "";
        let previousLine = "";
        let result = "";
        response.split("\n").forEach(function (line) {
            line = line.trim();
            if (line.substring(0, 2) === "--") {
                if (isPartCorrect) {
                    result = httpResponseCode + "\n" + (
                        previousLine === ""
                        ? ""
                        : JSON.stringify(JSON.parse(previousLine), null, 4)
                    );
                }
                // New boundary. Reset all values.
                partLineNumber = 0;
                httpResponseCode = "";
                isPartCorrect = false;
            } else if (partLineNumber === 3) {
                httpResponseCode = line;
            } else if (line === "X-Request-Id: " + requestId) {
                isPartCorrect = true;
            }
            previousLine = line;
            partLineNumber += 1;
        });
        if (result !== "") {
            return result;
        }
        console.error("Request-Id " + requestId + " not found.");
        throw "Request-Id " + requestId + " not found.";
    }

    /**
     * Show the batch response as individual requests.
     * @param {string} request The input of the batch request.
     * @param {string} response The response of the batch request.
     * @return {string} The individual requests
     */
    function decompose(request, response) {
        let requestId = "";
        let partLineNumber = 0;
        let result = "";
        request.split("\n").forEach(function (line) {
            line = line.trim();
            if (line.substring(0, 2) === "--" && requestId !== "") {
                // Next boundary found
                result += "\n" + findResponse(requestId, response);
                partLineNumber = 0;
            } else if (partLineNumber === 3) {
                // This is the request
                result += (
                    result === ""
                    ? ""
                    : "\n\n"
                ) + line;
            } else if (line.substring(0, 13) === "X-Request-Id:") {
                requestId = line.substring(13).trim();
            }
            partLineNumber += 1;
        });
        return result;
    }

    /**
     * Show the batch response as individual requests.
     * @return {void}
     */
    function decomposeBatchRequests() {
        let list = decompose(document.getElementById("idBatchRequest").value, document.getElementById("idBatchResponse").value);
        console.log(list);
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnDecomposeRequests", "func": decomposeBatchRequests, "funcsToDisplay": [decomposeBatchRequests, decompose, findResponse]}
    ]);
    demo.displayVersion("port");
}());
