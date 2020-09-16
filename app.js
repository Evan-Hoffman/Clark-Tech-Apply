const express = require("express");
const mysql = require("mysql");
const dotenv = require("dotenv");
const path = require('path');

const app = express();
dotenv.config({path: './.env'});


//setup Database connection:
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DATABASE
});
//public directory for styling:
const publicDirectory = path.join(__dirname, './public');

//make sure express is using public directory:
app.use(express.static(publicDirectory));

//Parse URL-encoded bodies (as sent through HTML forms)
app.use(express.urlencoded({extended: false}));
//Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.set('view engine', 'hbs');

db.connect( (error) => {
    if(error){
        console.log(error)
    }
    else {
        console.log("MYSQL Connected")
    }
})

//Define routes:
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));

app.listen(5000, () => {
    console.log("Server started on Port 5000");
})