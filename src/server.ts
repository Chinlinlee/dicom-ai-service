import express from "express";
import http from "http";
import compress from "compression";
import cookieParser from "cookie-parser";
import session from "express-session";
import { config } from "./config/config";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import myMongoDB from "./models/mongodb/connector";
import { renderFile } from "ejs";
import passport from "passport";
const port = config.server.port;
const app: express.Application = express();
myMongoDB(config);
app.use(compress());
app.use(express.static("public"));
app.use(
    express.urlencoded({
        extended: true
    })
);
app.use(express.json());
app.use(cookieParser());

let sessionConfig = {
    ...config.server.session,
    store: MongoStore.create({
        clientPromise: mongoose.connection
            .asPromise()
            .then((connection) => connection.getClient()),
        dbName: config.mongodb.databaseName
    })
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
import myPassport from "./models/user/passport";
myPassport(passport);


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", config.server.cors["Access-Control-Allow-Origin"]);
    res.header(
        "Access-Control-Allow-Headers",
       config.server.cors["Access-Control-Allow-Headers"]
    );
    res.header("Vary",  config.server.cors["Vary"]);
    res.header(
        "Access-Control-Allow-Methods",
        config.server.cors["Access-Control-Allow-Methods"]
    );
    res.header("Access-Control-Allow-Credentials", config.server.cors["Access-Control-Allow-Credentials"]);
    res.header("Access-Control-Expose-Headers", config.server.cors["Access-Control-Expose-Headers"]);
    next();
});
app.engine("html", renderFile);
import routes from "./routes";
routes(app);

http.createServer(app).listen(port, function () {
    console.log(`http server is listening on port:${port}`);
});

import { DICOMwebClient } from "./utils/DICOMweb/DICOMweb-Client";

let dicomWebClient = new DICOMwebClient(config.dicomClient);

export { dicomWebClient };
