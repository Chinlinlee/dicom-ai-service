import { Router } from "express";
const router = Router();

import getExample from "./controller/getExample";

router.get("/", getExample);

export {
    router as exampleRouter
};
