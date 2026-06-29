import axios from "axios"

const BASE_URL = import.meta.env.MODE === "development" ? "http://52.91.141.40:5002" : "/api";
const api = axios.create({
  baseURL : BASE_URL,
});

export default api;