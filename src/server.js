import app from './app.js';
import './Database/index.js';
import EvaluationExpirationService from './App/Services/EvaluationExpirationService.js';
import MatchGameExpirationService from "./App/Services/MatchGameExpirationService.js";

app.listen(3001);

setInterval(async () => {
    try {
        await MatchGameExpirationService.checkGames();
        await EvaluationExpirationService.checkEvaluations();
    } catch (error) {
        console.error(
            "Error checking services:",
            error
        );
    }
}, 1000);
