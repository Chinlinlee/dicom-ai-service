import { Router } from "express";
import { isOAuthLogin } from "../middleware";
import { pluginsConfig } from "../../config";
const router = Router();

const oauthPlugin = pluginsConfig.oauth;
for (let i = 0; i < oauthPlugin.routers.length; i++) {
    let middlewareRouter = oauthPlugin.routers[i];
    (router as any)[middlewareRouter.method](middlewareRouter.path, isOAuthLogin);
}

export default router;
