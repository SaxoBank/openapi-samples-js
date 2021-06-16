/*jslint browser: true, long: true */
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
     * This is an example of retrieving the holdings.
     * @return {void}
     */
    function getHoldings() {
        let url = demo.apiUrl + "/ca/v2/holdings";
        
        fetch(
            url,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    
                    // You can search for an ISIN. That will work. But due to market limitations the ISIN won't be in the response.
                    console.log(JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of getting holdings by EventId.
     * @return {void}
     */
    function getHoldingsByEventId() {
        const eventId = document.getElementById("idEventId").value;
        let urlPath = "/ca/v2/holdings?EventId=" + eventId;;
        
        fetch(
            demo.apiUrl + urlPath,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log("These are the details of this event:\n\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetHoldings", "func": getHoldings, "funcsToDisplay": [getHoldings]},
        {"evt": "click", "elmId": "idBtnGetHoldingsByEvent", "func": getHoldingsByEventId, "funcsToDisplay": [getHoldingsByEventId]},
    ]);
    demo.displayVersion("ca");
}());
