import axios from "axios";
import toast from "react-hot-toast";
import { loaderBus } from "../utils/loaderBus";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request (check both storages)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") ?? sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  loaderBus.start();
  return config;
}, (error) => {
  loaderBus.stop();
  return Promise.reject(error);
});

// Handle responses and errors globally
api.interceptors.response.use(
  (response) => {
    loaderBus.stop();
    return response;
  },
  (error) => {
    loaderBus.stop();
    const message =
      error.response?.data?.message || "Something went wrong";

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("stayLoggedIn");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    toast.error(message);
    return Promise.reject(error);
  }
);

export default api;
