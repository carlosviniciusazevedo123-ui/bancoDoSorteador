import Matches from '../Models/Matches.js';
import MatchTimeService from './MatchTimeService.js';

class MatchExpirationService {

    async checkMatches() {

        const matches = await Matches.findAll({
            where: {
                status: 'in_progress',
            },
        });

        for (const match of matches) {

            await MatchTimeService.finishIfExpired(match);
        }
    }
}

export default new MatchExpirationService();
