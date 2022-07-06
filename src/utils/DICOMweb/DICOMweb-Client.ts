/**
 * refer from https://github.com/dcmjs-org/dicomweb-client
 */

import axios from "axios";
import { urlJoin } from "../url";
import { multipartDecode } from "./message";

interface IDICOMwebClientOptions {
    url: string;
    qidoURLPrefix?: string;
    wadoURLPrefix?: string;
    wadoMode?: "wado-rs" | "wado-uri";
    stowURLPrefix?: string;
    headers?: any;
}

interface IRetrieveOptions {
    studyInstanceUID: string;
    seriesInstanceUID?: string;
    sopInstanceUID?: string;
    //#region for WADO-URI
    frameNumber?: number;
    imageQuality?: number;
    rows?: number;
    columns?: number;
    region?: number;
    windowCenter?: number;
    windowWidth?: number;
    contentType?: "application/dicom" | "image/jpeg";
    //#endregion
}

class DICOMwebClient {
    baseURL: string;
    qidoURL: string;
    wadoURL: string;
    stowURL: string;
    wadoMode: string = "wado-rs";

    constructor(options: IDICOMwebClientOptions) {
        this.baseURL = options.url;
        if (!this.baseURL) {
            console.error("no DICOMweb base url provided - calls will fail");
        }

        if (options.qidoURLPrefix) {
            console.log(`use URL prefix for QIDO-RS: ${options.qidoURLPrefix}`);
            this.qidoURL = urlJoin(options.qidoURLPrefix, this.baseURL);
        } else {
            this.qidoURL = this.baseURL;
        }

        if (options.wadoURLPrefix) {
            console.log(`use URL prefix for WADO-RS: ${options.wadoURLPrefix}`);
            this.wadoURL = urlJoin(options.wadoURLPrefix, this.baseURL);
        } else {
            this.wadoURL = this.baseURL;
        }

        if (options.stowURLPrefix) {
            console.log(`use URL prefix for STOW-RS: ${options.stowURLPrefix}`);
            this.stowURL = urlJoin(options.stowURLPrefix, this.baseURL);
        } else {
            this.stowURL = this.baseURL;
        }

        if (options.wadoMode) {
            this.wadoMode = options.wadoMode;
        }
    }

    public static async getMultipartApplicationDicom(url: string) {
        let headers: any = {};
        headers.Accept = 'multipart/related; type="application/dicom"';
        try {
            let { data } = await axios.get(url, {
                responseType: "arraybuffer",
                headers: headers
            });
            let decodedData = multipartDecode(data);
            return decodedData;
        } catch (e) {
            throw e;
        }
    }

    public static async getApplicationDicom(url: string) {
        let headers: any = {};
        headers.Accept = "application/dicom";
        try {
            let { data } = await axios.get(url, {
                responseType: "arraybuffer",
                headers: headers
            });
            return data;
        } catch (e) {
            throw e;
        }
    }

    public buildWADOUriAddress(options: IRetrieveOptions): string {
        let wadoUrlObj = new URL(this.wadoURL);
        wadoUrlObj.searchParams.set("requestType", "WADO");
        wadoUrlObj.searchParams.set("studyUID", options.studyInstanceUID!);
        wadoUrlObj.searchParams.set("seriesUID", options.seriesInstanceUID!);
        wadoUrlObj.searchParams.set("objectUID", options.sopInstanceUID!);

        if (options.frameNumber)
            wadoUrlObj.searchParams.set(
                "frameNumber",
                String(options.frameNumber)
            );
        if (options.imageQuality)
            wadoUrlObj.searchParams.set(
                "imageQuality",
                String(options.imageQuality)
            );
        if (options.rows)
            wadoUrlObj.searchParams.set("rows", String(options.rows));
        if (options.columns)
            wadoUrlObj.searchParams.set("columns", String(options.columns));
        if (options.region)
            wadoUrlObj.searchParams.set("region", String(options.region));
        if (options.windowCenter)
            wadoUrlObj.searchParams.set(
                "windowCenter",
                String(options.windowCenter)
            );
        if (options.windowWidth)
            wadoUrlObj.searchParams.set(
                "windowWidth",
                String(options.windowWidth)
            );
        return wadoUrlObj.href;
    }

    async retrieveInstance(options: IRetrieveOptions): Promise<Buffer> {
        if (!("studyInstanceUID" in options)) {
            throw new Error("Study Instance UID is required");
        }
        if (!("seriesInstanceUID" in options)) {
            throw new Error("Series Instance UID is required");
        }
        if (!("sopInstanceUID" in options)) {
            throw new Error("SOP Instance UID is required");
        }
        let url = urlJoin(
            `studies/${options.studyInstanceUID}/series/${options.seriesInstanceUID}/instances/${options.sopInstanceUID}`,
            this.wadoURL
        );
        try {
            if (this.wadoMode === "wado-uri") {
                url = this.buildWADOUriAddress(options);
                console.log(url);
                return await await DICOMwebClient.getApplicationDicom(url);
            }
            let dicomArrayBufferArr =
                await DICOMwebClient.getMultipartApplicationDicom(url);
            return dicomArrayBufferArr.pop()!;
        } catch (e) {
            throw e;
        }
    }

    async retrieveSeries(options: IRetrieveOptions): Promise<Buffer[]> {
        if (!("studyInstanceUID" in options)) {
            throw new Error("Study Instance UID is required");
        }
        if (!("seriesInstanceUID" in options)) {
            throw new Error("Series Instance UID is required");
        }

        let url = urlJoin(
            `studies/${options.studyInstanceUID}/series/${options.seriesInstanceUID}`,
            this.wadoURL
        );

        try {
            let dicomArrayBufferArr =
                await DICOMwebClient.getMultipartApplicationDicom(url);
            return dicomArrayBufferArr;
        } catch (e) {
            throw e;
        }
    }

    async retrieveStudy(options: IRetrieveOptions): Promise<Buffer[]> {
        if (!("studyInstanceUID" in options)) {
            throw new Error("Study Instance UID is required");
        }

        let url = urlJoin(`studies/${options.studyInstanceUID}`, this.wadoURL);
        
        try {
            let dicomArrayBufferArr =
                await DICOMwebClient.getMultipartApplicationDicom(url);
            return dicomArrayBufferArr;
        } catch (e) {
            throw e;
        }
    }
}

export { 
    DICOMwebClient,
    IDICOMwebClientOptions,
    IRetrieveOptions
};