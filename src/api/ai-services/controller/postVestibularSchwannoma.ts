import { Request, Response } from "express";

import path from "path";
import { VestibularSchwannomaAICaller } from "../service/vestibularSchwannoma";
import { IAIModelInput } from "../../../models/ai-service.model";
import { PythonShellError } from "python-shell";
import fs from "fs";
import glob from "glob";

export default async function (req: Request, res: Response, next: Function) {
    try {
        let aiConfig = req.body as IAIModelInput;

        let aiCaller: VestibularSchwannomaAICaller = new VestibularSchwannomaAICaller(aiConfig);
        let seriesDirList = await aiCaller.getArgs();
        await aiCaller.execAIUseConda();
        let rtssDicom = path.join(seriesDirList[0], "RTSS.dcm");
        fs.createReadStream(rtssDicom).pipe(res);
        deleteTrainedItem(seriesDirList[0]);
    } catch(e) {
        console.error(e);
        if (e instanceof PythonShellError) {
            return res.status(500).send(e.stack);
        }
        return res.status(500).send((e as any).message || e);
    }
}

function deleteTrainedItem(workingDir: string) {
    let aiGeneratedFiles = glob.sync(`**/!(*.dcm)`, {
        cwd: workingDir
    });
    for(let i = 0 ; i < aiGeneratedFiles.length; i++) {
        let file = aiGeneratedFiles[i];
        let fileFullPath = path.join(workingDir, file);
        fs.unlinkSync(fileFullPath);
    }
}