import { Application } from "express";
import oAuthRouter from "./route";

export const init =  function(app: Application) {
    app.use("/", oAuthRouter);
}