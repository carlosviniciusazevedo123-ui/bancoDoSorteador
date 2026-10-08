import express from "express";
import "./Database/index.js";
import routes from "./Routes.js";
import * as Yup from "yup";
import cors from "cors";
import AppError from "./App/Errors/AppError.js";

const app = express();

app.use(cors());

app.use(
    express.json({
        limit: "1mb",
    })
);

app.use(routes);

app.use((request, response) => {
    return response.status(404).json({
        error: "Route not found",
    });
});

app.use((error, request, response, next) => {
    if (error.type === "entity.parse.failed" && error.status === 400) {
        return response.status(400).json({
            error: "Malformed JSON body",
        });
    }

    if (error instanceof Yup.ValidationError) {
        return response.status(400).json({
            error: error.message,
        });
    }

    if (error instanceof AppError) {
        if (error.statusCode >= 500) {
            console.error(error);
        }
        return response.status(error.statusCode).json({
            error: error.message,
        });
    }

    console.error(error);
    return response.status(500).json({
        error: "Internal server error",
    });
});

export default app;
