import Sequelize, { Model } from "sequelize";

class Draw extends Model {
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

                how_many_teams: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                },

                players_per_team: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                },

                has_reserve: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },

                reserve_per_team: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },

                consider_goalkeepers: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
            },
            {
                sequelize,
                tableName: "draws",
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

        this.hasMany(models.DrawTeam, {
            foreignKey: "draw_id",
            as: "teams",
        });
    }
}

export default Draw;