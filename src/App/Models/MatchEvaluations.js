
import Sequelize, { Model } from "sequelize";

class MatchEvaluations extends Model {

    static init(sequelize) {

        super.init({

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

            evaluator_player_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },

            evaluated_player_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },

            rating: {
                type: Sequelize.DECIMAL(3, 1),
                allowNull: false,
            },

        }, {

            sequelize,
            tableName: "match_evaluations",
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
            foreignKey: "evaluator_player_id",
            as: "evaluator",
        });

        this.belongsTo(models.Player, {
            foreignKey: "evaluated_player_id",
            as: "evaluated",
        });

    }
}

export default MatchEvaluations;

