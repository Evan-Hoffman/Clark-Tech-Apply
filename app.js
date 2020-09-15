const express = require("express");
const app = express();
const mysql = require("mysql");



app.get("/", (req, res) => {
    res.send("<hi>Home Page</h1>")
})

app.listen(5000, () => {
    console.log("Server started on Port 5000");
})