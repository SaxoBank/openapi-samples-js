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
     * This is an example of finding events.
     * @return {void}
     */
    function findEvents() {
        const caType = document.getElementById("idCaType").value;
        const eventStatus = document.getElementById("idEventStatus").value;
        let url = demo.apiUrl + "/ca/v2/events?CorporateActionTypes=" + caType;
        if (eventStatus !== "-") {
            url += "&EventStatus=" + encodeURIComponent(eventStatus);
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
                    let result = (
                        responseJson.Data.length === 0
                        ? "No events found."
                        : "Found " + responseJson.Data.length + " events: "
                    );
                    console.log(result + "\n\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of getting event details.
     * @return {void}
     */
    function getEventById() {
        const eventId = document.getElementById("idEventId").value;
        fetch(
            demo.apiUrl + "/ca/v2/events/" + eventId,
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
        {"evt": "click", "elmId": "idBtnGetEventById", "func": getEventById, "funcsToDisplay": [getEventById]}
    ]);
    demo.displayVersion("ref");
}());