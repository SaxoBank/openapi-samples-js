const simApp = {
  AppName: "OrderManager",
  AppKey: "698b5ebc5f5c4ef0a2de3b59655e187a",
  AuthorizationEndpoint: "https://sim.logonvalidation.net/authorize",
  TokenEndpoint: "https://sim.logonvalidation.net/token",
  LogoutEndpoint: "https://sim.logonvalidation.net/oidclogout",
  GrantType: "Implicit",
  OpenApiBaseUrl: "https://gateway.saxobank.com/sim/openapi",
  RedirectUrls: ["http://localhost:5000"],
};

const liveApp = {
  AppName: "Order Manager",
  AppKey: "29c28bc964d346b69d70f389ca2976c9",
  AuthorizationEndpoint: "https://live.logonvalidation.net/authorize",
  TokenEndpoint: "https://live.logonvalidation.net/token",
  LogoutEndpoint: "https://live.logonvalidation.net/oidclogout",
  GrantType: "Implicit",
  OpenApiBaseUrl: "https://gateway.saxobank.com/openapi",
  RedirectUrls: ["http://localhost:5000/"],
};
function removeHash() {
  history.pushState(
    "",
    document.title,
    window.location.pathname + window.location.search
  );
}

const parseOrder = (order) => ({
  AccountId: order.AccountId,
  AccountKey: order.AccountKey,
  OrderId: order.OrderId,
  Symbol: order.DisplayAndFormat.Symbol,
  Description: order.DisplayAndFormat.Description,
  Currency: order.DisplayAndFormat.Currency,
  AssetType: order.AssetType,
  BuySell: order.BuySell,
  Amount: order.Amount,
  OpenOrderType: order.OpenOrderType,
  Price: order.Price,
  Duration:
    order.Duration.DurationType === "DayOrder"
      ? "D/O"
      : order.Duration.DurationType === "GoodTillCancel"
      ? "GTC"
      : "GTD",
  Status: order.Status,
  Exchange: order.Exchange.ExchangeId,
  DistanceToMarket: order.DistanceToMarket,
  ShortTrading: order.ShortTrading === "NotAllowed" ? "No" : "Yes",
  cancelled: false,
});

const app = new Vue({
  el: "#app",
  vuetify: new Vuetify(),
  data: {
    search: "",
    headers: [
      {
        text: "Account ID",
        value: "AccountId",
      },
      {
        text: "Order ID",
        value: "OrderId",
      },
      {
        text: "Symbol",
        value: "Symbol",
      },
      {
        text: "Instrument Description",
        value: "Description",
      },
      {
        text: "Exchange",
        value: "Exchange",
      },
      {
        text: "$",
        value: "Currency",
      },
      {
        text: "Type",
        value: "AssetType",
      },
      {
        text: "Side",
        value: "BuySell",
      },
      {
        text: "Amount",
        value: "Amount",
      },
      {
        text: "Type",
        value: "OpenOrderType",
      },
      {
        text: "Trigger",
        value: "Price",
      },
      {
        text: "Distance",
        value: "DistanceToMarket",
      },
      {
        text: "Duration",
        value: "Duration",
      },
      {
        text: "Status",
        value: "Status",
      },
      {
        text: "Shortable",
        value: "ShortTrading",
      },
      {
        text: "",
        value: "actions",
        sortable: false,
      },
    ],
    orders: [],
    loading: false,
    loggedIn: false,
    environment: null,
    itemsPerPage: 150,
    snackbar: false,
    snackbarMessage: "",
    snackbarMultiLine: false,
  },
  methods: {
    login: function (environment) {
      window.localStorage.setItem("environment", environment);
      this.environment = environment;
      const authUrl = this.getAuthUrl();

      window.location = authUrl;
    },
    logout: function (hardLogout = true) {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("expiresIn");
      this.orders = [];
      this.loggedIn = false;
      if (hardLogout) {
        window.open(this.getSaxoApp().LogoutEndpoint);
      }
    },
    getSaxoApp: function () {
      const saxoApp = this.environment === "live" ? liveApp : simApp;
      return saxoApp;
    },
    getAuthUrl: function (state = "initial") {
      const saxoApp = this.getSaxoApp();
      return `${saxoApp.AuthorizationEndpoint}?client_id=${saxoApp.AppKey}&response_type=token&state=${state}&redirect_uri=${window.location.href}`;
    },
    refreshToken: function () {
      const authUrl = this.getAuthUrl("refresh");

      const iframe = document.getElementById("refreshIFrame");
      iframe.setAttribute("src", authUrl);

      nextRefresh = window.localStorage.getItem("expiresIn") * 1000 - 300000;
      setTimeout(this.refreshToken, nextRefresh);
    },
    deleteOrder: function (order) {
      const saxoApp = this.getSaxoApp();
      const url = `${saxoApp.OpenApiBaseUrl}/trade/v2/orders/${order.OrderId}?AccountKey=${order.AccountKey}`;
      return axios.delete(url, {
        headers: {
          Authorization: "Bearer " + window.localStorage.getItem("accessToken"),
        },
      });
    },
    getOrdersPage: function (skip = 0) {
      const saxoApp = this.getSaxoApp();
      const url = `${saxoApp.OpenApiBaseUrl}/port/v1/orders/me?$top=1000&$skip=${skip}&FieldGroups=DisplayAndFormat,ExchangeInfo`;

      return axios
        .get(url, {
          headers: {
            Authorization:
              "Bearer " + window.localStorage.getItem("accessToken"),
          },
        })
        .then((response) => response.data);
    },
    getAllOrders: async function () {
      let orders = [];
      let loadNextPage = true;
      let i = 0;

      while (loadNextPage) {
        const response = await this.getOrdersPage(i * 1000);
        if (response.Data.length > 0) {
          orders = [...orders, ...response.Data];
        }

        if (response.__count === 1000) {
          i++;
        } else {
          loadNextPage = false;
        }
      }

      return orders;
    },
    getOrders: async function () {
      this.loading = true;
      this.orders = [];
      const orders = await this.getAllOrders();

      this.orders = orders.map(parseOrder);
      this.loading = false;
    },
    cancelOrder: async function (order) {
      const confirmationMessage = `
Are you sure you want to cancel this order?

  Order ID: ${order.OrderId}
  Symbol: ${order.Symbol}
  Order: ${order.BuySell} ${order.Amount} @ ${order.OpenOrderType} ${order.Price}
  Duration: ${order.Duration}
`;
      if (confirm(confirmationMessage)) {
        await this.deleteOrder(order);
        this.orders = this.orders.map((tableOrder) =>
          tableOrder.OrderId === order.OrderId
            ? { ...tableOrder, cancelled: true }
            : tableOrder
        );

        this.snackbarMessage = `Cancelled order ${order.OrderId}`;
        this.snackbar = true;
      }
    },
  },
  created: async function () {
    this.$vuetify.theme.dark = true;
    this.environment = window.localStorage.getItem("environment");

    if (window.location.hash.includes("access_token")) {
      const urlParams = new URLSearchParams(
        window.location.hash.replace("#", "?")
      );
      const accessToken = urlParams.get("access_token");
      const expiresInSeconds = urlParams.get("expires_in");

      window.localStorage.setItem("accessToken", accessToken);
      window.localStorage.setItem("expiresIn", expiresInSeconds);

      // We're in the iframe, schedule refresh and don't start loading stuff
      if (window.location.hash.includes("refresh")) {
        return;
      } else {
        // render the iframe and continue normally
        this.loggedIn = true;
        removeHash();
      }
    }
    if (window.localStorage.getItem("accessToken")) {
      try {
        this.refreshToken();
        await this.getOrders();
        this.loggedIn = true;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          this.logout(false);
        } else {
          throw error;
        }
      }
    }
  },
});
