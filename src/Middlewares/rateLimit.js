import { rateLimit } from "express-rate-limit";

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: {
        error: "Muitas tentativas. Tente novamente mais tarde.",
    },
});

const registerRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: {
        error: "Muitas tentativas de cadastro. Tente novamente mais tarde.",
    },
});

const evaluationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    message: {
        error: "Muitas tentativas de avaliação. Tente novamente mais tarde.",
    },
});

export { loginRateLimit, registerRateLimit, evaluationRateLimit };