import axios from "axios";

const api = axios.create({
  baseURL: "https://localhost:7085/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      const user = JSON.parse(storedUser);

      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
  }

  return config;
});

export default api;