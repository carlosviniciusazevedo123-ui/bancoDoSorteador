import app from './app.js';
import './Database/index.js'
import MatchExpirationService from './App/Services/MatchExpirationService.js';

app.listen(3001, () => {
    console.log('Server is running on port 3001')
});


setInterval(async () => {

    try {

        await MatchExpirationService.checkMatches();

    } catch (error) {

        console.error(
            'Erro ao verificar partidas:',
            error
        );
    }
}, 1000);
