/*jslint this: true, browser: true, for: true, long: true, unordered: true */
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

    addDateParam(-6, -1, "pastFiveDays");
    addDateParam(-11, -1, "pastTenDays");

    /**
     * Returns query parameters within the from and to range, for the named option
     * @param {number} from
     * @param {number} to
     * @param {string} name
     */
    function addDateParam(from, to, name) {
        var dateParam = "";
        var toDate = new Date();
        var fromDate = new Date();
        toDate.setDate(toDate.getDate() + to);
        fromDate.setDate(fromDate.getDate() + from);
        dateParam = "&FromDate=" + fromDate.toISOString().split("T")[0] + "&ToDate=";
        dateParam += toDate.toISOString().split("T")[0];
        document.getElementsByName(name).forEach(function (option) {
            option.value = dateParam;
        });
    }
    /**
     * Reads the selected value of the dropdowns to return the relevant input for the request.
     * @param {string} identifier
     * @returns {string}
     */
    function read(identifier) {
        const selected = document.getElementById("idCbx" + identifier).selectedOptions;
        var fieldGroups = "";
        var i;
        //if set is returned(only FieldGroup), get all inputs
        if (selected.length > 1) {
            // forEach cannot be applied to this object, for reasons.
            for (i = 0; i < selected.length; i += 1) {
                //if All is included in selected, only return that entry.
                if (selected[i].value === "All") {
                    return "All";
                }
                fieldGroups += selected[i].value + ",";
            }
            return fieldGroups.slice(0, -1);
        }
        //or get the single selected input
        if (document.getElementById("idCbx" + identifier).selectedOptions[0]) {
            return document.getElementById("idCbx" + identifier).selectedOptions[0].value;
        }
        //default All case, if nothing was selected.
        return "All";
    }

    /**
     * Parse key information out of response and return formatted text for display
     * @param {Object} response
     * @param {string} requestType
     * @param {string} requestUrl
     * @param {string} params
     * @returns {string}
     */
    function parseResponse(requestUrl) {
        return "Endpoint: \n\t" + requestUrl.split("?")[0].split("openapi")[1] + "?\nParameters: \n\t" + requestUrl.split("?")[1].replaceAll("&", "&\n\t") + "\n";
    }

    /**
     * Get the performance summary for a client entity in the specified date range
     * @return {void}
     */
    function getClientTimeseries() {
        getTimeseries(demo.apiUrl + "/hist/v4/performance/timeseries?ClientKey=" + encodeURIComponent(demo.user.clientKey));
    }

    /**
     * Get the performance summary for an account entity in the specified date range
     * @return {void}
     */
    function getAccountTimeseries() {
        getTimeseries(demo.apiUrl + "/hist/v4/performance/timeseries?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountKey=" + encodeURIComponent(demo.user.accountKey));
    }

    /**
     * Get the performance summary for an entity in the specified date range
     * @return {void}
     */
    function getTimeseries(url) {
        const param = read("TimeseriesDateRange") + "&FieldGroups=" + read("TimeseriesFieldGroups");
        fetch(
            url + param,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log(parseResponse(url + param) + JSON.stringify(responseJson, null, 2));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Get the performance summary for a client entity in the specified date range
     * @return {void}
     */
    function getClientSummary() {
        getSummary(demo.apiUrl + "/hist/v4/performance/summary?ClientKey=" + encodeURIComponent(demo.user.clientKey));
    }

    /**
     * Get the performance summary for an account entity in the specified date range
     * @return {void}
     */
    function getAccountSummary() {
        getSummary(demo.apiUrl + "/hist/v4/performance/summary?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountKey=" + encodeURIComponent(demo.user.accountKey));
    }

    /**
     * Get the performance summary for an entity in the specified date range
     * @return {void}
     */
    function getSummary(url) {
        const param = read("SummaryDateRange") + "&FieldGroups=" + read("SummaryFieldGroups");
        fetch(
            url + param,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log(parseResponse(url + param) + JSON.stringify(responseJson, null, 2));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetClientSummary", "func": getClientSummary, "funcsToDisplay": [getSummary, getClientSummary]},
        {"evt": "click", "elmId": "idBtnGetAccountSummary", "func": getAccountSummary, "funcsToDisplay": [getSummary, getAccountSummary]},
        {"evt": "click", "elmId": "idBtnGetClientTimeseries", "func": getClientTimeseries, "funcsToDisplay": [getTimeseries, getClientTimeseries]},
        {"evt": "click", "elmId": "idBtnGetAccountTimeseries", "func": getAccountTimeseries, "funcsToDisplay": [getTimeseries, getAccountTimeseries]}
    ]);
    demo.displayVersion("hist");
}());
