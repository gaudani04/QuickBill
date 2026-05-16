import axios from "axios";


import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api",
  withCredentials: true,
});

export default api;

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";
    if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/me")) {
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(err);
  }
);

export default api;
