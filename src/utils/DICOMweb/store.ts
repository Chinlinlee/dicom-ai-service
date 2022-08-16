import fs from "fs";
import * as requestCompose from "request-compose";


const request = requestCompose.default.extend({
    Request: {
        multipart: require("request-multipart")
    }
}).client;

async function storeInstance(stowURL: string, headers: object={}, filename: string) {
    let stream = fs.createReadStream(filename);

    let response = await request({
        method: "POST",
        url: stowURL,
        headers: {
            ...headers,
            "Content-Type": "multipart/related; type=application/dicom"
        },
        multipart: [
            {
                "Content-Type": "application/dicom",
                "Content-Disposition": `attachment; filename="${filename}"`,
                body: stream
            }
        ],
        timeout: 300000
    });
    return response;
}

export {
    storeInstance
};