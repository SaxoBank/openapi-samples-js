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
        "footerElm": document.getElementById("idFooter")
    });

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
            const req = "Request:\nGET " + response.url + " status " + response.status + " " + response.statusText;
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Times are in UTC. Convert them to local time:
                    const lastLoginDate = new Date(responseJson.LastLoginTime).toLocaleString();
                    const rep = "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                    let logMessage = "Found user with clientKey " + responseJson.ClientKey + " (required for other requests).\nLast login @ " + lastLoginDate + ".\n\n";
                    if (!responseJson.MarketDataViaOpenApiTermsAccepted) {
                        logMessage += "!!!\nUser didn't accept the terms for receiving Market Data yet.\nSIM users cannot do this, but if your app will request Price data on Live, make sure you ask the user to enable Market Data in SaxoTraderGO via 'Account - Other - OpenAPI data access'.\nOtherwise the user might blaim your app.. ;-)\n!!!\n\n";
                    }
                    console.log(logMessage + req + rep);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request the client information.
     * @return {void}
     */
    function getClient() {
        fetch(
            demo.apiUrl + "/port/v1/clients/me",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            const req = "\n\nRequest:\nGET " + response.url + " status " + response.status + " " + response.statusText;
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const rep = "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                    // The default account can be used for the initial population of the screen.
                    console.log("Found client with default accountKey " + responseJson.DefaultAccountKey + "." + req + rep);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request the accounts of this user.
     * @return {void}
     */
    function getAccounts() {
        fetch(
            demo.apiUrl + "/port/v1/accounts/me",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            const req = "\n\nRequest:\nGET " + response.url + " status " + response.status + " " + response.statusText;
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const rep = "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                    let textToDisplay = "";
                    let currentAccountGroupName = "";
                    demo.groupAndSortAccountList(responseJson.Data);
                    responseJson.Data.forEach(function (account) {
                        // Loop through the data and collect the accountKeys:
                        if (account.hasOwnProperty("AccountGroupName") && account.AccountGroupName !== currentAccountGroupName) {
                            currentAccountGroupName = account.AccountGroupName;
                            textToDisplay += currentAccountGroupName + ":\n";
                        }
                        textToDisplay += (
                            account.AccountKey === demo.user.accountKey  // Make the selected (and probably default) account bold or something..
                            ? "** "
                            : " - "
                        );
                        if (account.hasOwnProperty("DisplayName")) {
                            textToDisplay += account.DisplayName + " " + account.AccountId;
                        } else {
                            textToDisplay += account.AccountId;
                        }
                        textToDisplay += " " + account.Currency + " - " + account.AccountKey + " (" + account.AccountType + ")\n";
                    });
                    console.log("Found " + responseJson.Data.length + " account(s) with accountKey(s):\n" + textToDisplay + req + rep);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request the balance for the selected account.
     * @return {void}
     */
    function getBalance() {
        fetch(
            demo.apiUrl + "/port/v1/balances?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            const req = "\n\nRequest:\nGET " + response.url + " status " + response.status + " " + response.statusText;
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const rep = "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                    // Show a value in account currency and decimals:
                    const cash = responseJson.Currency + " " + responseJson.TotalValue.toFixed(responseJson.CurrencyDecimals);
                    console.log("The selected account has a total balance of " + cash + "." + req + rep);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This function collects the access rights of the logged in user.
     * @return {void}
     */
    function getAccessRights() {
        // Don't be scared by this list. It just contains all possible operations a user can have.
        // The list is long, because whitelabels can use it for their app, asset managers, advisors and thirdparty apps.
        const operations = {
            "OAPI.OP.Admin": "Call one of the admin endpoints.",
            "OAPI.OP.ApproveModels": "User can approve the model.",
            "OAPI.OP.AssignAccountsToModels": "User can assign accounts to models.",
            "OAPI.OP.BulkReportsOnOwnedClients": "Can generate reports in bulk for for clients in hierarchy.",
            "OAPI.OP.CanAddBookingForExternalInstrument": "Can upload a CSV File for bulk booking.",
            "OAPI.OP.CanAdviseOnOrders": "Can advise on orders on your account.",
            "OAPI.OP.CanAdviseOnOrdersOnOwnedClients": "Can advise on orders for clients in hierarchy.",
            "OAPI.OP.CanAdviseOnOrdersOnRestrictedClients": "Can advise on orders for linked clients.",
            "OAPI.OP.CanApplyServiceFee": "Can apply service fee on your orders.",
            "OAPI.OP.CanApplyServiceFeeOnAnyClient": "Can apply service fees on any client.",
            "OAPI.OP.CanApplyServiceFeeOnOwnedClients": "Can apply service fees for clients in hierarchy.",
            "OAPI.OP.CanApplyServiceFeeOnRestrictedClients": "Can apply service fees for linked clients.",
            "OAPI.OP.CanMaintainAllInstrumentDocuments": "Can read/write/update all instrument documents.",
            "OAPI.OP.CanManageFundInducements": "Manage Fund Inducements.",
            "OAPI.OP.CanManageKID": "Can Read and Update Key Information Documents (PRIIPS/KIID).",
            "OAPI.OP.CanTradeOnBehalfOfUser": "Can trade on behalf of users.",
            "OAPI.OP.CanUpdatePriceForUnlistedInstrument": "User can update prices for unlisted instruments.",
            "OAPI.OP.CanViewAllInstrumentDocuments": "User can read all instrument documents.",
            "OAPI.OP.CreateSupportTicket": "User can create a support ticket.",
            "OAPI.OP.DealCapture": "Allow deal capture trades.",
            "OAPI.OP.DeleteAccountsFromModels": "User can delete accounts linked to model.",
            "OAPI.OP.DiagnoseStreaming": "Allows diagnosis of streaming connections.",
            "OAPI.OP.EditBenchmarks": "User can edit benchmarks.",
            "OAPI.OP.EditModels": "User can create and edit the model.",
            "OAPI.OP.EditPartnerSettings": "User can edit partner settings data.",
            "OAPI.OP.EmployeeOnlyLogs": "Can view employee only activity logs.",
            "OAPI.OP.EnableModelsToPartners": "Enable saxo models to partners.",
            "OAPI.OP.FeedbackOnboardingOnOwnedClients": "Provide onboarding feedback for clients in hierarchy.",
            "OAPI.OP.FeedbackRenewalsOnOwnedClients": "Can respond to renewal status for clients in hierarchy.",
            "OAPI.OP.ManageAccountsOnOwnedClients": "Create and update accounts of clients in hierarchy.",
            "OAPI.OP.ManageCashOnOwnedClients": "Transfer cash of clients in hierarchy.",
            "OAPI.OP.ManageCashTransferViaFundingAccount": "Transfer between WLC funding and client account.",
            "OAPI.OP.ManageCashTransferViaFundingAccountForce": "Force transfer between WLC fund and client account.",
            "OAPI.OP.ManageCashTransfers": "You can transfer cash in and out on your accounts.",
            "OAPI.OP.ManageCertificates": "Manage (create and delete) your certificates.",
            "OAPI.OP.ManageCertificatesOnOwnedClients": "Manage user certificates for clients in hierarchy.",
            "OAPI.OP.ManageClientOnboarding": "Manage client onboarding (create new clients).",
            "OAPI.OP.ManageCorporateActions": "User can manage corporate actions.",
            "OAPI.OP.ManageCorporateActionsOnAnyClient": "Can manage corporate actions on any client.",
            "OAPI.OP.ManageCorporateActionsOnOwnedClients": "User can manage corporate actions for clients in hierarchy.",
            "OAPI.OP.ManageCorporateActionsOnRestrictedClients": "User can elect on behalf of linked clients.",
            "OAPI.OP.ManageDocumentsOnOwnedClients": "Create and update documents for clients in hierarchy.",
            "OAPI.OP.ManageInterAccountTransfers": "Allows transfers between two of your accounts.",
            "OAPI.OP.ManageInterAccountTransfersOnOwnedClients": "Allows transfers between two accounts on under the same client, to be performed for clients in hierarchy.",
            "OAPI.OP.ManagePII": "Manage your PII data.",
            "OAPI.OP.ManagePIIOwnedClients": "Manage PII for clients in hierarchy.",
            "OAPI.OP.ManageSecuritiesTransfers": "Can request your security transfers.",
            "OAPI.OP.ManageSecuritiesTransfersOnOwnedClients": "Can request security transfers for clients in hierarchy.",
            "OAPI.OP.ManageSubAccountSecuritiesTransfers": "Manage sub-account security transfers.",
            "OAPI.OP.ManageSuitability": "Manage your asset type suitability.",
            "OAPI.OP.ManageSuitabilityOnOwnedClients": "Manage asset type suitability for clients in hierarchy.",
            "OAPI.OP.ManageSuitabilityOnRestrictedClients": "Manage asset type suitability for linked clients.",
            "OAPI.OP.ManageSupportCases": "Manage your support cases.",
            "OAPI.OP.ManageSupportCasesOnOwnedClients": "Can manage support cases for clients in hierarchy.",
            "OAPI.OP.OrderPhoneApproval": "Can approve your orders by phone.",
            "OAPI.OP.OrderPhoneApprovalOnAnyClient": "Can approve orders by phone on any client.",
            "OAPI.OP.OrderPhoneApprovalOnOwnedClients": "Can approve orders by phone of clients in hierarchy.",
            "OAPI.OP.OrderPhoneApprovalOnRestrictedClients": "Can approve orders by phone of linked clients.",
            "OAPI.OP.PlatformConfiguration": "Allow changes to Investor layout for clients.",
            "OAPI.OP.PlatformConfigurationOnAnyClient": "Allow changes to Investor layout for IB clients.",
            "OAPI.OP.PlatformExportScreenContent": "User can export screen content to file.",
            "OAPI.OP.PrebookFundingFromExternalSource": "Partner to pre-book funds on a client account.",
            "OAPI.OP.RebalanceAccount": "User can rebalance the account.",
            "OAPI.OP.RebalanceModel": "User can rebalance the model.",
            "OAPI.OP.SMSG.ClientOnboarding.Reply": "Reply to secure messaging thread on onboarding.",
            "OAPI.OP.SMSG.ClientOnboarding.View": "View secure messaging thread on onboarding.",
            "OAPI.OP.SMSG.PCM.Reply": "Reply to your messages on cases.",
            "OAPI.OP.SMSG.PCM.ReplyOnOwnedClients": "Reply on cases for clients in hierarchy.",
            "OAPI.OP.SMSG.PartnerCaseManagement.Reply": "Reply to secure messaging thread on cases.",
            "OAPI.OP.SMSG.PartnerCaseManagement.View": "View secure messaging thread on cases.",
            "OAPI.OP.TakePriceSession": "Take the premium price feed.",
            "OAPI.OP.TakeTradeSession": "Take the fulltradingandchat mode.",
            "OAPI.OP.TemporaryParkedOrders": "You can park your orders.",
            "OAPI.OP.TemporaryParkedOrdersOnAnyClient": "Park orders of any client.",
            "OAPI.OP.TemporaryParkedOrdersOnOwnedClients": "Park orders for clients in hierarchy.",
            "OAPI.OP.TemporaryParkedOrdersOnRestrictedClients": "Park orders for linked clients.",
            "OAPI.OP.Trading": "You can trade.",
            "OAPI.OP.TradingOnOwnedClients": "Trade on accounts of clients in hierarchy.",
            "OAPI.OP.TradingOnRestrictedClients": "Trade on accounts of linked clients.",
            "OAPI.OP.UpdateLimitConfiguration": "You can update the limit configuration in liquidity management.",
            "OAPI.OP.UserPreferences": "Can change your user preferences.",
            "OAPI.OP.UserPreferencesForAnyClients": "Can change user preferences on any clients.",
            "OAPI.OP.UserPreferencesForOwnedClients": "Can change user preferences for clients in hierarchy.",
            "OAPI.OP.View": "You have view-access.",
            "OAPI.OP.ViewAllModelConnections": "You can view all model connections.",
            "OAPI.OP.ViewAnyClient": "See data for any client.",
            "OAPI.OP.ViewAnyInstrument": "See data for any instrument.",
            "OAPI.OP.ViewBenchmarks": "User can view benchmarks.",
            "OAPI.OP.ViewCashTransferViaFundingAccount": "View status of transfer between WLC funding and client.",
            "OAPI.OP.ViewModels": "User can view data of models.",
            "OAPI.OP.ViewOnboardingOnOwnedClients": "View onboarding status of clients in hierarchy.",
            "OAPI.OP.ViewOwnClientModelConnections": "You can view your model connection.",
            "OAPI.OP.ViewOwnClientModels": "You can view accounts linked to model.",
            "OAPI.OP.ViewOwnedClients": "User can view clients in hierarchy.",
            "OAPI.OP.ViewPII": "View your PII data.",
            "OAPI.OP.ViewPIIOnRestrictedClients": "Can see PII data of linked clients.",
            "OAPI.OP.ViewPIIOwnedClients": "View PII data for clients in hierarchy.",
            "OAPI.OP.ViewPartnerSettings": "User can view partner settings.",
            "OAPI.OP.ViewRelayoutReport": "Can view the historical reports in updated layout.",
            "OAPI.OP.ViewRenewalsOnOwnedClients": "User can view renewal status of clients in hierarchy.",
            "OAPI.OP.ViewRestrictedClients": "User can see linked clients.",
            "OAPI.OP.ViewSaxoModels": "User can view Saxo models.",
            "OAPI.OP.ViewSuitability": "View your instrument suitability.",
            "OAPI.OP.ViewSuitabilityOnAnyClient": "View asset type suitability for all clients.",
            "OAPI.OP.ViewSuitabilityOnOwnedClients": "View asset type suitability for clients in hierarchy.",
            "OAPI.OP.ViewSuitabilityOnRestrictedClients": "View asset type suitability of linked clients.",
            "OAPI.OP.ViewSupportCases": "View your support cases.",
            "OAPI.OP.ViewSupportCasesOnOwnedClients": "Can view support cases for clients in hierarchy."
        };
        const roles = {
            "OAPI.Roles.AnonymousSaxoApplication": "You are signed in using a Saxobank application.",
            "OAPI.Roles.AnonymousThirdPartyApplication": "You are signed in with a thirdparty application.",
            "OAPI.Roles.ApproveModels": "Can approve models created by other users.",
            "OAPI.Roles.CommunityAccessApplication": "You are signed in using a community application.",
            "OAPI.Roles.ContentEditor": "You can edit the layout and media used in the Saxo Investor Platform.",
            "OAPI.Roles.Default": "Regular customer.",
            "OAPI.Roles.Default.StepUpAuthentication": "You are a regular customer, but stepup up authentication is required for modifications.",
            "OAPI.Roles.FinancialAdvisor": "Financial Advisor (FA).",
            "OAPI.Roles.ManageModelsandBenchmarks": "Can create and modify models & benchmarks and rebalance.",
            "OAPI.Roles.ManageSLICLimitConfiguration": "You can update the limit configuration in liquidity management.",
            "OAPI.Roles.PartnerSupport": "View and manage support cases of clients in hierarchy.",
            "OAPI.Roles.RetailClient": "Retail Client.",
            "OAPI.Roles.RetailClientNotFullyFunded": "Retail client, but not yet fully funded.",
            "OAPI.Roles.Trader": "Trader.",
            "OAPI.Roles.ViewAnyClient": "Allows users to view all clients.",
            "OAPI.Roles.ViewAnyInstrument": "Allows users to search any instrument.",
            "OAPI.Roles.ViewModelsandBenchmarks": "Can view models & benchmarks.",
            "OAPI.Roles.ViewPII": "Access to PII data of all available clients."
        };
        fetch(
            demo.apiUrl + "/root/v1/user",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let responseText = "This user is entitled for the following operations:\n\n";
                    responseJson.Operations.forEach(function (operation) {
                        if (operations.hasOwnProperty(operation)) {
                            responseText += operation + ": " + operations[operation] + "\n";
                        } else {
                            responseText += "Unrecognized (new) operation: " + operation + "\n";
                        }
                    });
                    responseText += "\n..and the following role(s):\n\n";
                    responseJson.Roles.forEach(function (role) {
                        if (roles.hasOwnProperty(role)) {
                            responseText += role + ": " + roles[role] + "\n";
                        } else {
                            responseText += "Unrecognized (new) role: " + role + "\n";
                        }
                    });
                    responseText += "\nResponse: " + JSON.stringify(responseJson, null, 4);
                    console.log(responseText);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetUser", "func": getUser, "funcsToDisplay": [getUser]},
        {"evt": "click", "elmId": "idBtnGetClient", "func": getClient, "funcsToDisplay": [getClient]},
        {"evt": "click", "elmId": "idBtnGetAccounts", "func": getAccounts, "funcsToDisplay": [getAccounts, demo.groupAndSortAccountList]},
        {"evt": "click", "elmId": "idBtnGetBalance", "func": getBalance, "funcsToDisplay": [getBalance]},
        {"evt": "click", "elmId": "idBtnGetAccessRights", "func": getAccessRights, "funcsToDisplay": [getAccessRights]}
    ]);
    demo.displayVersion("port");
}());
