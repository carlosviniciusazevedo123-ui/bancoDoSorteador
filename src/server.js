import app from './app.js';
import './Database/index.js'
import MatchExpirationService from './App/Services/MatchExpirationService.js';
import EvaluationExpirationService from './App/Services/EvaluationExpirationService.js';

app.listen(3001, () => {
    console.log('Server is running on port 3001')
});


setInterval(async () => {

    try {

        await MatchExpirationService.checkMatches();
        await EvaluationExpirationService.checkEvaluations();

    } catch (error) {

        console.error(
            'Error checking matches:',
            error
        );
    }
}, 1000);
