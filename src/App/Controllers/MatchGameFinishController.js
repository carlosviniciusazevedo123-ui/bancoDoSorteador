import * as Yup from "yup";
import MatchGameFinishService from "../Services/MatchGameFinishService.js";

class MatchGameFinishController {
    async update(request, response) {
        const schema = Yup.object({
            winner_team_id: Yup.string()
                .uuid()
                .required(),
        });

        try {
            schema.validateSync(request.body, {
                abortEarly: false,
                strict: true,
            });
        } catch (error) {
            return response.status(400).json({
                error: error.errors,
            });
        }

        const { winner_team_id } = request.body;

        try {
            const game =
                await MatchGameFinishService.finish({
                    matchId: request.params.match_id,
                    gameId: request.params.game_id,
                    userId: request.userId,
                    winnerTeamId: winner_team_id,
                });

            return response.status(200).json(game);
        } catch (error) {
            return response.status(400).json({
                error: error.message,
            });
        }
    }
}

export default new MatchGameFinishController();