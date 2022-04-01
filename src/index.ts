import express from "express";
import messageRouter from "./routes/messages-router";

import cors from "cors";
const PORT = process.env.PORT || 5000;
const HOSTNAME = process.env.HOSTNAME || "http://localhost";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ response: "Bem Vindo" });
});

app.use(
  cors({
    origin: ["http://localhost:3000"],
  })
);

app.use("/", messageRouter);

app.use((req, res) => {
  res.status(404);
});

app.use((req, res) => {
  res.status(404);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando com sucesso ${HOSTNAME}:${PORT}`);
});
