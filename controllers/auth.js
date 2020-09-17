const mysql = require("mysql");
const jtoken = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {promisify} = require('util');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DATABASE
});

exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).render('login', {
                message: 'Please provide an email and a password'
            })
        }

        db.query('SELECT * FROM users WHERE email = ?',[email], async (error, results) => {
            console.log(results);
            if(!results || !(await bcrypt.compare(password, results[0].password))) {
                res.status(401).render('login', {
                    message: 'Your email or password is incorrect'
                })
            }
            else {
                const id = results[0].id;
                const token = jtoken.sign({id: id}, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                });
                //console.log("The token is: " + token);

                const cookieOptions = {
                    expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                    ),
                    httpOnly: true
                }
                res.cookie('jtoken', token, cookieOptions);
                res.status(200).redirect("/");
            }
        })

    } catch (error) {
        console.log(error);
    }
}

exports.register = (req, res) => {
    console.log(req.body);

    const {name, email, password, passwordConfirm} = req.body;

    if (name == '' || email == '' || password == '' || passwordConfirm == ''){
        return res.render('register', {
            message: 'You are missing one or more fields'
        })
    }

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results)=>{
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

        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword);
        //column: value (from above):
        db.query('INSERT INTO users SET ?', {name: name, email: email, password: hashedPassword}, (error, results) => {
            if(error) {
                console.log(error);
            }
            else {
                console.log(results);
                return res.render('register', {
                    message: 'User Registered'
                });
            }
            
        })
        });
}

exports.isLoggedIn = async (req, res, next) => {
    //console.log(req.cookies);
    if (req.cookies.jtoken) {
        try {
            //verify the token:
            const decoded = await promisify(jtoken.verify)(req.cookies.jtoken, process.env.JWT_SECRET);
            console.log(decoded);

            //check if the user still exists:
            db.query('SELECT * FROM users WHERE id = ?', [decoded.id], (error, result) => {
            console.log(result);

            if(!result){
                return next();
            }

            req.user = result[0];
            return next();
        });
        } catch (error) {
            console.log(error);
            return next();
        }
    }
    else {
        next();
    }
}

exports.logout = async (req, res) => {
    res.cookie('jtoken', 'logout', {
        expires: new Date(Date.now() + 2*1000),
        httpOnly: true
    });
    res.status(200).redirect('/');
}