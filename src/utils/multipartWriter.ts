import * as uuid from "uuid";
import { Request, Response } from "express";

class MultipartWriter {
    BOUNDARY: string;

    constructor(
        public pathsOfImages: Array<string>,
        public req = {},
        public res: Response
    ) {
        this.BOUNDARY = `${uuid.v4()}-${uuid.v4()}-raccoon`;
        this.pathsOfImages = pathsOfImages;
        this.res = res;
        this.req = req;
    }

    /**
     * Write the boundary
     * @param isFirst Do not write \r\n\r\n when start if true
     */
    writeBoundary(isFirst = false) {
        if (isFirst) {
            this.res.write(`--${this.BOUNDARY}\r\n`);
        } else {
            this.res.write(`\r\n--${this.BOUNDARY}\r\n`);
        }
    }

    /**
     * Write final boundary
     */
    writeFinalBoundary() {
        this.res.write(`\r\n--${this.BOUNDARY}--`);
    }

    /**
     * Write the content-type. <br/>
     * If have transferSyntax, write content-type and transfer-syntax.
     * @param type
     * @param transferSyntax
     */
    writeContentType(type: string, transferSyntax: string = "") {
        if (transferSyntax) {
            this.res.write(
                `Content-Type: ${type};transfer-syntax=${transferSyntax}\r\n`
            );
        } else {
            this.res.write(`Content-Type: ${type}\r\n`);
        }
    }

    /**
     * Write the content-length
     * @param length length of content
     */
    writeContentLength(length: number) {
        this.res.write("Content-length: " + length + "\r\n");
    }

     /**
     * Write the buffer in response
     * @param buffer 
     */
    writeBufferData(buffer: Buffer) {
        this.res.write("\r\n");
        this.res.write(buffer);
    }

    /**
     * Set the content-type to "multipart/related; type=${type}; boundary=${boundary}"
     * @param type the type of the whole content
     */
    setHeaderMultipartRelatedContentType(type: string) {
        this.res.set("content-type", `multipart/related; type="${type}"; boundary=${this.BOUNDARY}`);
    }
}

export {
    MultipartWriter
};