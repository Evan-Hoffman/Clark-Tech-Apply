const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("<hi>Home Page</h1>")
})

app.listen(6000, () => {
    console.log("Server started on Port 6000");
})