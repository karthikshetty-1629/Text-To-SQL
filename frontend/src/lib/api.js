import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, headers: { "Content-Type": "application/json" } });

export const fetchDatabases = () => api.get("/databases").then(r => r.data.databases);
export const fetchSchema = (dbId) => api.get(`/schema/${dbId}`).then(r => r.data);
export const runQuery = (question, db_id, session_id) =>
  api.post("/query", { question, db_id, session_id }).then(r => r.data);
export const fetchSessions = () => api.get("/sessions").then(r => r.data.sessions);
export const connectDB = (payload) => api.post("/databases/connect", payload).then(r => r.data);
