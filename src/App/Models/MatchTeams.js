import Sequelize, { Model } from "sequelize";

class MatchTeams extends Model {
    static init(sequelize) {
        super.init({
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.UUIDV4,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            team_number: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            score: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
        }, {
            sequelize,
            tableName: "match_teams",
            timestamps: true,
            underscored: true,
        });

        return this;
    }

    static associate(models) {
        this.belongsTo(models.Matches, {
            foreignKey: "match_id",
            as: "match"
        });

        this.hasMany(models.MatchPlayers, {
            foreignKey: "team_id",
            as: "players"
        });

        this.hasMany(models.MatchEvents, {
            foreignKey: "team_id",
            as: "events"
        });
    }
}

export default MatchTeams;
