import { config } from "dotenv";

config();

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
}

export default {
    secret: process.env.JWT_SECRET,
    expiresIn: "15d"
};