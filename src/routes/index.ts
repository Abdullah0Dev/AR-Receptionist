import { Express } from "express";
import callRoutes from "./call.routes";

export const setupRoutes = (app: Express) => {
  app.use("/", callRoutes);
  app.get("/", (req, res) => {
    res.send("Alhamdullah it's working!!!");
  });
};
