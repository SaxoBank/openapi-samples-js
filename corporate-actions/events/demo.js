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
        "selectedCaType": "Voluntary",  // Is required 
        "eventId": document.getElementById("idEventId"),
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * This is an example of instrument search.
     * @return {void}
     */
    function findEvents() {
        const caType = document.getElementById("idCaType").value;
        const eventStatus = document.getElementById("idEventStatus").value;

        let url = demo.apiUrl + "/ca/v2/events?CorporateActionTypes=" + caType;
        if (document.getElementById("idEventStatus").value !== "-") {
            url += "&EventStatus=" + encodeURIComponent(document.getElementById("idEventStatus").value);
        }
        
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
     * This is an example of getting instrument details, option or future series.
     * @return {void}
     */
    function getEventById() {
        const eventId = document.getElementById("idEventId").value;
        let urlPath = "/ca/v2/events/" + eventId;;
        
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
        {"evt": "click", "elmId": "idBtnSearchEvents", "func": findEvents, "funcsToDisplay": [findEvents]},
        {"evt": "click", "elmId": "idBtnGetEventById", "func": getEventById, "funcsToDisplay": [getEventById]},
    ]);
    demo.displayVersion("ref");
}());
