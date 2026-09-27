import Sequelize, { Model } from "sequelize";

class Player extends Model {
    static init(sequelize) {
        super.init({
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

            name: {
                type: Sequelize.STRING,
                allowNull: false,
            },

            position: {
                type: Sequelize.STRING,
                allowNull: true,
            },

            is_goalkeeper: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            overall_rating: {
                type: Sequelize.DECIMAL(3, 1),
                allowNull: false,
            },
            attack: {
                type: Sequelize.DECIMAL(3, 1),
                allowNull: true,
            },
            defense: {
                type: Sequelize.DECIMAL(3, 1),
                allowNull: true,
            },
            passing: {
                type: Sequelize.DECIMAL(3, 1),
                allowNull: true,
            },
            finishing: {
                type: Sequelize.DECIMAL(3, 1),
                allowNull: true,
            },
            speed: {
                type: Sequelize.DECIMAL(3, 1),
                allowNull: true,
            },
            decision_making: {
                type: Sequelize.DECIMAL(3, 1),
                allowNull: true,
            },

        }, {
            sequelize,
            tableName: "players",
            timestamps: true,
            underscored: true,

        });
        return this;
    }

    static associate(models) {
        this.belongsTo(models.User, {
            foreignKey: "user_id",
            as: "user"
        });

        this.hasMany(models.MatchPlayers, {
            foreignKey: "player_id",
            as: "matches"
        });

        this.hasMany(models.MatchEvents, {
            foreignKey: "player_id",
            as: "events"
        });

        this.hasMany(models.MatchEvaluations, {
            foreignKey: "evaluator_player_id",
            as: "evaluationsGiven"
        });

        this.hasMany(models.MatchEvaluations, {
            foreignKey: "evaluated_player_id",
            as: "evaluationsReceived"
        });

        this.hasMany(models.PlayerEvaluations, {
            foreignKey: "evaluator_id",
            as: "attributeEvaluationsGiven"
        });

        this.hasMany(models.PlayerEvaluations, {
            foreignKey: "evaluated_player_id",
            as: "attributeEvaluationsReceived"
        });

        this.hasMany(models.MatchEvaluatorSession, {
            foreignKey: "player_id",
            as: "sessions"
        })

    }
}

export default Player;
