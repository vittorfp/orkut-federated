import pino from "pino";

export const logger = pino({
  base: {
    service: "orkut-federated",
  },
  level: process.env.LOG_LEVEL ?? "info",
});
