import Sequelize, { Model } from "sequelize";

class MatchEvents extends Model {
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
                player_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                },
                team_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                },
                event_type: {
                    type: Sequelize.ENUM(
                        "goal",
                        "assist",
                        "yellow_card",
                        "red_card",
                        "substitution",
                        "own_goal"
                    ),
                    allowNull: false,
                },
                minute: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                },
            },
            {
                sequelize,
                tableName: "match_events",
                timestamps: true,
                underscored: true,
            }
        );

        return this;
    }

    static associate(models) {
        this.belongsTo(models.Matches, {
            foreignKey: "match_id",
            as: "match",
        });

        this.belongsTo(models.Player, {
            foreignKey: "player_id",
            as: "player",
        });

        this.belongsTo(models.MatchTeams, {
            foreignKey: "team_id",
            as: "team",
        });
    }
}

export default MatchEvents;
