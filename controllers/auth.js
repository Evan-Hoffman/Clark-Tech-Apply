const mysql = require("mysql");

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DATABASE
});

exports.register = (req, res) => {
    console.log(req.body);

    const {name, email, password, passwordConfirm} = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], (error, results)=>{
        if (error) {
            console.log(error);
        }
        if (results.length > 0){
            return res.render('register', {
                message: 'That email is already in use'
            })
        }   else if (password != passwordConfirm) {
                return res.render('register', {
                    message: 'Passwords do not match'
                });
            
        }
    })

    
    res.send("Form submitted");
}