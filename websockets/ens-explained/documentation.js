function addRemarksToEnsEvent(ensEvent) {

    function addOrderEventRemarks() {
        ensEvent.OrderId += " [Orders always come with an ID.]";
        if (ensEvent.hasOwnProperty("ReferenceId")) {
            // Sometimes orders have an external reference:
            ensEvent.ReferenceId += " [Optional correlation to the order supplied by thirdparty when placing. This helps, because sometimes the order event is faster than the POST /orders response.]";
        }
        /*
         *  ORDER TYPE
         */
        switch (ensEvent.OrderType) {
        case "Market":
            ensEvent.OrderType += " [A market order is directly executed against the best bid/ask.]";
            break;
        case "Limit":
            ensEvent.OrderType += " [A limit order comes with a price.]";
            ensEvent.Price += " [The limit price.]";
            break;
        case "StopLimit":
            ensEvent.OrderType += " [A buy StopLimit order will turn in to a regular limit order once the price goes beyond the OrderPrice. The limit order will have a OrderPrice of the StopLimitPrice.]";
            ensEvent.Price += " [For StopLimit orders: The stop price.]";
            ensEvent.StopLimitPrice += " [For StopLimit orders: The limit price of the new order.]";
            break;
        case "StopIfTraded":
            ensEvent.OrderType += " [A stop order comes with a price - when that is reached, the order goes to the market as market order.]";
            ensEvent.Price += " [For Stop orders: The stop price.]";
            break;
        case "TrailingStopIfTraded":
            ensEvent.OrderType += " [A trailing stop order type is used to guard a position against a potential loss, but the order price follows that of the position when the price goes up. It does so in steps, trying to keep a fixed distance to the current price.]";
            ensEvent.Price += " [The stop price.]";
            ensEvent.TrailingStopDistanceToMarket += " [Distance between stop price and current price.]";
            ensEvent.TrailingStopStep += " [Step to raise the stop price when the price goes up.]";
            break;
        case "Algorithmic":
            ensEvent.OrderType += " [An algo order.]";
            switch (ensEvent.AlgoOrderTradingStrategy) {
            case "Pre-Market Limit":
                ensEvent.AlgoOrderTradingStrategy += " [The strategy Pre-Market Limit.]";
                ensEvent.Price += " [The limit price for the ETH (algo) order.]";
                break;
            default:
                console.error("Error: Order with Strategy " + ensEvent.AlgoOrderTradingStrategy + " is not documented.");
            }
            break;
        default:
            console.error("Error: Order with OrderType " + ensEvent.OrderType + " is not documented.");
        }
        /*
         *  ORDER STATUS
         */
        switch (ensEvent.Status) {
        case "Placed":
            ensEvent.Status += " [This is a new order.]";
            break;
        case "FinalFill":
            ensEvent.Status += " [This order is fully executed.]";
            break;
        default:
            console.error("Error: Order with Status " + ensEvent.Status + " is not documented.");
        }
        /*
         *  ORDER DURATION
         */
        switch (ensEvent.Duration.DurationType) {
        case "GoodTillCancel":
            ensEvent.Duration.DurationType += " [This order remains active until canceled.]";
            break;
        case "DayOrder":
            ensEvent.Duration.DurationType += " [This order is only active for the current exchange day.]";
            break;
        default:
            console.error("Error: Order with Duration.DurationType " + ensEvent.Duration.DurationType + " is not documented.");
        }
        /*
         *  ORDER RELATION
         */
        switch (ensEvent.OrderRelation) {
        case "StandAlone":
            ensEvent.OrderRelation += " [This order has no relations with other orders.]";
            break;
        case "Oco":
            ensEvent.OrderRelation += " [This is a One-Cancels-the-Other (OCO) order, so there are related orders.]";
            break;
        default:
            console.error("Error: Order with OrderRelation " + ensEvent.OrderRelation + " is not documented.");
        }
        ensEvent.CorrelationKey += " [If there are relations with other orders, they share the CorrelationKey.]";
    }

    function addPositionEventRemarks() {
        if (ensEvent.hasOwnProperty("SourceOrderId")) {
            // This is an event coming from an order:

        } else if (ensEvent.hasOwnProperty("ToolId")) {
            // This is an event not coming from an order, but from a corporate action, asset transfer or other source:
            switch (ensEvent.ToolId) {
            case 10:  // Corporate Action
                addPositionEventCorporateAction();
                break;
            case 26:  // Barrier Event Tool ID
                break;
            case 24:  // Barrier Monitor Tool ID
                break;
            case 7:  // Cash Back Office Tool
                break;
            case 38:  // Cash Settlement Tool ID
                break;
            case 10:  // Corporate Action Tool ID
                break;
            case 49:  // Front Arena Assignment Tool ID
                break;
            case 50:  // Front Arena Expiry Tool ID
                break;
            case 54:  // Front Arena Trade Correction Tool ID
                break;
            case 19:  // Future Expiry Tool ID
                break;
            case 11:  // Trade Correction
                break;
            default:
                console.error("Unsupported ToolId: " + ensEvent.ToolId);
                break;
            }
        } else {
            console.error("Undocumented Position event found.");
        }
    }

    function processMessage() {
        /*
         *  This are the generic ENS fields
         *  https://www.developer.saxo/openapi/learn/event-notification
         */
        const activityTime = new Date(ensEvent.ActivityTime);
        ensEvent.ActivityTime += " [This field is always present in events - local time: " + activityTime.toLocaleString() + ".]";
        ensEvent.SequenceId += " [This message ID can be used in the subscription request, when the connection must be recovered for a certain message.]";
        ensEvent.AccountId += " [Identifies the account involved in the transaction.]";
        ensEvent.AccountKey += " [Identifies the account involved in the transaction.]";
        ensEvent.ClientId += " [Identifies the client involved in the transaction.]";
        ensEvent.ClientKey += " [Identifies the client involved in the transaction.]";
        if (ensEvent.hasOwnProperty("ExchangeInfo")) {
            // Applicable for Orders and Positions
            ensEvent.ExchangeInfo.ExchangeId += " [Reference to the Exchange. You get this when the FieldGroup 'ExchangeInfo' was requested.]";
        }
        if (ensEvent.hasOwnProperty("DisplayAndFormat")) {
            // Applicable for Orders and Positions
            ensEvent.DisplayAndFormat.Description += " [Name of the instrument. You get this when the FieldGroup 'DisplayAndFormat' was requested.]";
        }
        /*
         *  From here, per activity, the messages are described.
         */
        switch (ensEvent.ActivityType) {
        case "Orders":
            /*
             *  ORDER
             *  https://www.developer.saxo/openapi/learn/order-events
             */
            ensEvent.ActivityType += " [The activity is the event type. Subscribe for different ActivityTypes by specifying the Activities in the subscription request. This is an order event. Examine the OrderType and Status to get more info.]";
            addOrderEventRemarks();
            break;
        case "Positions":
            // ToolId: https://wiki/display/BO2/Specs+for+Order+Placement+Tools
            // https://www.developer.saxo/openapi/learn/position-events
            ensEvent.ActivityType += " [The activity is the event type. Subscribe for different ActivityTypes by specifying the Activities in the subscription request. This is a position event. Examine the PositionEvent, ToolId or SourceOrderId to get more info.]";
            addPositionEventRemarks();
            break;
        default:
            
            // https://www.developer.saxo/openapi/learn/margin-call-events
            // https://www.developer.saxo/openapi/learn/account-funding-events
            // https://www.developer.saxo/openapi/learn/account-depreciation-events
            // https://www.developer.saxo/openapi/learn/position-depreciation-events
            // https://www.developer.saxo/openapi/learn/corporate-action-events
            console.error("Unsupported ActivityType " + ensEvent.ActivityType);
        }
        return ensEvent;
    }

    return processMessage();
}
