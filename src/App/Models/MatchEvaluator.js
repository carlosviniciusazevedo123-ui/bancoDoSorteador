import Sequelize, { Model } from "sequelize";

class MatchEvaluator extends Model {
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
                unique: true,
                allowNull: false,
            },
            evaluator_player_id: {
                type: Sequelize.UUID,
                allowNull: true,
            },
            token: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            expires_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            used_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            tableName: "match_evaluators",
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
            as: "evaluatorPlayer",
        });

        this.hasMany(models.MatchEvaluatorSession,{
            foreignKey: "match_evaluator_id",
            as:"sessions"
        });
    }
}

export default MatchEvaluator;