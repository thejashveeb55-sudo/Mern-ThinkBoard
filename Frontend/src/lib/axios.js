import axios from "axios"

const BASE_URL = "http://52.91.141.40:5002/api"; 
const api = axios.create({
  baseURL : BASE_URL,
});

export default api;