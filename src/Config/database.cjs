const { config } = require("dotenv");

config();

module.exports = {
    
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    define: {
        timestamps: true,
        underscored: true,
        underscoredAll: true
    }
};