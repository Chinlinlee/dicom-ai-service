import bcrypt from "bcrypt";
import usersModel from "../../../models/mongodb/model/users";

async function getUser(username: string) {
    try {
        let user = await usersModel.findOne({
            username: username
        });
        return user;
    } catch(e) {
        throw e;
    }
}

/**
 * 
 * @param {Object} userObj 
 */
async function createUser(userObj: any) {
    try {
        let existsUser = await getUser(userObj.username);
        if (existsUser) {
            throw new Error(`User ${userObj.username} already exists`);
        }
        let cryptPassword = await bcrypt.hash(userObj.password, 10);
        let user = new usersModel({
            ...userObj,
            password: cryptPassword,
            status: 0,
            userType: "normal"
        });
        let createdUser = await user.save();
        return createdUser;
    } catch(e) {
        throw e;
    }
}

export {
    createUser as createUser,
    getUser as getUser
};