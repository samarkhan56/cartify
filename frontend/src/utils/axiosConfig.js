import axios from "axios";

const guestAuthEndpoints = [
  {
    path: "/user/getuser",
    data: { success: false, user: null },
  },
  {
    path: "/shop/getSeller",
    data: { success: false, seller: null },
  },
];

const getGuestAuthEndpoint = (error) => {
  const status = error?.response?.status;
  const url = error?.config?.url || "";

  if (status !== 401) {
    return null;
  }

  return guestAuthEndpoints.find(({ path }) => url.includes(path)) || null;
};

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const guestAuthEndpoint = getGuestAuthEndpoint(error);

    if (guestAuthEndpoint) {
      return Promise.resolve({
        ...error.response,
        data: guestAuthEndpoint.data,
      });
    }

    return Promise.reject(error);
  }
);

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (getGuestAuthEndpoint(event.reason)) {
      event.preventDefault();
    }
  });
}

export default axios;
