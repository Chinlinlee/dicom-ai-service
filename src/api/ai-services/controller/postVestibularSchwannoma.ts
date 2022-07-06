import { Request, Response } from "express";

import path from "path";
import { VestibularSchwannomaAICaller } from "../service/vestibularSchwannoma";
import { IAIServiceConfig } from "../../../models/ai-service.model";
import { PythonShellError } from "python-shell";
import fs from "fs";

export default async function (req: Request, res: Response, next: Function) {
    try {
        let aiConfig = req.body as IAIServiceConfig;

        let aiCaller: VestibularSchwannomaAICaller = new VestibularSchwannomaAICaller(aiConfig);
        let seriesDirList = await aiCaller.execAI();
        let rtssDicom = path.join(seriesDirList[0], "RTSS.dcm");
        return fs.createReadStream(rtssDicom).pipe(res);
    } catch(e) {
        console.error(e);
        if (e instanceof PythonShellError) {
            return res.status(500).send(e.stack);
        }
        return res.status(500).send(e);
    }
}