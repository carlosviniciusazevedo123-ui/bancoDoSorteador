import Sequelize, { Model } from "sequelize";

class User extends Model {

    static init(sequelize) {

        super.init(
            {
                id: {
                    type: Sequelize.UUID,
                    primaryKey: true,
                    allowNull: false,
                    defaultValue: Sequelize.UUIDV4,
                },

                name: {
                    type: Sequelize.STRING,
                    allowNull: false,
                },

                email: {
                    type: Sequelize.STRING,
                    allowNull: false,
                    unique: true,
                },

                password_hash: {
                    type: Sequelize.STRING,
                    allowNull: false,
                },
            },
            {
                sequelize,
                tableName: "users",
                timestamps: true,
                underscored: true,
            }
        );

        return this;
    }

    static associate(models) {

        this.hasMany(models.Player, {
            foreignKey: "user_id",
            as: "players",
        });

        this.hasMany(models.Matches, {
            foreignKey: "user_id",
            as: "matches",
        });
    }
}

export default User;