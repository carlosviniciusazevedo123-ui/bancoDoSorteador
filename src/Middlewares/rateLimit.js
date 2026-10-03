import { rateLimit } from "express-rate-limit";

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: {
        error: "Too many attempts. Please try again later.",
    },
});

const registerRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: {
        error: "Too many registration attempts. Please try again later.",
    },
});

const evaluationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    message: {
        error: "Too many evaluation attempts. Please try again later.",
    },
});

export { loginRateLimit, registerRateLimit, evaluationRateLimit };
