import { Router } from "express";

import UserController from "./App/Controllers/UserController.js";
import SessionController from "./App/Controllers/SessionController.js";
import PlayersController from "./App/Controllers/PlayersController.js";
import MatchesController from "./App/Controllers/MatchesController.js";
import MatchTeamsController from "./App/Controllers/MatchTeamsController.js";
import MatchPlayersController from "./App/Controllers/MatchPlayersController.js";
import MatchEventsController from "./App/Controllers/MatchEventsController.js";
import MatchEvaluatorController from "./App/Controllers/MatchEvaluatorController.js";
import MatchPausesController from "./App/Controllers/MatchPausesController.js";
import PlayerEvaluationsController from "./App/Controllers/PlayerEvaluationsController.js";
import DrawController from "./App/Controllers/DrawController.js";
import MatchGameController from "./App/Controllers/MatchGameController.js";
import MatchGameStartController from "./App/Controllers/MatchGameStartController.js";
import MatchGameFinishController from "./App/Controllers/MatchGameFinishController.js";

import authMiddleware from "./Middlewares/auth.js";
import {
    loginRateLimit,
    registerRateLimit,
    evaluationRateLimit,
} from "./Middlewares/rateLimit.js";

const routes = new Router();

// Rotas públicas
routes.post(
    "/users",
    registerRateLimit,
    UserController.store
);

routes.post(
    "/sessions",
    loginRateLimit,
    SessionController.store
);

// Link público de avaliação
routes.get(
    "/evaluations/:token",
    evaluationRateLimit,
    MatchEvaluatorController.show
);

routes.post(
    "/evaluations/:token/player",
    evaluationRateLimit,
    MatchEvaluatorController.identifyPlayer
);

routes.post(
    "/evaluations/:session_token",
    evaluationRateLimit,
    PlayerEvaluationsController.store
);

// Rotas protegidas
routes.use(authMiddleware);

// Rotas de Jogadores
routes.post("/players", PlayersController.store);
routes.get("/players", PlayersController.index);
routes.get("/players/:id", PlayersController.show);
routes.put("/players/:id", PlayersController.update);
routes.delete("/players/:id", PlayersController.delete);

// Rotas de Sorteio
routes.post("/draws", DrawController.store);
routes.post(
    "/draws/:draw_id/draw",
    DrawController.draw
);

// Rotas de Partidas
routes.post(
    "/matches",
    MatchesController.store
);

routes.get(
    "/matches",
    MatchesController.index
);

routes.get(
    "/matches/:id",
    MatchesController.show
);

routes.delete(
    "/matches/:id",
    MatchesController.delete
);

// Rotas relacionadas à partida
routes.post(
    "/matches/:match_id/teams",
    MatchTeamsController.store
);

routes.post(
    "/matches/:match_id/players",
    MatchPlayersController.store
);

routes.post(
    "/matches/:match_id/games/:game_id/events",
    MatchEventsController.store
);

routes.post(
    "/matches/:match_id/evaluators",
    MatchEvaluatorController.store
);

// Rotas de jogos
routes.post(
    "/matches/:match_id/games",
    MatchGameController.store
);

routes.get(
    "/matches/:match_id/games/:game_id",
    MatchGameController.show
);

routes.patch(
    "/matches/:match_id/games/:game_id/start",
    MatchGameStartController.update
);

routes.patch(
    "/matches/:match_id/games/:game_id/pause",
    MatchPausesController.pause
);

routes.patch(
    "/matches/:match_id/games/:game_id/resume",
    MatchPausesController.resume
);

routes.patch(
    "/matches/:match_id/games/:game_id/finish",
    MatchGameFinishController.update
);

export default routes;