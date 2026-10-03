import * as Yup from "yup";
import User from "../Models/User.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken'
import authConfig from "../../Config/auth.js";

class SessionController {
    async store(request, response) {
        const schema = Yup.object({
            email: Yup.string().email().required(),
            password: Yup.string().required(),
        });

        const isValid = await schema.isValid(request.body, {
            abortEarly: false,
            strict: true,
        });

        const emailOrPasswordInvalid = () => response.status(400).json({
            error: "Invalid email or password",
        });

        if (!isValid) {
            return emailOrPasswordInvalid();
        }

        const { email, password } = request.body;
        const existingUser = await User.findOne({ where: { email } });

        if (!existingUser) {
            return emailOrPasswordInvalid();
        }

        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password_hash);

        if (!isPasswordCorrect) {
            return emailOrPasswordInvalid();
        }
        const token = jwt.sign({id: existingUser.id}, authConfig.secret,{
            expiresIn: authConfig.expiresIn
        })

        return response.status(200).json({
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            token
        });
    }
}

export default new SessionController();
