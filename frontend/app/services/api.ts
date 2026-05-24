import axios from "axios";

const api = axios.create({
  baseURL: "https://localhost:7085/api",
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const user = JSON.parse(storedUser);

        const token =
          user.token ||
          user.Token ||
          user.accessToken ||
          user.AccessToken;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;