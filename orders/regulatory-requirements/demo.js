/*jslint this: true, browser: true, long: true, unordered: true */
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
        "assetTypesList": document.getElementById("idCbxAssetType"),  // Optional
        "selectedAssetType": "Stock",  // Is required when assetTypesList is available
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * This is an example of the warning to be shown before trading a complex product.
     * @return {void}
     */
    function getComplexWarning() {

        fetch(
            demo.apiUrl + "/ref/v1/instruments/details/" + document.getElementById("idUic").value + "/" + document.getElementById("idCbxAssetType").value + "?AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&FieldGroups=OrderSetting",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson.IsTradable === false) {
                        console.error("This instrument is not tradable!");
                    } else if (responseJson.IsComplex) {
                        // Show a warning before placing an order in a complex product.
                        switch (demo.user.language) {
                        case "fr":
                        case "fr-BE":
                            console.log("Votre ordre porte sur un produit ou service complexe pour lequel vous devez avoir une connaissance et une expérience appropriées. Pour plus d’informations, veuillez consulter nos vidéos pédagogiques et nos guides.\nEn validant cet ordre, vous reconnaissez avoir été informé des risques de cette transaction.");
                            break;
                        default:
                            console.log("Your order relates to a complex product or service for which you must have appropriate knowledge and experience. For more information, please see our instructional videos and guides.\nBy validating this order, you acknowledge that you have been informed of the risks of this transaction.");
                        }
                    } else {
                        console.log("This instrument is not complex. No extra disclaimer required.");
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
     * This is an example of getting the costs of this order.
     * @return {void}
     */
    function getOrderCosts() {

        /**
         * Convert the holding period from years to days.
         * @param {number} yearsToHold The number of years to keep the investment.
         * @return {number} The number of days.
         */
        function getHoldingPeriod(yearsToHold) {
            const currentDate = new Date();
            const targetDate = new Date();
            const millisecondsInOneDay = 1000 * 60 * 60 * 24;
            targetDate.setFullYear(targetDate.getFullYear() + yearsToHold);
            return Math.round(Math.abs((targetDate - currentDate) / millisecondsInOneDay));
        }

        /**
         * Convert the holding period from years to days.
         * @param {number} holdingPeriodInDays The number of days to keep the investment.
         * @param {Object} costs The costs part from the response.
         * @return {string} The text to display.
         */
        function getCostsForLeg(holdingPeriodInDays, costs) {

            /**
             * Test if the property exists and if so, add it to the return value.
             * @param {string} componentName Name of the property object.
             * @param {string} description The description to add.
             * @param {Object} costCategory The parent object.
             * @return {string} The text to display, empty if the property doesn't exists.
             */
            function getCostComponent(componentName, description, costCategory) {
                return (
                    costCategory.hasOwnProperty(componentName)
                    ? "\n" + description + ": " + costCategory[componentName].Value + (
                        costCategory[componentName].hasOwnProperty("Pct")
                        ? " (" + costCategory[componentName].Pct + "%)"
                        : ""
                    )
                    : ""
                );
            }

            let result = "";
            if (costs.hasOwnProperty("TradingCost")) {
                result += "\n\nTransaction costs:";
                if (costs.TradingCost.hasOwnProperty("Commissions")) {  // The commission structure for the selected instrument
                    costs.TradingCost.Commissions.forEach(function (item) {
                        result += "\nCommission: " + (
                            item.Rule.Currency === costs.Currency
                            ? ""
                            : item.Rule.Currency + " "
                        ) + item.Value + (
                            item.hasOwnProperty("Pct")
                            ? " (" + item.Pct + "%)"
                            : ""
                        );
                    });
                }
                result += getCostComponent("ServiceFee", "Service fee", costs.TradingCost);  // Service fee per year for holding cash positions
                result += getCostComponent("TicketFee", "Ticket fee", costs.TradingCost);  // Ticket fees are for FX (both spot and options) and applied if below the TicketFeeThreshold
                // <Text LanguageCode="fr">Frais de ticket</Text>
                result += getCostComponent("ExchangeFee", "Exchange fee", costs.TradingCost);  // Futures - Exchange fee if applied separately
                // <Text LanguageCode="fr">Frais de bourse</Text>
                result += getCostComponent("Spread", "Spread", costs.TradingCost);  // The spread used for FX forwards is indicative and depends on how far in the future the value date of the forward is - the different time horizon is called tenors and this collection shows a current snapshot of the spreads for the different tenors
                // <Text LanguageCode="fr">Écart</Text>
                result += getCostComponent("ConversionCost", "Currency conversions", costs.TradingCost);  // Currency Conversion Cost
                // <Text LanguageCode="fr">Conversions de devise</Text>
                result += getCostComponent("CustodyFee", "Custody fee", costs.TradingCost);  // Custody fee per year for holding cash positions
                // <Text LanguageCode="fr">Droits de garde</Text>
            }
            if (costs.hasOwnProperty("FundCost")) {  // Fund cost are cost charged by a fund, but not booked by Saxo
                result += "\n\nFinancial instrument costs:";
                result += getCostComponent("OnGoingCost", "Ongoing charges", costs.FundCost);  // Fee paid for holding a position in a fund
                // <Text LanguageCode="fr">Coûts récurrents</Text>
                result += getCostComponent("SwitchCommission", "Switch commission", costs.FundCost);  // Commission paid for a switch trade between two mutual funds
                // <Text LanguageCode="fr">Commission de transfert</Text>
                result += getCostComponent("EntryCost", "Entry commission", costs.FundCost);  // Commission paid for buying a fund
                result += getCostComponent("ExitCost", "Exit commission", costs.FundCost);  // Commission paid for selling a fund
            }
            if (costs.hasOwnProperty("HoldingCost")) {
                result += "\n\nOngoing charges:";
                result += getCostComponent("OvernightFinancing", "Overnight financing fee", costs.HoldingCost);  // Financing charge markup
                // <Text LanguageCode="fr">Frais de financement au jour le jour</Text>
                result += getCostComponent("BorrowingCost", "Borrowing cost", costs.HoldingCost);  // The borrowing costs is a percentage per year for holding short positions in single-stock CFDs
                // <Text LanguageCode="fr">Coût d'emprunt</Text>
                result += getCostComponent("CarryingCost", "Carrying cost", costs.HoldingCost);  // For instruments where carrying costs are applied (futures, exchange traded options), the percentage markup on the interbank interest rate applied for holding the position
                // <Text LanguageCode="fr">Coût de portage</Text>
                result += getCostComponent("HoldingFee", "Holding fee", costs.HoldingCost);  // Holding fee if applied
                // <Text LanguageCode="fr">Frais de détention</Text>
                result += getCostComponent("LoanInterestCost", "Loan interest cost", costs.HoldingCost);
                result += getCostComponent("SwapPoints", "SwapPoints", costs.HoldingCost);  // Swap interest markup
                result += getCostComponent("InterestFee", "Interest/day", costs.HoldingCost);  // Interest per day for for SRDs
                // <Text LanguageCode="fr">Intérêts/jour</Text>
                result += getCostComponent("RolloverFee", "Roll-over of positions", costs.HoldingCost);  // Rollover fee for SRDs - Charged if position is rolled over
                // <Text LanguageCode="fr">Renouvellement de positions</Text>
                if (costs.HoldingCost.hasOwnProperty("Tax")) {
                    costs.HoldingCost.Tax.forEach(function (item) {
                        result += "\n" + item.Rule.Description + ": " + item.Value + " (" + item.Pct + "%)";
                    });
                }
            }
            result += getCostComponent("TrailingCommission", "Trailing Commission", costs);  // Commission paid from the fund to Saxo
            // <Text LanguageCode="fr">Commission de suivi</Text>
            result += "\n\nTotal costs for open and close after " + holdingPeriodInDays + " days: " + costs.Currency + " " + costs.TotalCost + (
                costs.hasOwnProperty("TotalCostPct")
                ? " (" + costs.TotalCostPct + "%)"
                : ""
            );
            return result;
        }

        /**
         * The costs calculation is based on assumptions. These are part of the response, and must be shown to the customer.
         * @param {Array<string>} assumptions The assumptions part of the response.
         * @return {string} The assumptions.
         */
        function getAssumptions(assumptions) {
            let result = "Assumption(s):";
            assumptions.forEach(function (assumption) {
                switch (assumption) {
                case "IncludesOpenAndCloseCost":
                    result += "\n* Includes both open and close costs.";
                    // <Text LanguageCode="fr">Inclut les coûts à l'ouverture et à la clôture.</Text>
                    break;
                case "EquivalentOpenAndClosePrice":
                    result += "\n* Open and close price are the same (P/L=0).";
                    // <Text LanguageCode="fr">Le cours à l'ouverture et le cours à la clôture sont identiques (B/P = 0).</Text>
                    break;
                case "BasisOnLastClosePrice":
                    result += "\n* Based on last close price.";  // Only applicable when Price is not supplied
                    // <Text LanguageCode="fr">Basé sur le dernier cours de clôture.</Text>
                    break;
                case "BasisOnMidPrice":
                    result += "\n* Based on mid-price.";  // Only applicable when Price is not supplied
                    // <Text LanguageCode="fr">Basé sur le cours moyen.</Text>
                    break;
                case "InterbankChargesExcluded":
                    result += "\n* Interbank charges are excluded.";
                    // <Text LanguageCode="fr">Les frais interbancaires ne sont pas inclus.</Text>
                    break;
                case "DefaultCallOption":
                    result += "\n* Default call option.";
                    // <Text LanguageCode="fr">Option d'achat par défaut.</Text>
                    break;
                case "AtmStrikePrice":
                    result += "\n* Strike price is assumed to be at the money.";
                    // <Text LanguageCode="fr">Le prix d'exercice est supposé être à la monnaie.</Text>
                    break;
                case "ConversionCostNotIncluded":
                    result += "\n* Conversion costs are excluded.";
                    // <Text LanguageCode="fr">Les coûts de conversion ne sont pas inclus.</Text>
                    break;
                case "NearDateSpotFarDateAsSpecified":
                    result += "\n* Near date is spot, far date is as specified.";
                    // <Text LanguageCode="fr">La date proche est le spot. La date éloignée est celle indiquée.</Text>
                    break;
                case "CarryingCostBasedOnMarginOtmDiscount":
                    result += "\n* Margin excl. OTM discount.";
                    // <Text LanguageCode="fr">Marge hors remise OTM.</Text>
                    break;
                case "ImplicitCostsNotChargedOnAccount":
                    result += "\n* The implicit costs not charged on account.";
                    break;
                case "InterestEstimationCalculatedOnValueDate":
                    result += "\n* Interest estimation is calculated from the value date of trade date + 2 days.";
                    break;
                case "MarginLoanEstimationOnCashAvailable":
                    result += "\n* The margin loan is estimated based on a snapshot based on your current Cash available to partially or fully cover the value of position.";
                    break;
                default:
                    console.error("Unsupported assumption code: " + assumption);
                }
            });
            // Add generic assumption:
            result += "\n* Any third party payments, investment service costs or financial instrument costs not listed above are 0 (0%). These can include one-off charges, ongoing charges, costs related to transactions, charges that are related to ancillary services and incidental costs.";
            // <Text LanguageCode="fr">Les coûts non décrits ci-avant (y compris forfaits, frais courants, coûts liés aux transactions, frais liés à des services accessoires et coûts indirects) s’élèvent à 0 (0 %).</Text>
            return result;
        }

        const uic = document.getElementById("idUic").value;
        const assetType = document.getElementById("idCbxAssetType").value;
        const amount = document.getElementById("idAmount").value;
        const price = document.getElementById("idPrice").value;  // SIM doesn't allow calls to price endpoint for most instruments, so just enter it here
        // https://www.developer.saxo/openapi/learn/mifid-2-cost-reporting
        fetch(
            demo.apiUrl + "/cs/v1/tradingconditions/cost/" + encodeURIComponent(demo.user.accountKey) + "/" + uic + "/" + assetType + "?Amount=" + amount + "&Price=" + price + "&FieldGroups=DisplayAndFormat&HoldingPeriodInDays=" + getHoldingPeriod(1),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let description = "";
                    if (responseJson.Cost.hasOwnProperty("Long")) {
                        description += "Long costs (" + responseJson.Cost.Long.Currency + "):" + getCostsForLeg(responseJson.HoldingPeriodInDays, responseJson.Cost.Long);
                    }
                    if (responseJson.Cost.hasOwnProperty("Short")) {
                        if (description !== "") {
                            description += "\n\n";
                        }
                        description += "Short costs (" + responseJson.Cost.Short.Currency + "):" + getCostsForLeg(responseJson.HoldingPeriodInDays, responseJson.Cost.Short);
                    }
                    description += "\n\n" + getAssumptions(responseJson.CostCalculationAssumptions);
                    console.log(description + "\n\nResponse: " + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of getting the Key Investor Information Document(s) of this instrument.
     * @return {void}
     */
    function getKid() {

        /**
         * Download a file and give it a name. Source: https://stackoverflow.com/a/48968694.
         * @param {Object} blob The downloaded blob from the response.
         * @param {string} fileName The file name to use.
         * @return {void}
         */
        function saveFile(blob, fileName) {
            if (window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveOrOpenBlob(blob, fileName);  // IE, Edge
            } else {
                const a = document.createElement("a");
                const downloadUrl = window.URL.createObjectURL(blob);
                document.body.appendChild(a);
                a.href = downloadUrl;
                a.download = fileName;
                a.click();
                setTimeout(function () {
                    window.URL.revokeObjectURL(downloadUrl);  // Release memory
                    document.body.removeChild(a);
                }, 100);
            }
        }

        /**
         * If an applicable file exists, download it.
         * @param {string} uic The Uic if the instrument.
         * @param {string} assetType The AssetType.
         * @param {string} documentType The DocumentType.
         * @param {string} language The language of the KIID.
         * @param {string} fileName The file name to use for the download, including extension.
         * @return {void}
         */
        function downloadDocument(uic, assetType, documentType, language, fileName) {
            fetch(
                demo.apiUrl + "/mkt/v2/instruments/" + uic + "/" + assetType + "/documents/pdf?DocumentType=" + documentType + "&LanguageCode=" + language,
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.blob().then(function (responseBlob) {
                        saveFile(responseBlob, fileName);
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        const uic = document.getElementById("idUic").value;
        const assetType = document.getElementById("idCbxAssetType").value;
        fetch(
            demo.apiUrl + "/mkt/v2/instruments/" + uic + "/" + assetType + "/documents/recommended?DocumentTypes=" + encodeURIComponent("KIIDs,PRIIPKIDs"),  // Request both KIIDs and PRIIP KIDs
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let fileName;
                    if (responseJson.Data.length === 0) {
                        console.log("There is no KID available for this instrument. Be aware that KIDs are only available on Live.");
                    } else {
                        console.log(JSON.stringify(responseJson, null, 4));
                        /*
                         * On SIM, there are no documents available so request returns a 404. On production, a typical response for an Etf is this:
                         * {"Data":[{"DocumentDateTime":"2020-07-23T13:21:17.000000Z","DocumentType":"KIIDs","LanguageCode":"fr"}]}
                         * Etfs have KIIDs, derivatives PRIIPKIDs.
                         */
                        // The recommended documents will be returned. If language is important from a legal perspective, only the applicable language is returned.
                        // Give option to download all the documents, if any:
                        responseJson.Data.forEach(function (documentDetail) {
                            // Note that DocumentTypes might have different translations, like "EID" in the Netherlands (https://www.afm.nl/nl-nl/consumenten/themas/advies/verplichte-info/eid).
                            // This means that you might consider a different file name, for example including the instrument name.
                            fileName = uic + "_" + assetType + "_" + documentDetail.DocumentType + "_(" + documentDetail.LanguageCode + ").pdf";
                            if (window.confirm("Do you want to download " + fileName + "?")) {
                                downloadDocument(uic, assetType, documentDetail.DocumentType, documentDetail.LanguageCode, fileName);
                            }
                        });
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
     * This sample can be used for other AssetTypes than Stock. After switching, retrieve a valid Asset.
     * @return {void}
     */
    function findInstrumentsForAssetType() {

        /**
         * For options, the identifier is an OptionRoot. Convert this to a Uic.
         * @param {number} optionRootId The identifier from the instrument response
         * @return {void}
         */
        function convertOptionRootIdToUic(optionRootId) {
            fetch(
                demo.apiUrl + "/ref/v1/instruments/contractoptionspaces/" + optionRootId,
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        document.getElementById("idUic").value = responseJson.OptionSpace[0].SpecificOptions[0].Uic;  // Select first contract
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        const assetType = document.getElementById("idCbxAssetType").value;
        let uic;
        fetch(
            demo.apiUrl + "/ref/v1/instruments?AssetTypes=" + assetType + "&IncludeNonTradable=false&$top=1" + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let instrument;
                    if (responseJson.Data.length === 0) {
                        console.error("No instrument of type " + assetType + " found.");
                    } else {
                        instrument = responseJson.Data[0];  // Just take the first instrument - it's a demo
                        uic = instrument.Identifier;  // This might only be an OptionRootId!
                        document.getElementById("idUic").value = uic;
                        if (instrument.SummaryType === "ContractOptionRoot") {
                            convertOptionRootIdToUic(instrument.Identifier);
                        } else {
                            console.log("Found Uic " + uic + " for AssetType " + assetType + ".");
                        }
                    }
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxAssetType", "func": findInstrumentsForAssetType, "funcsToDisplay": [findInstrumentsForAssetType]},
        {"evt": "click", "elmId": "idBtnComplexWarning", "func": getComplexWarning, "funcsToDisplay": [getComplexWarning]},
        {"evt": "click", "elmId": "idBtnGetOrderCosts", "func": getOrderCosts, "funcsToDisplay": [getOrderCosts]},
        {"evt": "click", "elmId": "idBtnGetKid", "func": getKid, "funcsToDisplay": [getKid]}
    ]);
    demo.displayVersion("trade");
}());
