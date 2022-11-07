# Client-side Samples for placing Stock Orders during Extended Trading Hours (ETH)

This is a demonstration on how to place a stock order outside the AutomatedTradingSessions.

Saxo is introducing trading in the pre- and post market session.

This has impact on trading (a new field indicating the allowed sessions for the execution), on prices and margin calculations.

The functionality won't be external yet, but the ambition is to have it available in the OpenAPI.

## 1. Is the Client configured for ETH orders?
The clients reponse has a new field; _"AllowedTradingSessions"_. This indicates if the client has the option to place ETH orders.

```curl
GET /port/v1/clients/{ClientKey}
```

## 2. Is the Instrument configured for ETH orders?
Only a limited set of instruments can be traded outside regular market hours. The response of this request will contain a field _SupportedTradingSessions_ for this:

```curl
GET /ref/v1/instruments/details/{Uic}/{AssetType}
```
If an AccountKey is supplied, you get the configuration specific for the customer, otherwise only for the instrument.

**ISSUE: Currently IsExtendedTradingHoursEnabled instead of SupportedTradingSessions.**

## 3. Trading schedules
When you can order outside regular trading session, you request the TradingSession of the instrument in two ways:

```curl
GET /ref/v1/instruments/details/{Uic}/{AssetType}?FieldGroups=TradingSessions
GET /ref/v1/instruments/tradingschedule/{Uic}/{AssetType}
```
Both will return the times of the PreMarket and PostMarket, wich apply for ETH.

## 4. How to place an ETH order?
Before and during the extended trading hours, you can place the (limit) order with a new field; _"ExecuteAtTradingSession"_. When this has the value _"All"_, the order can be executed in these new trading sessions.

```json
{
    "AccountKey": "(added on first request)",
    "OrderType": "Limit",
    "OrderPrice": 36,
    "Uic": 721,
    "AssetType": "Stock",
    "ExecuteAtTradingSession": "All",
    "BuySell": "Buy",
    "Amount": 10,
    "ExternalReference": "MyEthOrderCorrelationId",
    "ManualOrder": true,
    "OrderDuration": {
        "DurationType": "DayOrder"
    }
}
```

## 5. Prices
Regular prices are not available outside the regular automated trading session. The price subscription request must be changed to get the ETH prices.

Add ETH prices to the subscription by adding the fieldgroup _ExtendedTradingHoursPriceData_.

**ISSUE: FieldGroup ExtendedTradingHoursPriceData is not yet available.**

## 6. Margin impact
The new prices have an impact on the margin calculations and balances. They can be more accurate.

What you will notice is that Limit orders can be executed during PreMarket and PostMarket trading sessions. This is not new, limited ETH was already available via Algorithmic orders.

Live demo: <https://saxobank.github.io/openapi-samples-js/orders/pre-market-and-after-hours/>
