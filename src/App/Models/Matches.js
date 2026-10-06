import Sequelize, { Model } from "sequelize";

class Matches extends Model {
    static init(sequelize) {
        super.init(
            {
                id: {
                    type: Sequelize.UUID,
                    primaryKey: true,
                    allowNull: false,
                    defaultValue: Sequelize.UUIDV4,
                },

                user_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                },

                finished_at: {
                    type: Sequelize.DATE,
                    allowNull: true,
                },

                status: {
                    type: Sequelize.ENUM(
                        "pending",
                        "in_progress",
                        "finished"
                    ),
                    allowNull: false,
                    defaultValue: "pending",
                },
            },
            {
                sequelize,
                tableName: "matches",
                timestamps: true,
                underscored: true,
            }
        );

        return this;
    }

    static associate(models) {
        this.belongsTo(models.User, {
            foreignKey: "user_id",
            as: "user",
        });

        this.hasMany(models.MatchTeams, {
            foreignKey: "match_id",
            as: "teams",
        });

        this.hasMany(models.MatchPlayers, {
            foreignKey: "match_id",
            as: "matchPlayers",
        });

        this.hasMany(models.MatchEvents, {
            foreignKey: "match_id",
            as: "events",
        });

        this.hasMany(models.MatchEvaluator, {
            foreignKey: "match_id",
            as: "evaluators",
        });

        this.hasMany(models.MatchEvaluations, {
            foreignKey: "match_id",
            as: "evaluations",
        });

        this.hasMany(models.PlayerEvaluations, {
            foreignKey: "match_id",
            as: "playerEvaluations",
        });

        this.hasMany(models.MatchGames, {
            foreignKey: "match_id",
            as: "games",
        });
    }
}

export default Matches;