import app from './app.js';
import './Database/index.js';
import EvaluationExpirationService from './App/Services/EvaluationExpirationService.js';
import MatchGameExpirationService from "./App/Services/MatchGameExpirationService.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

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
