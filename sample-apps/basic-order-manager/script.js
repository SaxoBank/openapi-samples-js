const simApp = {
  AppName: "OrderManager",
  AppKey: "698b5ebc5f5c4ef0a2de3b59655e187a",
  AuthorizationEndpoint: "https://sim.logonvalidation.net/authorize",
  TokenEndpoint: "https://sim.logonvalidation.net/token",
  LogoutEndpoint: "https://sim.logonvalidation.net/oidclogout",
  OpenApiBaseUrl: "https://gateway.saxobank.com/sim/openapi",
};

/* const liveApp = {
  AppName: "",
  AppKey: "",
  AuthorizationEndpoint: "",
  TokenEndpoint: "",
  LogoutEndpoint: "",
  OpenApiBaseUrl: "",
}; */

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

const parseTradeFromEvent = (event) => {
  if (!["New", "Updated"].includes(event.PositionEvent)) {
    return;
  }

  return {
    SequenceId: event.SequenceId,
    AssetType: event.AssetType,
    Symbol: event.Symbol,
    Account: event.AccountId,
    ValueDate: event.ValueDate,
    Trade: event.BuySell === "Buy" ? "Bought" : "Sold",
    Amount: event.FillAmount,
    Price: event.Price,
    ExecutionTime: event.ExecutionTime,
    User: event.UserId,
    Exchange: event.ExchangeInfo.ExchangeId,
    PositionId: event.PositionId,
    OrderId: event.SourceOrderId,
  };
};

const app = new Vue({
  el: "#app",
  vuetify: new Vuetify(),
  data: {
    orderSearch: "",
    tradeSearch: "",
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
    tradesHeaders: [
      {
        text: "AssetType",
        value: "AssetType",
      },
      {
        text: "Symbol",
        value: "Symbol",
      },
      {
        text: "Account",
        value: "Account",
      },
      {
        text: "Value Date",
        value: "ValueDate",
      },
      {
        text: "Trade",
        value: "Trade",
      },
      {
        text: "Amount",
        value: "Amount",
      },
      {
        text: "Price",
        value: "Price",
      },
      {
        text: "Execution Time",
        value: "ExecutionTime",
      },
      {
        text: "User",
        value: "User",
      },
      {
        text: "Exchange",
        value: "Exchange",
      },
      {
        text: "PositionId",
        value: "PositionId",
      },
      {
        text: "OrderId",
        value: "OrderId",
      },
    ],
    trades: [],
    ordersLoading: false,
    tradesLoading: false,
    loggedIn: false,
    environment: null,
    itemsPerPage: 150,
    snackbar: false,
    snackbarMessage: "",
    snackbarTimeout: 0,
    page: 0,
    blotterDates: [],
    blotterDate: moment().format("YYYY-MM-DD"),
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
      this.trades = [];
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
      const authUrl = this.getAuthUrl("refresh") + "&prompt=none";

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
      this.ordersLoading = true;
      this.orders = [];
      const orders = await this.getAllOrders();

      this.orders = orders.map(parseOrder);
      this.ordersLoading = false;
    },
    cancelOrder: async function (order) {
      const confirmationMessage = `
Are you sure you want to cancel this order?

  Order ID: ${order.OrderId}
  Symbol: ${order.Symbol}
  Order: ${order.BuySell} ${order.Amount} @ ${order.OpenOrderType} ${
        order.Price ? order.Price : ""
      }
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
    getEventsPage: async function (nextUrl) {
      let url;
      if (nextUrl) {
        url = nextUrl;
      } else {
        const saxoApp = this.getSaxoApp();
        let nextDay = moment(this.blotterDate)
          .add(1, "days")
          .format("YYYY-MM-DD");
        url = `${saxoApp.OpenApiBaseUrl}/ens/v1/activities?$top=1000&Activities=Positions&FieldGroups=ExchangeInfo&FromDateTime=${this.blotterDate}&ToDateTime=${nextDay}`;
      }

      return axios
        .get(url, {
          headers: {
            Authorization:
              "Bearer " + window.localStorage.getItem("accessToken"),
          },
        })
        .then((response) => response.data);
    },
    getAllPositionEvents: async function () {
      let nextUrl;

      const initialPage = await this.getEventsPage();
      events = initialPage.Data;

      if (initialPage.__next) {
        nextUrl = initialPage.__next;
      }

      while (nextUrl) {
        const response = await this.getEventsPage(nextUrl);
        if (response.Data.length > 0) {
          events = [...events, ...response.Data];
        }

        if (response.__next) {
          nextUrl = response.__next;
        } else {
          nextUrl = false;
        }
      }

      return events;
    },
    getTrades: async function () {
      this.tradesLoading = true;
      this.trades = [];

      const events = await this.getAllPositionEvents();

      this.trades = events.map(parseTradeFromEvent);

      this.tradesLoading = false;
    },
    downloadOrdersCsv: function () {
      const csvFields = this.headers.filter((header) => header.text !== "");

      let csvContent =
        "SEP=,\n" +
        csvFields.map((field) => field.text).join(",") +
        "\n" +
        this.orders
          .map((order) =>
            csvFields.map((field) => order[field.value]).join(",")
          )
          .join("\n");

      const blob = new Blob([csvContent]);

      const a = window.document.createElement("a");
      a.href = window.URL.createObjectURL(blob, {
        type: "text/csv",
      });
      a.download = "saxo-orders.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    downloadTradesCsv: function () {
      const csvFields = this.tradesHeaders;

      let csvContent =
        "SEP=,\n" +
        csvFields.map((field) => field.text).join(",") +
        "\n" +
        this.trades
          .map((trade) =>
            csvFields.map((field) => trade[field.value]).join(",")
          )
          .join("\n");

      const blob = new Blob([csvContent]);

      const a = window.document.createElement("a");
      a.href = window.URL.createObjectURL(blob, {
        type: "text/csv",
      });
      a.download = "saxo-trades.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    updateBlotterDate: async function (date) {
      this.blotterDate = date;
      this.getTrades();
    },
    setBlotterDates: function () {
      const dates = [];

      for (let i = 0; i < 14; i++) {
        const date = moment().subtract(i, "days").format("YYYY-MM-DD");
        dates.push(date);
      }

      this.blotterDates = dates;
      this.blotterDate = dates[0];
    },
  },
  created: async function () {
    this.$vuetify.theme.dark = true;
    this.environment = window.localStorage.getItem("environment");

    this.setBlotterDates();

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
        this.loggedIn = true;
        this.ordersLoading = true;
        this.tradesLoading = true;
        this.refreshToken();
        const loaders = [this.getOrders(), this.getTrades()];

        await Promise.all(loaders);
        this.loggedIn = true;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          this.ordersLoading = false;
          this.tradesLoading = false;
          this.logout(false);
        } else {
          throw error;
        }
      }
    }
  },
});
