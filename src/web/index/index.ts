
import { Router } from "express";
import path from "path";

const router = Router();

router.get('/', function (req, res) {
    res.sendFile('index.html', {
        root: __dirname + '../../../public/html'
    });
});

export {
    router as webRouter
};