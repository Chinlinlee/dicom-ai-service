import { Request, Response, NextFunction } from "express";
import path from "path";
import https from "https";
import http from "http";
import url from "url";
import querystring from "querystring";
import { pluginsConfig } from "../../config";
import { DICOMwebClient } from "../../../utils/DICOMweb/DICOMweb-Client";
const oauthPlugin = pluginsConfig.oauth;

// 透過OAuth驗證
// 參考 https://blog.yorkxin.org/posts/oauth2-6-bearer-token.html
// Server=https://github.com/pedroetb/node-oauth2-server-example
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Reponse} res 
 * @param {*} next 
 * @returns 
 */
export const isOAuthLogin = async function (req: Request, res: Response, next: NextFunction) {
    // 如果開啟 ENABLE_OAUTH_LOGIN
    if (oauthPlugin.enable) {
        if (
            req.headers["authorization"] != undefined ||
            req.query.access_token != undefined
        ) {
            console.log("OAUTH status: has access token");
            DICOMwebClient.headers["Authorization"] = req.headers["authorization"] || req.query.access_token;
            let isTokenValid = await verifyOAuthAccessToken(req);

            // 把query放回去...
            if (req.session.oriQuery) req.query = req.session.oriQuery;
            
            if (isTokenValid == true) {
                return next();
            }

            // 否則就回401
            return res
                .status(401)
                .json(
                    {
                        isError: true,
                        message: "Access Token is invalid"
                    }
                );
        } else if (req.query.code != undefined) {
            // 如果有Auth code 就試試看跟OAuth請求token
            console.log("OAUTH status: has auth code");
            console.log("auth code=" + req.query.code);
            await requestOAuthToken(req, res);
            return;
        } // 如果連code都沒
        else {
            console.log("OAUTH status: missing token and auth code");
            await redirectToOAuthLoginPage(req, res);
            return;
        }
    } // 未開啟則next
    else {
        return next();
    }
};

async function verifyOAuthAccessToken(req: Request) {
    // Token驗證是否通過
    let tokenValidation = false;

    // 預計傳給Oauth Server的http設定
    const options = {
        hostname: oauthPlugin.host,
        path: oauthPlugin.path,
        port: oauthPlugin.port,
        headers: {
            Authorization: "none"
        }
    };


    // 檢查 token 是否 放在 HTTP Header 裡面的 authorization 欄位
    if (req.headers["authorization"] != undefined) {
        options.headers["Authorization"] = req.headers["authorization"];
    } else if (req.query.access_token != undefined) {
        options.headers["Authorization"] = "Bearer " + req.query.access_token;
    } else if (req.session.access_token) {
        options.headers["Authorization"] = "Bearer " + req.session.access_token;
    }

    // 如果有token 則將從headers拿到的token丟給oauth server做驗證
    if (options.headers["Authorization"] != "none") {
        // 等待Oauth Server 回復結果
        await new Promise<void>((resolve) => {
            https.get(options, (response) => {
                let result = "";

                // 資料傳輸中
                response.on("data", function (chunk) {
                    result += chunk;
                });

                // 資料傳輸結束
                response.on("end", function () {
                    // 傳回的結果如果等於200代表成功 其他則為失敗
                    if (response.statusCode == 200) {
                        tokenValidation = true;
                    }
                    console.log(result);
                    // 結束promise的等待
                    resolve();
                });
            });
        });
    }

    // 如果驗證通過就繼續
    return tokenValidation;
}

async function requestOAuthToken(req: Request, res: Response) {
    // 重新導回的網址
    let theUrl = req.originalUrl;
    console.log("Original URL: " + req.originalUrl);

    // 移除掉OAuth給我們的2個參數
    theUrl = removeURLParameter(
        removeURLParameter(theUrl, "session_state"),
        "code"
    );

    let post_data = querystring.stringify({
        client_id: oauthPlugin.client_id,
        grant_type: "authorization_code",
        method: "POST",
        code: req.query.code as string,
        session_state: req.query.session_state as string,
        redirect_uri: `${oauthPlugin.http}://${process.env.SERVER_HOST}${theUrl}`
    });

    const token_options = {
        hostname: oauthPlugin.host,
        path:
            oauthPlugin.token_path +
            `?session_state=${req.query.session_state}&code=${req.query.code}`,
        port: oauthPlugin.port,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(post_data)
        }
    };
    await new Promise<void>((resolve) => {
        let post_req = https.request(token_options, (response) => {
            let result = "";

            // 資料傳輸中
            response.on("data", function (chunk) {
                result += chunk;
            });

            // 資料傳輸結束
            response.on("end", function () {
                //有取得到token就重新來一次
                let resultObj = JSON.parse(result);
                if (resultObj["access_token"] != undefined) {
                    req.session.access_token = resultObj["access_token"];

                    res.set({
                        authorization: `Bearer ${resultObj["access_token"]}`
                    });
                    res.redirect(
                        theUrl + `?access_token=${resultObj["access_token"]}`
                    );
                }

                // 結束promise的等待
                resolve();
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();
    });
}

async function redirectToOAuthLoginPage(req: Request, res: Response) {
    // 可能keycloak有點bug，會遺失掉放在網址的參數，我們這邊從先把query的Parameters存在session...。
    let _theUrl = req.originalUrl.split("?")[0];
    console.log(
        "OAuth2 redirect from:" +
            `${oauthPlugin.http}://${req.hostname}${_theUrl}`
    );
    req.session.oriQuery = req.query;

    // 導向至登入畫面...
    res.redirect(
        `${oauthPlugin.http}://${oauthPlugin.host}/${oauthPlugin.auth_path}?client_id=${oauthPlugin.client_id}&grant_type=authorization_code&response_type=code&redirect_uri=${oauthPlugin.http}://${req.hostname}${_theUrl}`
    );
}

function removeURLParameter(url: string, parameter: string) {
    //prefer to use l.search if you have a location/link object
    let urlparts = url.split("?");
    if (urlparts.length >= 2) {
        let prefix = encodeURIComponent(parameter) + "=";
        let pars = urlparts[1].split(/[&;]/g);

        //reverse iteration as may be destructive
        for (let i = pars.length; i-- > 0; ) {
            //idiom for string.startsWith
            if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                pars.splice(i, 1);
            }
        }

        return urlparts[0] + (pars.length > 0 ? "?" + pars.join("&") : "");
    }
    return url;
}
//#endregion
