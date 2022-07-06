import { Router } from "express";
const router = Router();

import createUser from "./controller/createUser";
import login from "./controller/login";

router.post("/", createUser);
router.post('/login', login);

export {
    router as userRouter
};