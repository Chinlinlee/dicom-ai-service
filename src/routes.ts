import { Application } from "express";
import { exampleRouter } from "./api/example";
import { userRouter } from "./api/user";
import { aiServiceRouter } from "./api/ai-services";
import { webRouter } from "./web/index";

export default function(app: Application) {
    app.use("/example", exampleRouter);
    app.use("/user", userRouter);
    app.use("/ai-service", aiServiceRouter);

    app.use("/", webRouter);
}