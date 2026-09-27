import {Router} from 'express';
import UserController from './App/Controllers/UserController.js';
import SessionController from './App/Controllers/SessionController.js';
import PlayersController from './App/Controllers/PlayersController.js';
import MatchesController from './App/Controllers/MatchesController.js';
import MatchTeamsController from './App/Controllers/MatchTeamsController.js';
import MatchPlayersController from './App/Controllers/MatchPlayersController.js';
import MatchEventsController from './App/Controllers/MatchEventsController.js';
import MatchEvaluatorController from './App/Controllers/MatchEvaluatorController.js';
import MatchPausesController from './App/Controllers/MatchPausesController.js';
import PlayerEvaluationsController from './App/Controllers/PlayerEvaluationsController.js';
import MatchDrawController from './App/Controllers/MatchDrawController.js';

import authMiddleware from './Middlewares/auth.js';
import { loginRateLimit, registerRateLimit, evaluationRateLimit } from './Middlewares/rateLimit.js';

const routes = new Router();


routes.post('/users', registerRateLimit, UserController.store);
routes.post('/sessions', loginRateLimit ,SessionController.store);

// Link público de avaliação
routes.get('/evaluations/:token', evaluationRateLimit, MatchEvaluatorController.show);

routes.post('/evaluations/:token/player', evaluationRateLimit, MatchEvaluatorController.identifyPlayer);

routes.post('/evaluations/:session_token', evaluationRateLimit, PlayerEvaluationsController.store);

routes.use(authMiddleware);

// Rotas de Jogador// 
routes.post('/players', PlayersController.store);
routes.get('/players', PlayersController.index);
routes.get('/players/:id', PlayersController.show);
routes.put('/players/:id', PlayersController.update);
routes.delete('/players/:id', PlayersController.delete);

// Rotas de Partidas//
routes.post('/matches', MatchesController.store);
routes.get('/matches', MatchesController.index);
routes.get('/matches/:id', MatchesController.show);
routes.put('/matches/:id', MatchesController.update);
routes.delete('/matches/:id', MatchesController.delete);

routes.patch('/matches/:id/start', MatchesController.start);
routes.patch('/matches/:id/finish', MatchesController.finish);
routes.patch('/matches/:id/pause', MatchPausesController.pause); 
routes.patch('/matches/:id/resume', MatchPausesController.resume);

// Rotas relacionadas à partida//

routes.post('/matches/:match_id/teams', MatchTeamsController.store);

routes.post('/matches/:match_id/players', MatchPlayersController.store);

routes.post('/matches/:match_id/events', MatchEventsController.store);

routes.post('/matches/:match_id/evaluators', MatchEvaluatorController.store);

routes.post('/matches/:match_id/draw', MatchDrawController.draw);



export default routes;
