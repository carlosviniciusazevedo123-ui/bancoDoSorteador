import User from "../Models/User.js";
import * as Yup from "yup";
import bcrypt from "bcrypt";

class UserController {
    async store(request, response) {
        const schema = Yup.object({
            name: Yup.string().required(),
            email: Yup.string().email().required(),
            password: Yup.string().min(8).required(),
        });

        try {
            schema.validateSync(request.body, { abortEarly: false, strict: true });
        } catch (error) {
            return response.status(400).json({ error: error.errors });
        }

        const { name, email, password } = request.body;

        let existingUser;

        try {
            existingUser = await User.findOne({
                where: { email }
            });
        } catch (error) {
            return response.status(500).json({
                error: "Error looking up user"
            });
        }

        if (existingUser) {
            return response.status(400).json({ message: "Email is already registered" });
        }

        const password_hash = await bcrypt.hash(password, 8);
        const user = await User.create({ name, email, password_hash });

        return response.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
        });
    }
}

export default new UserController();
