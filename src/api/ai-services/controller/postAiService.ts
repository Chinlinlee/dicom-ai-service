import { Request, Response } from "express";

import { IAIModelInput } from "../../../models/ai-service.model";
import { PythonShellError } from "python-shell";
import fs from "fs";
import { AiWorker } from "../service/aiWorker";
import { aiServiceConfig } from "../../../config/ai-service.config";
import { MultipartWriter } from "../../../utils/multipartWriter";

export default async function (req: Request, res: Response, next: Function) {
    try {
        let aiInput = req.body as IAIModelInput;
        let { aiName } = req.params;
        
        // Find the config of AI model with specified name from path parameter
        let aiConfig = aiServiceConfig.services.find(v => v.name === aiName);
        if (!aiConfig) next(new Error(`No such AI model: ${aiName}`));
        console.log(`Use AI Model: ${aiName}`);
        
        let aiWorker = new AiWorker(aiInput, aiConfig!);
        await aiWorker.downloadDicomAndGetArgs();
        console.log(aiWorker.args);
        let execStatus = await aiWorker.exec();

        let outputPath = await aiWorker.getOutputPaths();
        if (outputPath.length > 1) {
            console.log("response multiple files");
            await writeFilesToResponse(outputPath, req, res);
            res.end();
        } else {
            console.log("response single file");
            res.writeHead(200, {
                ContentType: "application/octet-stream"
            });
            fs.createReadStream(outputPath.pop()!).pipe(res);
        }

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


async function writeFilesToResponse(paths: Array<string>, req: Request, res: Response) {
    let multipartWriter = new MultipartWriter(paths, req, res);
    multipartWriter.setHeaderMultipartRelatedContentType("application/octet-stream");
    multipartWriter.writeBoundary(true);
    for(let i = 0 ; i < paths.length; i++) {
        let outputPath = paths[i];
        
        
        let fileBuffer = await fs.promises.readFile(outputPath);
        multipartWriter.writeContentType("application/octet-stream");
        multipartWriter.writeContentLength(fileBuffer.length);
        multipartWriter.writeBufferData(fileBuffer);
        if (i == paths.length - 1) multipartWriter.writeFinalBoundary();
        else multipartWriter.writeBoundary(false);
    }
}

