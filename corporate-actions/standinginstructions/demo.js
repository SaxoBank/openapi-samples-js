/*jslint browser: true, long: true, unordered: true */
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
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The standingInstructionsObject from the input field - null if invalid
     */
    function getStandingInstructionsObjectFromJson() {
        let standingInstructionsObject = null;
        try {
            standingInstructionsObject = JSON.parse(document.getElementById("idBody").value);
            standingInstructionsObject.ClientKey = demo.user.clientKey;
            document.getElementById("idBody").value = JSON.stringify(standingInstructionsObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return standingInstructionsObject;
    }

    /**
     * This is an example of getting standing instructions.
     * @return {void}
     */
    function getStandingInstructions() {
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
     * This is an example of creating standing instructions.
     * @return {void}
     */
    function createStandingInstruction() {
        const standingInstructionsBody = getStandingInstructionsObjectFromJson();
        let urlPath = "/ca/v2/standinginstructions";
        fetch(
            demo.apiUrl + urlPath,
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json"
                },
                "body": standingInstructionsBody
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
        {"evt": "click", "elmId": "idBtnGetStandingInstructions", "func": getStandingInstructions, "funcsToDisplay": [getStandingInstructions]},
        {"evt": "click", "elmId": "idBtnCreateStandingInstruction", "func": createStandingInstruction, "funcsToDisplay": [createStandingInstruction]}
    ]);
    demo.displayVersion("ca");
}());
