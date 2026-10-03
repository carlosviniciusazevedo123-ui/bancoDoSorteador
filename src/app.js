import express from 'express';
import './Database/index.js';
import routes from './Routes.js';
import * as Yup from 'yup';

const app = express();

app.use(express.json({limit: "1mb"}));
app.use(routes);
app.use((request, response) => {
    return response.status(404).json({
        error: "Route not found",
    });  
});
app.use((error, request, response, next) => {
    console.error(error);

    if (error instanceof Yup.ValidationError) {
    return response.status(400).json({
        error: error.message,
    });
}

    return response.status(500).json({
        error: "Internal server error",
    });
});


export default app;
