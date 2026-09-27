import { config } from "dotenv";

config();

export default{
    secret: process.env.JWT_SECRET ,
    expiresIn: '15d'
}