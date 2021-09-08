# Client-side Samples for corporate actions

## Event and Holdings
Corporate Actions are events initiated by companies who are issuers of securities. These events give opportunities to the owners of these securities to receive benefits or take part in certain activities.  Holdings are units of shares or other instruments of owners, which are usually the starting point of all the corporate actions.
These events could be
- Cash Dividend (DVCA): Distribution of cash to shareholders, in proportion to their equity holding. Ordinary dividends are recurring and regular. Shareholder must take cash and may be offered a choice of currency.

- Dividend Option (DVOP): Distribution of a dividend to shareholders with a choice of benefit to receive. Shareholders may choose to receive shares or cash. To be distinguished from DRIP as the company creates new share capital in exchange for the dividend rather than investing the dividend in the market.
Conversion (CONV): Conversion of securities (generally convertible bonds or preferred shares) into another form of securities (usually common shares) at a pre-stated price/ratio.

As for 2021, SAXO supports 73 types of events, The /ca/v2/events/eventtypes endpoint returns the full list of available event types.

There is a live sample on [Events](https://saxobank.github.io/openapi-samples-js/corporate-actions/events/) and [Holdings](https://saxobank.github.io/openapi-samples-js/corporate-actions/holdings/).

## Corporate Action Types
All the Corporate Actions or events can be simply categories into two types:

- Mandatory events take effect automatically so that it is not necessary for the security holders to respond;
- Voluntary events require security holders to respond. Together with the events, companies usually provides several options to the security holders to elect. 

## Elections
During voluntary events, different options are given to all the share owners to pick. Once a shareholder makes his or her decision, an election must be made by the shareholder. An election is something has been chosen by a client in an Voluntary corporate action. 

There is a live sample on [Elections](https://saxobank.github.io/openapi-samples-js/corporate-actions/elections/).

## Standing Instructions
A reset rule about how an election should be automatically performed by an shareholder. 

There is a live sample on [Standing Instructions](https://saxobank.github.io/openapi-samples-js/corporate-actions/standinginstructions/).

Documentation can be found on the [Developer Portal](https://www.developer.saxo/openapi/learn/corporate-actions).