import { Request, Response } from "express";

import { IAIModelInput } from "../../../models/ai-service.model";
import { PythonShellError } from "python-shell";
import fs from "fs";
import { AiWorker } from "../service/aiWorker";
import { aiServiceConfig } from "../../../config/ai-service.config";

export default async function (req: Request, res: Response, next: Function) {
    try {
        let aiInput = req.body as IAIModelInput;
        let { aiName } = req.params;

        let aiConfig = aiServiceConfig.services.find(v => v.name === aiName);
        if (!aiConfig) next(new Error(`No such AI model: ${aiName}`));
        console.log(`Use AI Model: ${aiName}`);
        
        let aiWorker = new AiWorker(aiInput, aiConfig!);
        await aiWorker.downloadDicomAndGetArgs();
        let execStatus = await aiWorker.exec();
        fs.createReadStream(aiWorker.getOutputPath()).pipe(res);
        res.locals.aiWorker = aiWorker;
        next();
    } catch(e) {
        console.error(e);
        if (e instanceof PythonShellError) {
            return res.status(500).send(e.stack);
        }
        return res.status(500).send((e as any).message || e);
    }
}