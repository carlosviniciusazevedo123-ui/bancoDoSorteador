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
    limit: 300,
    message: {
        error: "Too many evaluation attempts. Please try again later.",
    },
});

// A team may share an IP. Submissions also have a separate session budget.
const evaluationSubmissionRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    keyGenerator: request => request.params.session_token,
    message: { error: "Too many evaluation attempts. Please try again later." },
});
const evaluationSubmissionIpRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3000,
    message: { error: "Too many evaluation attempts. Please try again later." },
});
export { loginRateLimit, registerRateLimit, evaluationRateLimit, evaluationSubmissionRateLimit, evaluationSubmissionIpRateLimit };
