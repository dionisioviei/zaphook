"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const operators_json_1 = require("./operators.json");
const VENOM_API = "http://localhost:3000";
const pairs = [];
const ops = [...operators_json_1.operators];
let lastClient = "";
const messagesRouter = express_1.default.Router();
messagesRouter.post("/messages", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { body, from } = req.body;
    const receivedFrom = from.split("@")[0];
    lastClient = receivedFrom;
    // Check if is an operator
    if (ops.find((op) => op.number === receivedFrom)) {
        const opsIndex = ops.findIndex((op) => op.number === receivedFrom);
        // Check if is accepting to talk with the client
        if (body === "bot:ok" && ops[opsIndex].active === false) {
            ops[opsIndex] = Object.assign(Object.assign({}, ops[opsIndex]), { active: true, talkingTo: lastClient });
            // Tell all the other ops that someone already accepted
            const promises = ops.map((op) => {
                if (op.number !== receivedFrom) {
                    return axios_1.default.post(`${VENOM_API}/api/sendText`, {
                        chatId: op.number,
                        text: `*[BOT]:* *'${ops[opsIndex].name}'* Já aceitou e iniciou uma conversa com *${lastClient}*`,
                    });
                }
            });
            yield Promise.all(promises);
            yield axios_1.default.post(`${VENOM_API}/api/sendText`, {
                chatId: lastClient,
                text: `*${ops[opsIndex].name}:* Olá! Meu nome é ${ops[opsIndex].name} e a partir de agora irei dar continuidade ao seu atendimento`,
            });
        }
        // Check if is talking to a client and relay the message
        if (ops[opsIndex].active) {
            yield axios_1.default.post(`${VENOM_API}/api/sendText`, {
                chatId: ops[opsIndex].talkingTo,
                text: `*${ops[opsIndex].name}:* ${body}`,
            });
        }
        if (body === "bot:end" && ops[opsIndex].active === true) {
            yield axios_1.default.post(`${VENOM_API}/api/sendText`, {
                chatId: ops[opsIndex].talkingTo,
                text: `Obrigado pelo contato, estaremos finalizando o atendimento com o ${ops[opsIndex].name}.`,
            });
            yield axios_1.default.post(`${VENOM_API}/api/sendText`, {
                chatId: ops[opsIndex].number,
                text: `*[BOT]:* Atendimento com ${ops[opsIndex].talkingTo} finalizado!`,
            });
            ops[opsIndex] = Object.assign(Object.assign({}, ops[opsIndex]), { active: false, talkingTo: "" });
        }
        res.status(200).send("OK");
    }
    // Check if is a client and is already talking to an operator
    if (ops.find((op) => op.talkingTo === receivedFrom)) {
        const opsIndex = ops.findIndex((op) => op.talkingTo === receivedFrom);
        yield axios_1.default.post(`${VENOM_API}/api/sendText`, {
            chatId: ops[opsIndex].number,
            text: `*[BOT]:* *'${receivedFrom}'* enviou: ${body}`,
        });
        res.status(200).send("OK");
    }
    // Send message to all operators
    const promises = ops.map((op) => axios_1.default.post(`${VENOM_API}/api/sendText`, {
        chatId: op.number,
        text: `*[BOT]:* *'${receivedFrom}'* enviou: ${body} \n Responda com 'bot:ok' para iniciar uma conversa com este cliente.
      (Após finalizar, envie 'bot:end' para terminar o atendimento)`,
    }));
    const responses = yield Promise.all(promises);
    console.log({ responses, message: req.body });
    res.status(200).send("OK");
}));
messagesRouter.get("/messages", (req, res) => {
    console.log({ message: req.body });
    res.status(200).send("OK");
});
exports.default = messagesRouter;
