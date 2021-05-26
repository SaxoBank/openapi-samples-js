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
        "electBody": document.getElementById("idElectBody"),
        "footerElm": document.getElementById("idFooter")
    });


    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newOrderObject from the input field - null if invalid
     */
    function getElectionObjectFromJson() {
        let newOrderObject = null;
        try {
            newOrderObject = JSON.parse(document.getElementById("idElectBody").value);
            newOrderObject.AccountKey = demo.user.accountKey;
            document.getElementById("idElectBody").value = JSON.stringify(newOrderObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * This is an example of instrument search.
     * @return {void}
     */
    function getActiveEvents() {       
        getElectionObjectFromJson();
        let urlPath = "/ca/v2/events/?CorporateActionTypes=Voluntary&EventStatus=Active";  
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
    function elect() {
        const electBody = document.getElementById("idElectBody").value;
        let urlPath = "/ca/v2/elections";
        var body = JSON.parse(electBody);
        document.getElementById("idEventId").value = body.EventId;
        
        fetch(
            demo.apiUrl + urlPath,
            {
                "method": "PUT",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json"
                },
                "body": electBody
            }
        ).then(function (response) {
            if (response.ok) {
                console.log("These are the details of this elections:\n\n" + JSON.stringify({ "status": response.status, "statusText": response.statusText}, null, 4));
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }


    /**
     * Get Event by id.
     * @return {void}
     */
     function getEventById() {       
        const eventId = document.getElementById("idEventId").value;
        let urlPath = "/ca/v2/events/?CorporateActionTypes=Voluntary&EventStatus=Active&EventId=" + eventId;  
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

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxAccount", "func": getElectionObjectFromJson, "funcsToDisplay": [getElectionObjectFromJson]},
        {"evt": "click", "elmId": "idBtnGetActiveEvents", "func": getActiveEvents, "funcsToDisplay": [getActiveEvents]},
        {"evt": "click", "elmId": "idBtnElect", "func": elect, "funcsToDisplay": [elect]},
        {"evt": "click", "elmId": "idBtnGetEventById", "func": getEventById, "funcsToDisplay": [getEventById]},
    ]);
    demo.displayVersion("ca");
}());
