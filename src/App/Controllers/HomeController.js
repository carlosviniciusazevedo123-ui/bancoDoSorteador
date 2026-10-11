import { Op } from "sequelize";
import Draw from "../Models/Draw.js";
import DrawPlayer from "../Models/DrawPlayer.js";
import MatchGames from "../Models/MatchGames.js";
import Matches from "../Models/Matches.js";
import MatchEvents from "../Models/MatchEvents.js";

class HomeController {
    async latestDraw(request, response, next) {
        try {
            // Participations are persisted by the draw transaction. Empty configurations
            // are not completed draws; creation time of Draw itself is not execution time.
            const participation = await DrawPlayer.findOne({
                include: [{ association: "draw", required: true,
                    where: { user_id: request.userId }, attributes: ["id"] }],
                order: [["createdAt", "DESC"], ["id", "DESC"]],
            });
            if (!participation) return response.json(null);

            const draw = await Draw.findOne({
                where: { id: participation.draw_id, user_id: request.userId },
                include: [{ association: "teams" }],
            });
            if (!draw) return response.json(null);
            const participants = await DrawPlayer.findAll({
                where: { draw_id: draw.id },
                include: [{ association: "player" }],
                order: [["number", "ASC"], ["id", "ASC"]],
            });
            return response.json({ draw, participants, drawn_at: participation.createdAt });
        } catch (error) { return next(error); }
    }

    async latestGame(request, response, next) {
        try {
            const owner = { association: "match", required: true,
                where: { user_id: request.userId }, attributes: ["id"] };
            const missingDate = await MatchGames.findOne({
                where: { status: "finished", finished_at: null }, include: [owner],
                attributes: ["id"],
            });
            if (missingDate) return response.status(409).json({ error: "Missing game completion date" });
            const game = await MatchGames.findOne({
                where: { status: "finished", finished_at: { [Op.ne]: null } },
                include: [owner],
                order: [["finished_at", "DESC"], ["id", "DESC"]],
            });
            if (!game) return response.json(null);
            const match = await Matches.findOne({
                where: { id: game.match_id, user_id: request.userId },
                include: [{ association: "teams", include: [{ association: "players" }] }],
            });
            if (!match) return response.json(null);
            const events = await MatchEvents.findAll({
                where: { match_id: match.id, game_id: game.id },
                order: [["createdAt", "ASC"], ["id", "ASC"]],
            });
            return response.json({ match, game, events });
        } catch (error) { return next(error); }
    }
}
export default new HomeController();
