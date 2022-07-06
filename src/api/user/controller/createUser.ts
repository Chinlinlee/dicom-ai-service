import { createUser } from "../service/user.service";
import { Request, Response } from "express";

export default async function(req: Request, res: Response) {
    try {
        let userObj = req.body;
        await createUser(userObj);
        return res.status(200).json({message: "successfully create user"});
    } catch(e) {
        console.error(e);
        let errorStr = JSON.stringify(e, Object.getOwnPropertyNames(e));
        return res.status(500).json(e);
    }
}