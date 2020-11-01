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
    const firstUrl = demo.apiUrl + "/ref/v1/exchanges?$top=30";
    let nextUrl = firstUrl;

    /**
     * Request the next page of a long Data collection.
     * @return {void}
     */
    function getNext() {
        fetch(
            nextUrl,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let i;
                    for (i = 0; i < responseJson.Data.length; i += 1) {
                        responseJson.Data[i] = {
                            "ExchangeId": responseJson.Data[i].ExchangeId  // For simplicity, make the response smaller
                        };
                    }
                    console.log("Found " + responseJson.Data.length + " elements using URL\n" + nextUrl + ":\n\n" + JSON.stringify(responseJson, null, 4));
                    if (responseJson.hasOwnProperty("__next")) {
                        nextUrl = responseJson.__next;
                    } else {
                        window.alert("This is the last block of elements. You've requested them all.");
                    }
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request the first page of a long Data collection.
     * @return {void}
     */
    function getFirst() {
        nextUrl = firstUrl;  // Init with 'first' URL
        getNext();
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetFirst", "func": getFirst, "funcsToDisplay": [getFirst, getNext]},
        {"evt": "click", "elmId": "idBtnGetNext", "func": getNext, "funcsToDisplay": [getNext]}
    ]);
    demo.displayVersion("ref");
}());
