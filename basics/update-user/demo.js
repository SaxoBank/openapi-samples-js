/*jslint this: true, browser: true, long: true, for: true, unordered: true */
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
    let languageCode;
    let cultureCode;
    let timeZoneId;

    /**
     * Request the user information.
     * @return {void}
     */
    function getUser() {
        fetch(
            demo.apiUrl + "/port/v1/users/me",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    languageCode = responseJson.Language;
                    cultureCode = responseJson.Culture;
                    timeZoneId = responseJson.TimeZoneId;
                    console.log("The users Language, Culture and TimeZone:\n" + languageCode + "\n" + cultureCode + "\n" + timeZoneId);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Remove all items from a combo box.
     * @param {Object} listElement The combo box element.
     * @return {void}
     */
    function clearList(listElement) {
        let i;
        for (i = listElement.options.length - 1; i >= 0; i -= 1) {
            listElement.remove(i);
        }
    }

    /**
     * Add an option to a combo box.
     * @param {Object} listElement The combo box element.
     * @param {string} displayText The text that will be visible.
     * @param {string} value The value.
     * @param {boolean} isSelected Default selected option.
     * @return {void}
     */
    function addOption(listElement, displayText, value, isSelected) {
        let option;
        option = document.createElement("option");
        option.text = displayText;
        option.value = value;
        if (isSelected) {
            option.setAttribute("selected", true);  // Make the selected type the default one
        }
        listElement.add(option);
    }

    /**
     * Sort list and add to a combo box.
     * @param {Array[Array<string>}} arr The array with options.
     * @param {string} elmId The id of the element.
     * @param {string} selectedValue The value to select.
     * @return {void}
     */
    function populateSelect(arr, elmId, selectedValue) {
        const listElement = document.getElementById(elmId);
        clearList(listElement);
        arr.sort();
        arr.forEach(function (values) {
            addOption(listElement, values[0], values[1], values[1] === selectedValue);
        });
    }

    /**
     * Request the languages.
     * @return {void}
     */
    function getLanguages() {
        fetch(
            demo.apiUrl + "/ref/v1/languages",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const languageArray = [];
                    responseJson.Data.forEach(function (language) {
                        languageArray.push([language.LanguageName + " (" + language.NativeName + ")", language.LanguageCode]);
                    });
                    populateSelect(languageArray, "idCbxLanguage", languageCode);
                    console.log("Received " + responseJson.Data.length + " languages.");
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request the cultures.
     * @return {void}
     */
    function getCultures() {
        fetch(
            demo.apiUrl + "/ref/v1/cultures",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const cultureArray = [];
                    responseJson.Data.forEach(function (culture) {
                        cultureArray.push([culture.Name + " / " + culture.CultureCode, culture.CultureCode]);
                    });
                    populateSelect(cultureArray, "idCbxCulture", cultureCode);
                    console.log("Received " + responseJson.Data.length + " cultures.");
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request the time zones.
     * @return {void}
     */
    function getTimeZones() {
        fetch(
            demo.apiUrl + "/ref/v1/timezones",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const timeZoneArray = [];
                    responseJson.Data.forEach(function (timeZone) {
                        timeZoneArray.push([timeZone.ZoneName + " (" + timeZone.DisplayName + ")", timeZone.TimeZoneId]);
                    });
                    populateSelect(timeZoneArray, "idCbxTimeZone", timeZoneId.toString());
                    console.log("Received " + responseJson.Data.length + " time zones.");
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request the data for the selection lists.
     * @return {void}
     */
    function getLanguagesCulturesTimeZones() {
        getLanguages();
        getCultures();
        getTimeZones();
    }

    /**
     * PATCH the user data.
     * @return {void}
     */
    function updateUser() {
        const url = demo.apiUrl + "/port/v1/users/me";
        const userData = {};
        const newLanguageCode = document.getElementById("idCbxLanguage").value;
        const newCultureCode = document.getElementById("idCbxCulture").value;
        const newTimeZoneId = document.getElementById("idCbxTimeZone").value;
        // Only update the changed values.
        if (newLanguageCode !== languageCode) {
            languageCode = newLanguageCode;
            userData.Language = languageCode;
        }
        if (newCultureCode !== cultureCode) {
            cultureCode = newCultureCode;
            userData.Culture = cultureCode;
        }
        if (newTimeZoneId !== timeZoneId) {
            timeZoneId = newTimeZoneId;
            userData.TimeZoneId = timeZoneId;
        }
        fetch(
            url,
            {
                "method": "PATCH",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify(userData)
            }
        ).then(function (response) {
            if (response.ok) {
                console.log("The user preferences have been updated with the following request:\n\nPATCH " + url + "\nData: " + JSON.stringify(userData, null, 4));
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetUser", "func": getUser, "funcsToDisplay": [getUser]},
        {"evt": "click", "elmId": "idBtnGetLanguagesCulturesTimeZones", "func": getLanguagesCulturesTimeZones, "funcsToDisplay": [getLanguagesCulturesTimeZones, getLanguages, getCultures, getTimeZones]},
        {"evt": "click", "elmId": "idBtnUpdateUser", "func": updateUser, "funcsToDisplay": [updateUser]}
    ]);
    demo.displayVersion("port");
}());
