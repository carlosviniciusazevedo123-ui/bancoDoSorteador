import Sequelize, { Model } from "sequelize";

class DrawTeam extends Model {
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

                name: {
                    type: Sequelize.STRING,
                    allowNull: false,
                },

                team_number: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                },

                score: {
                    type: Sequelize.DECIMAL(3, 1),
                    allowNull: false,
                    defaultValue: 0,
                },
            },
            {
                sequelize,
                tableName: "draw_teams",
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

        this.hasMany(models.DrawPlayer, {
            foreignKey: "team_id",
            as: "players",
        });
    }
}

export default DrawTeam;