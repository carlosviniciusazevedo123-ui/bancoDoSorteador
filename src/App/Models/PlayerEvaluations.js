import Sequelize, { Model } from "sequelize";

class PlayerEvaluations extends Model {

    static init(sequelize) {

        super.init({

            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.UUIDV4
            },

            match_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },

            evaluator_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },

            evaluated_player_id: {
                type: Sequelize.UUID,
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
            tableName: "player_evaluations",
            timestamps: true,
            underscored: true,

        });

        return this;
    }

    static associate(models) {

        this.belongsTo(models.Matches, {
            foreignKey: "match_id",
            as: "match",
        });

        this.belongsTo(models.Player, {
            foreignKey: "evaluator_id",
            as: "evaluator",
        });

        this.belongsTo(models.Player, {
            foreignKey: "evaluated_player_id",
            as: "evaluatedPlayer",
        });

    }
}

export default PlayerEvaluations;