import { Sequelize } from "sequelize";
import databaseConfig from "../Config/database.cjs";

import User from "../App/Models/User.js";
import Player from "../App/Models/Player.js";
import Matches from "../App/Models/Matches.js";
import MatchTeams from "../App/Models/MatchTeams.js";
import MatchPlayers from "../App/Models/MatchPlayers.js";
import MatchEvents from "../App/Models/MatchEvents.js";
import MatchEvaluator from "../App/Models/MatchEvaluator.js";
import MatchPauses from "../App/Models/MatchPauses.js";
import MatchEvaluations from "../App/Models/MatchEvaluations.js";
import PlayerEvaluations from "../App/Models/PlayerEvaluations.js";
import MatchEvaluatorSession from "../App/Models/MatchEvaluatorSessions.js";
import Draw from "../App/Models/Draw.js";
import DrawTeam from "../App/Models/DrawTeam.js";
import DrawPlayer from "../App/Models/DrawPlayer.js";
import MatchGames from "../App/Models/MatchGames.js";

const models = [
    User,
    Player,
    Matches,
    MatchTeams,
    MatchPlayers,
    MatchEvents,
    MatchEvaluator,
    MatchPauses,
    MatchEvaluations,
    PlayerEvaluations,
    MatchEvaluatorSession,
    Draw,
    DrawTeam,
    DrawPlayer,
    MatchGames,
]

class Database {

    constructor() {

        this.init();
    }
    init() {
        this.connection = new Sequelize(databaseConfig)
        models.map((model) => model.init(this.connection))
        models.map((model) => model.associate?.(this.connection.models))
    }
}

export default new Database
