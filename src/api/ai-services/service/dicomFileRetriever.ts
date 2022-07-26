import { IAIModelConfig } from "../../../models/ai-service.model";
import { dicomWebClient } from "../../../server";
import { IRetrieveOptions } from "../../../utils/DICOMweb/DICOMweb-Client";
import { parseDicom, DataSet } from "dicom-parser";
import fsP from "fs/promises";
import path from "path";
import mkdirp from "mkdirp";
import shortHash from "shorthash2";

enum DICOMLevel {
    study = "STUDY",
    series = "SERIES",
    instances = "INSTANCES"
}

function getUIDs(dicomSet: DataSet) {
    return {
        studyInstanceUID: dicomSet.string("x0020000d"),
        seriesInstanceUID: dicomSet.string("x0020000e"),
        sopInstanceUID: dicomSet.string("x00080018")
    };
}

const dicomLevelMethodMap = {
    "STUDY": async (aiConfig: IAIModelConfig) => {
        let retrieveOptions: IRetrieveOptions = {
            studyInstanceUID: aiConfig.studyInstanceUID
        };
        let dicomFilesBufferArr = await dicomWebClient.retrieveStudy(retrieveOptions);
        return await AIDicomFilesRetriever.storeMultiDICOMFilesToLocal(dicomFilesBufferArr);
    },
    "SERIES": async (aiConfig: IAIModelConfig) => {
        let seriesFilesStoreDest: string[] = [];
        for (let i = 0; i < aiConfig.seriesInstanceUIDList!.length; i++) {
            let seriesInstanceUID: string = aiConfig.seriesInstanceUIDList![i];
            let retrieveOptions: IRetrieveOptions = {
                studyInstanceUID: aiConfig.studyInstanceUID,
                seriesInstanceUID: seriesInstanceUID
            };
            let dicomFilesBufferArr = await dicomWebClient.retrieveSeries(retrieveOptions);
            let destList = await AIDicomFilesRetriever.storeMultiDICOMFilesToLocal(dicomFilesBufferArr);
            seriesFilesStoreDest.push(...destList);
        }
        return seriesFilesStoreDest;
    },
    "INSTANCES": async (aiConfig: IAIModelConfig) => {
        let instancesFilesStoreDest: string[] = [];
        for (let i = 0; i < aiConfig.sopInstanceUIDList!.length; i++) {
            let seriesInstanceUID = aiConfig.seriesInstanceUIDList![i];
            let sopInstanceUID = aiConfig.sopInstanceUIDList![i].sopInstanceUID;
            let retrieveOptions: IRetrieveOptions = {
                studyInstanceUID: aiConfig.studyInstanceUID,
                seriesInstanceUID: seriesInstanceUID,
                sopInstanceUID: sopInstanceUID
            }

            let dicomFileBuffer = await dicomWebClient.retrieveInstance(retrieveOptions);
            let dest = await AIDicomFilesRetriever.storeDICOMFileToLocal(dicomFileBuffer);
            instancesFilesStoreDest.push(dest);
        }
        return instancesFilesStoreDest;
    }
};
class AIDicomFilesRetriever {
    aiConfig: IAIModelConfig;
    dicomLevel:DICOMLevel;

    constructor(aiConfig: IAIModelConfig) {
        this.aiConfig = aiConfig;
        this.dicomLevel = this.getDICOMLevelFromAIConfig();
    }

    private getDICOMLevelFromAIConfig() {
        if (this.aiConfig.seriesInstanceUIDList && this.aiConfig.sopInstanceUIDList) {
            if (this.aiConfig.seriesInstanceUIDList.length > 0 && this.aiConfig.sopInstanceUIDList.length > 0 )
            return DICOMLevel.instances;
        }
        if (this.aiConfig.seriesInstanceUIDList) {
            if (this.aiConfig.seriesInstanceUIDList.length > 0)
            return DICOMLevel.series;
        }
        return DICOMLevel.study;
    }

    public static async storeMultiDICOMFilesToLocal(bufferArr: Buffer[]): Promise<string[]> {
        let filesDestList: string[] = [];
        for(let dicomFileBuffer of bufferArr) {
            let fileDest = await AIDicomFilesRetriever.storeDICOMFileToLocal(dicomFileBuffer);
            filesDestList.push(fileDest);
        }
        return filesDestList;
    }

    public static async storeDICOMFileToLocal(buffer: Buffer): Promise<string> {
        let dicomSet = parseDicom(buffer, {
            untilTag: "x00220001"
        });
        let uidObj = getUIDs(dicomSet);
        let storeFileDest = path.join(__dirname, "../../../temp", shortHash(uidObj.seriesInstanceUID), `${shortHash(uidObj.sopInstanceUID)}.dcm`);
        mkdirp.sync(path.dirname(storeFileDest));
        await fsP.writeFile(storeFileDest, buffer);
        return storeFileDest;
    }

    public async retrieveDICOMFiles() {
        return await dicomLevelMethodMap[this.dicomLevel](this.aiConfig);
    }
}


export {
    AIDicomFilesRetriever
};