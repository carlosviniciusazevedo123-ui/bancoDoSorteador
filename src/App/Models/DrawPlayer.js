import Sequelize, { Model } from "sequelize";

class DrawPlayer extends Model {
    static init(sequelize) {
        super.init(
            {
                id: {
                    type: Sequelize.UUID,
                    primaryKey: true,
                    allowNull: false,
                    defaultValue: Sequelize.UUIDV4,
                },

                draw_id: {
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
            },
            {
                sequelize,
                tableName: "draw_players",
                timestamps: true,
                underscored: true,
            }
        );

        return this;
    }

    static associate(models) {
        this.belongsTo(models.Draw, {
            foreignKey: "draw_id",
            as: "draw",
        });

        this.belongsTo(models.DrawTeam, {
            foreignKey: "team_id",
            as: "team",
        });

        this.belongsTo(models.Player, {
            foreignKey: "player_id",
            as: "player",
        });
    }
}

export default DrawPlayer;