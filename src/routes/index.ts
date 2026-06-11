import { Express } from "express";
import callRoutes from "./call.routes";
import businessRoutes from "./businesses.routes";

export const setupRoutes = (app: Express) => {
  app.use("/api", businessRoutes); // CRUD for businesses
  app.use("/", callRoutes);
  app.get("/", (req, res) => {
    res.send("Alhamdullah it's working!!!");
  });
};
