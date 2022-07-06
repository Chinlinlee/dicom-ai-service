import { Document, Schema, model } from "mongoose";
/**
 * @author Chin-lin lee 
 */

interface IUser {
    username: string;
    password: string;
    email: string;
    firstname: string;
    lastname: string;
    gender: string;
    usertype: string;
    status: number;
    token: string
}

export interface IUserModel extends IUser , Document {}


const usersSchema = new Schema({
    username: {
        type: String
    },
    password: {
        type: String
    },
    email: {
        type: String
    },
    firstname: {
        //名字
        type: String
    },
    lastname: {
        //姓
        type: String
    },
    gender: {
        type: String
    },
    usertype: {
        //帳號類型 admin,normal
        type: String
    },
    status: {
        type: Number //1:開通 0:沒開通
    },
    token: {
        type: String
    }
});
//account 為唯一值
usersSchema.index(
    {
        username: 1
    },
    {
        unique: true
    }
);

const usersModel = model<IUserModel>("users", usersSchema);

export default usersModel;
