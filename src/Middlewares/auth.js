import jwt from "jsonwebtoken";
import authConfig from "../Config/auth.js";

const authMiddleware = (request, response, next) => {
    const authorization = request.headers.authorization;

    if (!authorization) {
        return response.status(401).json({ error: "Token not provided" });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return response.status(401).json({ error: "Token must use the Bearer scheme" });
    }

    try {
        const decoded = jwt.verify(token, authConfig.secret);

        if (typeof decoded === "string" || !decoded.id) {
            return response.status(401).json({ error: "Token is invalid" });
        }

        request.userId = decoded.id;
        return next();
    } catch {
        return response.status(401).json({ error: "Token is invalid" });
    }
};

export default authMiddleware;
