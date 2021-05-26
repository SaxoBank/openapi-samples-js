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
        "caTypeList": document.getElementById("idCaType"),
        "eventStatusList": document.getElementById("idEventStatus"),  // Optional
        "electBody": document.getElementById("idBody"),
        "footerElm": document.getElementById("idFooter")
    });


    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newOrderObject from the input field - null if invalid
     */
    function getElectionObjectFromJson() {
        let newOrderObject = null;
        try {
            newOrderObject = JSON.parse(document.getElementById("idBody").value);
            newOrderObject.ClientKey = demo.user.clientKey;
            document.getElementById("idBody").value = JSON.stringify(newOrderObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * This is an example of instrument search.
     * @return {void}
     */
    function getStandingInstructions() {       
        getElectionObjectFromJson();
        let urlPath = "/ca/v2/standinginstructions";  
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
     * This is an example of getting instrument details, option or future series.
     * @return {void}
     */
    function createStandingInstruction() {
        getElectionObjectFromJson();
        const electBody = document.getElementById("idBody").value;
        let urlPath = "/ca/v2/standinginstructions";
        
        fetch(
            demo.apiUrl + urlPath,
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json"
                },
                "body": electBody
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log("These are the details:\n\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxAccount", "func": getElectionObjectFromJson, "funcsToDisplay": [getElectionObjectFromJson]},
        {"evt": "click", "elmId": "idBtnGetStandingInstructions", "func": getStandingInstructions, "funcsToDisplay": [getStandingInstructions]},
        {"evt": "click", "elmId": "idBtnCreateStandingInstruction", "func": createStandingInstruction, "funcsToDisplay": [createStandingInstruction]},
    ]);
    demo.displayVersion("ca");
}());
