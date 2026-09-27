import express from 'express';
import './Database/index.js';
import routes from './Routes.js';

const app = express();

app.use(express.json({limit: "1mb"}));
app.use(routes);
app.use((request, response) => {
    return response.status(404).json({
        error: "Rota não encontrada",
    });  
});
app.use((error, request, response, next) => {
    console.error(error);

    return response.status(500).json({
        error: "Erro interno do servidor",
    });
});


export default app;
