# Testes automatizados e revisão

Executar: `npm test`.

A suíte usa Vitest e Supertest. O banco e a configuração JWT são substituídos em `tests/setup.js`; nenhum teste inicializa PostgreSQL, utiliza credenciais reais ou grava no banco configurado. Os testes HTTP percorrem o Express, autenticação, roteamento, validação e controllers com persistência simulada. Os testes de serviços verificam regras de negócio e controle de transações com mocks.

Resultado atual: 77 cenários passando, sem falhas esperadas. Todas as reproduções originalmente marcadas com `it.fails` agora são testes normais de regressão.

Cobertura: autenticação e login, isolamento por usuário, limites por cliente, sorteio atual com titulares/reservas/goleiros, repetição de sorteio, falhas de persistência, tempo efetivo com pausas, cálculo de notas, início/finalização de partida e permissões de avaliação.

## Achados por prioridade

1. **Corrigido — inclusão manual de jogador incompatível com o modelo.** `src/App/Controllers/MatchPlayersController.js` cria o registro sem `player_name` e `overall_rating`, ambos obrigatórios em `src/App/Models/MatchPlayers.js`. Um pedido válido chega à criação sem esses campos e deve ser rejeitado pelo Sequelize. Reproduzido no teste de contrato em `tests/knownRosterDefects.test.js`. O controller agora preenche `player_name` e `overall_rating` a partir do jogador consultado, mantendo a inclusão manual; o teste correspondente exige sucesso com 201.

2. **Corrigido — reserva pode registrar gol sem entrar no jogo.** `src/App/Controllers/MatchEventsController.js` valida `is_reserve` apenas em substituições. Nos demais eventos, um reserva passa pelas verificações e recebe 201. Reproduzido em `tests/knownRosterDefects.test.js`. Agora novos eventos `goal` são rejeitados com 400 enquanto o jogador está como reserva. Gols anteriores permanecem registrados após a substituição. O teste percorre gol, substituição, bloqueio do jogador que saiu e gol do jogador que entrou.

3. **Corrigido — envio de avaliação ignora encerramento do período.** `src/App/Controllers/PlayerEvaluationsController.js` verifica a expiração da sessão, mas não `session.matchEvaluator.used_at` nem a expiração do avaliador pai. Uma sessão ainda válida de período marcado como usado recebe 201. Reproduzido em `tests/api.test.js`. O envio agora verifica `used_at` e `expires_at` do período pai dentro de uma transação, com bloqueio da mesma linha usada pelo serviço de expiração. Períodos encerrados ou expirados retornam 410 sem gravar a avaliação; a resposta de sucesso só é enviada após o commit. Testes cobrem período encerrado, período pai expirado, pai ausente e falha de commit. O bloqueio foi validado por contrato com mocks; concorrência real em PostgreSQL continua fora desta suíte.

4. **Corrigido — nome numérico causava 500.** A validação de nome agora rejeita valores que não sejam strings no cadastro e na atualização. Ambos usam o corpo validado pelo Yup, preservando a remoção de espaços nas extremidades. Testes cobrem números, null, objetos, nomes em branco e nomes válidos com espaços.

5. **Corrigido — JSON malformado retornava 500.** O middleware reconhece erros `entity.parse.failed` com status 400 e retorna `{ error: "Malformed JSON body" }`. Erros internos continuam retornando 500 sem detalhes sensíveis; um teste garante que um SyntaxError interno não seja confundido com erro do parser.

6. **Corrigido — início de jogo sem atomicidade.** `src/App/Services/MatchGameStartService.js` consulta e atualiza jogo e partida sem transação nem bloqueio. Duas chamadas podem ler `pending` antes de qualquer atualização e sobrescrever `started_at`. Uma falha na atualização da partida pode deixar o jogo em andamento com partida pendente. Achado por inspeção; concorrência real não foi exercitada. O início agora bloqueia primeiro a partida e depois o jogo, seguindo a ordem de finalização/expiração, e atualiza ambos dentro da mesma transação. Só retorna o jogo após commit. Os testes verificam bloqueios, rollback em falhas das duas atualizações, falha de commit, rejeição de reinício sem sobrescrever `started_at` e manutenção dos retornos HTTP 200/400. O frontend continua com a mesma URL, payload e resposta; desabilitar o botão durante a requisição é uma melhoria opcional. Concorrência real em PostgreSQL ainda não foi exercitada.

## Limites da validação

A revisão original preservou a implementação. Após autorização para corrigir a inclusão manual, foram adicionados os dois campos obrigatórios em `MatchPlayersController.js` e atualizado seu teste de regressão. Também foi corrigido o registro de novos gols por reservas em `MatchEventsController.js`, preservando o histórico de gols. Não existe frontend neste repositório. A suíte não valida migrations, constraints, SQL, bloqueios reais nem concorrência em PostgreSQL. Uma próxima camada deve executar integração em um banco descartável exclusivo de testes, criado do zero pelas migrations; não usar o banco configurado de desenvolvimento ou produção.





