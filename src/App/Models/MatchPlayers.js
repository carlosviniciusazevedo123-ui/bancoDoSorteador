import Sequelize, { Model } from 'sequelize';

class MatchPlayers extends Model {
    static init(sequelize) {
        super.init(
            {
                id: {
                    type: Sequelize.UUID,
                    primaryKey: true,
                    allowNull: false,
                    defaultValue: Sequelize.UUIDV4,
                },
                match_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                },
                team_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                },
                player_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                },
                number: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                },
                is_reserve: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                is_goalkeeper: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                minutes_player: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
            }, {
                sequelize,
                tableName: 'match_players',
                timestamps: true,
                underscored: true,
            }
        );
        return this;
    }
   static associate(models) {
    this.belongsTo(models.Matches, {
        foreignKey: "match_id",
        as: "match"
    });

    this.belongsTo(models.MatchTeams, {
        foreignKey: "team_id",
        as: "team"
    });

    this.belongsTo(models.Player, {
        foreignKey: "player_id",
        as: "player"
    });
}
}

export default MatchPlayers;
