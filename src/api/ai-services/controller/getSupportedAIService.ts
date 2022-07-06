import { Request, Response, NextFunction } from "express";

export default async function(req: Request, res: Response, next: NextFunction) {
    return res.send([
        {
            name: "Vestibular Schwannoma",
            params: {
                seriesCount: 2,
                instanceCount: 0
            }
        }
    ]);
}