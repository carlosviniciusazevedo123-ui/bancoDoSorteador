import MatchGameStartService from "../Services/MatchGameStartService.js";

class MatchGameStartController {
    async update(request, response) {
        const { match_id, game_id } = request.params;

        try {
            const game = await MatchGameStartService.start({
                matchId: match_id,
                gameId: game_id,
                userId: request.userId,
            });

            return response.status(200).json(game);
        } catch (error) {
            return response.status(400).json({
                error: error.message,
            });
        }
    }
}

export default new MatchGameStartController();