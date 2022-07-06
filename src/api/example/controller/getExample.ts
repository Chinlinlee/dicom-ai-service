import { Response, Request } from "express";

export default async function(req: Request , res: Response) {
    res.send("hello world");
    res.end();
}