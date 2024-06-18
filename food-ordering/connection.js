const mysql = require("mysql");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "123",
    database: "food_delivery",
    port: 3306
});

connection.connect(function (error) {
    if (error) {
        console.log(error.message);
        return false;
    }
    // console.log("Database Connection Created");
});
module.exports = connection;