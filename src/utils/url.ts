import path from "path";
import * as _ from "lodash";
import { URL } from "url";

function urlJoin(subPath: string, baseUrl: string) {
    let baseUrlSplit = _.compact(baseUrl.split("/"));
    if (baseUrlSplit.length > 2) {
        let subPathInBaseUrl = baseUrlSplit.slice(2).join("/");
        let newSubPath = path.join(subPathInBaseUrl, subPath);
        let joinURL = new URL(newSubPath, baseUrl);
        return joinURL.href;
    } else {
        let joinURL = new URL(subPath, baseUrl);
        return joinURL.href;
    }
}

export {
    urlJoin as urlJoin
};