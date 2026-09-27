import Sequelize, { Model } from "sequelize";

class MatchEvaluatorSession extends Model {
    static init(sequelize) {
        super.init({
            id: {
                primaryKey:true,
                type: Sequelize.UUID,
                allowNull: false,
                defaultValue: Sequelize.UUIDV4,
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
            match_evaluator_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            player_id: {
                type: Sequelize.UUID,
                allowNull: false,
            }

        }, {
            sequelize,
            tableName: "match_evaluator_sessions",
            timestamps: true,
            underscored: true,
        });

        return this;

    }
    static associate(models) {
        this.belongsTo(models.MatchEvaluator, {
            foreignKey: "match_evaluator_id",
            as: "matchEvaluator"
        });

        this.belongsTo(models.Player, {
            foreignKey: "player_id",
            as: "player"
        });
    }
}

export default MatchEvaluatorSession;