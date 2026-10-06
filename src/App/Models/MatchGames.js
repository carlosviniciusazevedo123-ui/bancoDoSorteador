import Sequelize, { Model } from "sequelize";

class MatchGames extends Model {
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

                team_a_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                },

                team_b_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                },

                round: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                },

                duration: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                },

                status: {
                    type: Sequelize.ENUM(
                        "pending",
                        "in_progress",
                        "paused",
                        "finished"
                    ),
                    allowNull: false,
                    defaultValue: "pending",
                },

                winner_team_id: {
                    type: Sequelize.UUID,
                    allowNull: true,
                },

                started_at: {
                    type: Sequelize.DATE,
                    allowNull: true,
                },

                finished_at: {
                    type: Sequelize.DATE,
                    allowNull: true,
                },
            },
            {
                sequelize,
                tableName: "match_games",
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

        this.belongsTo(models.MatchTeams, {
            foreignKey: "team_a_id",
            as: "teamA",
        });

        this.belongsTo(models.MatchTeams, {
            foreignKey: "team_b_id",
            as: "teamB",
        });

        this.belongsTo(models.MatchTeams, {
            foreignKey: "winner_team_id",
            as: "winner",
        });

        this.hasMany(models.MatchPauses, {
            foreignKey: "game_id",
            as: "pauses",
        });

        this.hasMany(models.MatchEvents, {
            foreignKey: "game_id",
            as: "events",
        });
    }
}

export default MatchGames;