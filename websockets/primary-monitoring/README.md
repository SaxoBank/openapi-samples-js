# Client-side Samples for monitoring primary status

At Saxobank, only one application can display realtime prices, if the customer is entitled to receive them. By default, an application gets delayed prices. To subscribe to realtime prices, the application must become "Primary".

This example shows how to become "Primary" and how to monitor this status. When Saxo Trader Go is launched, this app will become "Primary". This can be verified with this example.

For extending subscriptions and disconnecting, see the order update events example.