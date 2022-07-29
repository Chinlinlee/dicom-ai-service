import { Request, Response, NextFunction } from "express";
import { IAICallerOption, AICallerMode } from "../api/ai-services/service/aiCaller";
import path from "path";
import glob from "glob";
import fs from "fs";

interface IAIModelConfig extends IAICallerOption{
    name: string;
    postFunction?: Function;
}

interface IAIServiceConfig {
    services: IAIModelConfig[];
}

export const aiServiceConfig: IAIServiceConfig = {
    
    services: [
        {
            //* ^[a-z0-9]+(-?[a-z0-9]+){0,5}$, must be lowercase and concat with dashes and only accepts 5 dashes in string
            name: "vestibular-schwannoma",
            //* The AI model's mode, expected to be AICallerMode.api | AICallerMode.conda | AICallerMode.native
            mode: AICallerMode.conda,
            condaEnvName: "smart5",
            //* The path of AI model's python script, please use the absolute path
            entryFile: path.join(__dirname, "../ai-models/SMART5/M4_20220314/commander.py"),
            args: [
                "--t1c-dir",
                "${seriesDirList[0]}",
                "--t2-dir",
                "${seriesDirList[1]}"
            ],
            //* The path of label DICOM, e.g. GSPS, RTSS, ANN, Or maybe image file?
            outputPath: "${seriesDirList[0]}/RTSS.dcm",
            postFunction: (req: Request, res: Response) => {
                let workingDir = res.locals.aiWorker.args.seriesDirList[0];
                let aiGeneratedFiles = glob.sync(`**/!(*.dcm)`, {
                    cwd: workingDir
                });
                for(let i = 0 ; i < aiGeneratedFiles.length; i++) {
                    let file = aiGeneratedFiles[i];
                    let fileFullPath = path.join(workingDir, file);
                    fs.unlinkSync(fileFullPath);
                }
                fs.unlinkSync(res.locals.aiWorker.getOutputPath());
            }
        }
    ]
};

export {
    IAIModelConfig
};