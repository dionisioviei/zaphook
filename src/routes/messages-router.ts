import express from "express";
import axios from "axios";
import { operators } from "./operators.json";

const VENOM_API = "http://localhost:3000";

const pairs: Array<{ operator: string; client: string }> = [];
const ops = [...operators];
let lastClient = "";

const messagesRouter = express.Router();

messagesRouter.post("/messages", async (req, res) => {
  const { body, from } = req.body as { body: string; from: string };
  const receivedFrom = from.split("@")[0];
  lastClient = receivedFrom;

  // Check if is an operator
  if (ops.find((op) => op.number === receivedFrom)) {
    const opsIndex = ops.findIndex((op) => op.number === receivedFrom);

    // Check if is accepting to talk with the client
    if (body === "bot:ok" && ops[opsIndex].active === false) {
      ops[opsIndex] = {
        ...ops[opsIndex],
        active: true,
        talkingTo: lastClient,
      };
      // Tell all the other ops that someone already accepted
      const promises = ops.map((op) => {
        if (op.number !== receivedFrom) {
          return axios.post(`${VENOM_API}/api/sendText`, {
            chatId: op.number,
            text: `*[BOT]:* *'${ops[opsIndex].name}'* Já aceitou e iniciou uma conversa com *${lastClient}*`,
          });
        }
      });

      await Promise.all(promises);

      await axios.post(`${VENOM_API}/api/sendText`, {
        chatId: lastClient,
        text: `*${ops[opsIndex].name}:* Olá! Meu nome é ${ops[opsIndex].name} e a partir de agora irei dar continuidade ao seu atendimento`,
      });
    }

    // Check if is talking to a client and relay the message
    if (ops[opsIndex].active) {
      await axios.post(`${VENOM_API}/api/sendText`, {
        chatId: ops[opsIndex].talkingTo,
        text: `*${ops[opsIndex].name}:* ${body}`,
      });
    }

    if (body === "bot:end" && ops[opsIndex].active === true) {
      await axios.post(`${VENOM_API}/api/sendText`, {
        chatId: ops[opsIndex].talkingTo,
        text: `Obrigado pelo contato, estaremos finalizando o atendimento com o ${ops[opsIndex].name}.`,
      });

      await axios.post(`${VENOM_API}/api/sendText`, {
        chatId: ops[opsIndex].number,
        text: `*[BOT]:* Atendimento com ${ops[opsIndex].talkingTo} finalizado!`,
      });

      ops[opsIndex] = {
        ...ops[opsIndex],
        active: false,
        talkingTo: "",
      };
    }
    res.status(200).send("OK");
  }

  // Check if is a client and is already talking to an operator
  if (ops.find((op) => op.talkingTo === receivedFrom)) {
    const opsIndex = ops.findIndex((op) => op.talkingTo === receivedFrom);

    await axios.post(`${VENOM_API}/api/sendText`, {
      chatId: ops[opsIndex].number,
      text: `*[BOT]:* *'${receivedFrom}'* enviou: ${body}`,
    });
    res.status(200).send("OK");
  }

  // Send message to all operators
  const promises = ops.map((op) =>
    axios.post(`${VENOM_API}/api/sendText`, {
      chatId: op.number,
      text: `*[BOT]:* *'${receivedFrom}'* enviou: ${body} \n Responda com 'bot:ok' para iniciar uma conversa com este cliente.
      (Após finalizar, envie 'bot:end' para terminar o atendimento)`,
    })
  );

  const responses = await Promise.all(promises);
  console.log({ responses, message: req.body });

  res.status(200).send("OK");
});

messagesRouter.get("/messages", (req, res) => {
  console.log({ message: req.body });
  res.status(200).send("OK");
});

export default messagesRouter;
