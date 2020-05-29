const simApp = {
  AppName: "OrderManager",
  AppKey: "698b5ebc5f5c4ef0a2de3b59655e187a",
  AuthorizationEndpoint: "https://sim.logonvalidation.net/authorize",
  TokenEndpoint: "https://sim.logonvalidation.net/token",
  GrantType: "Implicit",
  OpenApiBaseUrl: "https://gateway.saxobank.com/sim/openapi",
  RedirectUrls: ["http://localhost:5000"],
};

const oAuthApp = simApp;

const getAuthUrl = (state = "123") =>
  `${oAuthApp.AuthorizationEndpoint}?client_id=${oAuthApp.AppKey}&response_type=token&state=${state}&redirect_uri=${window.location.href}`;

const deleteOrder = (order) => {
  const url = `${oAuthApp.OpenApiBaseUrl}/trade/v2/orders/${order.OrderId}?AccountKey=${order.AccountKey}`;
  return axios.delete(url, {
    headers: {
      Authorization: "Bearer " + window.localStorage.getItem("accessToken"),
    },
  });
};

const getOrders = (skip = 0) => {
  const url = `${oAuthApp.OpenApiBaseUrl}/port/v1/orders/me?$top=1000&$skip=${skip}&FieldGroups=DisplayAndFormat,ExchangeInfo`;

  return axios
    .get(url, {
      headers: {
        Authorization: "Bearer " + window.localStorage.getItem("accessToken"),
      },
    })
    .then((response) => response.data);
};

const getAllOrders = async () => {
  let orders = [];
  let loadNextPage = true;
  let i = 0;

  while (loadNextPage) {
    const response = await getOrders(i * 1000);
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
};

const refreshToken = () => {
  const authUrl = getAuthUrl("refresh");

  const iframe = document.getElementById("refreshIFrame");
  iframe.setAttribute("src", authUrl);

  nextRefresh = window.localStorage.getItem("expiresIn") * 1000 - 300000;
  setTimeout(refreshToken, nextRefresh);
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
  Duration: order.Duration.DurationType,
  Status: order.Status,
  Exchange: order.Exchange.ExchangeId,
  DistanceToMarket: order.DistanceToMarket,
  ShortTrading: order.ShortTrading === "NotAllowed" ? "NotAllowed" : "Allowed",
});

const app = new Vue({
  el: "#app",
  vuetify: new Vuetify(),
  data: {
    search: "",
    headers: [
      {
        text: "AccountId",
        value: "AccountId",
      },
      {
        text: "OrderId",
        value: "OrderId",
      },
      {
        text: "Symbol",
        value: "Symbol",
      },
      {
        text: "Description",
        value: "Description",
      },
      {
        text: "Exchange",
        value: "Exchange",
      },
      {
        text: "Currency",
        value: "Currency",
      },
      {
        text: "AssetType",
        value: "AssetType",
      },
      {
        text: "BuySell",
        value: "BuySell",
      },
      {
        text: "Amount",
        value: "Amount",
      },
      {
        text: "OpenOrderType",
        value: "OpenOrderType",
      },
      {
        text: "Price",
        value: "Price",
      },
      {
        text: "DistanceToMarket",
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
        text: "ShortTrading",
        value: "ShortTrading",
      },
      {
        text: "Actions",
        value: "actions",
      },
    ],
    orders: [],
    loading: false,
    loggedIn: true,
    itemsPerPage: 150,
  },
  async created() {
    this.$vuetify.theme.dark = true;

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
        removeHash();
      }
    }

    try {
      refreshToken();
      await this.getOrders();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.logout();
        this.login();
      }
    }
  },
  methods: {
    login: function (event) {
      const authUrl = getAuthUrl();

      window.location = authUrl;
    },
    logout: function (event) {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("expiresIn");
      location.reload();
    },
    getOrders: async function (event) {
      this.loading = true;
      this.orders = [];
      const orders = await getAllOrders();

      this.orders = orders.map(parseOrder);
      this.loading = false;
    },
    cancelOrder: async function (order) {
      if (confirm("Do you really want to do this?????")) {
        await deleteOrder(order);
        this.orders = this.orders.filter(
          (tableOrder) => tableOrder.OrderId !== order.OrderId
        );
      }
    },
  },
});
