const mysql = require("mysql");
const jtoken = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { promisify } = require('util');
var fs = require('fs');

var db_config = {
    //connectionLimit : 100,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DATABASE
};

const transport = nodemailer.createTransport({
    service: "Yahoo",
    auth: {
        user: process.env.CTA_EMAIL,
        pass: process.env.CTA_EMAIL_PASSWORD,
    },
});

//setup Database connection:
let pool = mysql.createPool(db_config);

/**********************************************************Login/Logout/Registration Methods*******************************************************************/

//allows the user to logout
exports.logout = async (req, res) => {
    res.cookie('jtoken', 'logout', {
        expires: new Date(Date.now() + 2 * 1000),
        httpOnly: true
    });
    req.session = null;
    console.log("Someone has just logged out");
    res.status(200).redirect('/');
}

exports.sendConfirmationEmail = (name, email, confirmationCode) => {
    //console.log("Check");
    transport.sendMail({
        from: process.env.CTA_EMAIL,
        to: email,
        subject: "Please confirm your account",
        html: `<h1>Email Confirmation</h1>
          <h2>Hello ${name}</h2>
          <p>Thank you for registering for Clark TechApply. Please confirm your email by clicking on the following link</p>
          <a href=https://clarktechapply.com/auth/confirm/${confirmationCode}> Click here </a>
          </div>`,
    }).catch(err => console.log(err));

    console.log("Account confirmation email has been issued to: " + email);

};

//register a new user
exports.register = (req, res) => {

    //console.log(req.body);

    let { name, grad_year, email, password, passwordConfirm } = req.body;

    //console.log(grad_year);

    //console.log(name);


    if (name == '' || email == '' || password == '' || passwordConfirm == '') {
        console.log("Someone forgot a field when trying to register");
        return res.render('register', {
            message1: 'You are missing one or more fields'
        })
    }

    if (!email.includes("@clarku.edu")) {
        console.log("Someone tried to sign up with a non-clark email");
        return res.render('register', {
            message1: 'Please signup with your Clark Email Address'
        })
    }

    if (grad_year == '0000') {
        grad_year = null;
    }

    pool.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log(error);
        }
        if (results.length > 0) {
            console.log("Someone tried to register with an email already in use: " + email);
            return res.render('register', {
                message1: 'That email is already in use'
            })
        } else if (password != passwordConfirm) {
            console.log("Someone's password and passwordConfirm did not match");
            return res.render('register', {
                message1: 'Passwords do not match'
            });
        }

        let hashedPassword = await bcrypt.hash(password, 8);
        //console.log(hashedPassword);
        const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let token = '';
        for (let i = 0; i < 25; i++) {
            token += characters[Math.floor(Math.random() * characters.length)];
        }
        pool.query('INSERT INTO users SET ?', { name: name, email: email, password: hashedPassword, confirmation_code: token, grad_year: grad_year }, (error, results) => {
            if (error) {
                console.log(error);
            }
            else {
                //create the user their own instance of an internship apps table
                var table_name = results.insertId + '_apps';
                pool.query('CREATE TABLE ' + table_name + ' (job_id INT NOT NULL PRIMARY KEY AUTO_INCREMENT, company_name VARCHAR (250), internship_title VARCHAR (250), link VARCHAR (250), date_applied DATE, date_tracked DATETIME DEFAULT CURRENT_TIMESTAMP, app_status VARCHAR (50), has_status INT)', (error, results) => {
                    if (error) {
                        console.log(error);
                    }
                    else {
                        //console.log(results);
                    }
                })
                console.log(email + " has just registered an account (pre confirmation");
                exports.sendConfirmationEmail(
                    name,
                    email,
                    token
                );
                return res.render('register', {
                    message2: 'User Registered Succesfully! Please check your email'
                });

            }
        });
    });

}

exports.verifyUser = (req, res) => {
    let ccode = req.params.confirmationCode;
    pool.query('UPDATE users SET active = 1 WHERE confirmation_code = ?', [ccode], (error, results) => {
        if (error) {
            console.log(error);
        }

        pool.query('UPDATE users SET confirmation_code = 0 WHERE confirmation_code = ?', [ccode], (error, results) => {
            if (error) {
                console.log(error);
            }
            console.log("Someone just verified their account");
        });
    });
    return res.render('login', {
        message2: 'Account Verified. Please Login'
    });
}

//login a user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).render('login', {
                message1: 'Please provide an email and a password'
            })
        }

        pool.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.log(error);
            }
            if (results.length == 0 || !(await bcrypt.compare(password, results[0].password))) {
                console.log("Someone's email or password is incorrect")
                res.status(401).render('login', {
                    message1: 'Your email or password is incorrect'
                })
            }
            else if (results[0].active == 0) {
                console.log(email + " tried to login before confirming their account");
                return res.status(401).render('login', {
                    message1: "Pending Account. Please Verify Your Email!"
                });
            }
            else {
                const id = results[0].id;
                const token = jtoken.sign({ id: id }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                });
                //console.log("The token is: " + token);

                const cookieOptions = {
                    expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                    ),
                    httpOnly: true
                }
                console.log(email + " has just logged in");
                res.cookie('jtoken', token, cookieOptions);
                res.status(200).redirect("/");
            }
        })


    } catch (error) {
        console.log(error);
    }

}

//function checks if you are logged in and a user, for purposes of hiding pages for users not logged in
exports.isLoggedIn = async (req, res, next) => {
    //console.log(req.cookies);
    if (req.cookies.jtoken) {
        try {
            //verify the token:
            const decoded = await promisify(jtoken.verify)(req.cookies.jtoken, process.env.JWT_SECRET);
            //console.log(decoded);

            //check if the user still exists:
            pool.query('SELECT * FROM users WHERE id = ?', [decoded.id], (error, result) => {
                // console.log(result);

                if (error) {

                    console.log(error);
                }

                if (!result) {
                    return next();
                }

                req.user = result[0];
                //console.log(req.user);
                return next();
            });
        } catch (error) {
            //console.log(error);
            return next();
        }
    }
    else {
        next();
    }
}

/**********************************************************Account/Settings Methods*******************************************************************/

exports.deleteAccount = (req, res) => {

    pool.query('DELETE FROM users WHERE email = ?', [req.body.email], (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            pool.query('DROP TABLE ' + req.params.id + '_apps', (error, results) => {
                if (error) {
                    console.log(error);
                }
            });
        }
    });

    res.cookie('jtoken', 'logout', {
        expires: new Date(Date.now() + 2 * 1000),
        httpOnly: true
    });

    console.log(req.body.email + " has just deleted their account");

    res.status(200).redirect('/');
}

exports.resetPassword = async (req, res) => {
    let code = req.params.code;
    if (code == 0) {
        console.log("Someone attempted to reset their password with a confirmation code of 0");
        return res.render('passwordreset', {
            message1: 'Error with resetting password, please contact clarktechapply@yahoo.com'
        })
    }

    if (req.body.password == '' || req.body.passwordConfirm == '') {
        console.log("Someone left a field empty on password reset form");
        req.session.message1 = 'You are missing one or more fields';
        return res.redirect('/passwordreset/' + code);
    }

    if (req.body.password != req.body.passwordConfirm) {
        console.log("Someone failed password match on password reset form");
        req.session.message1 = 'Your password do not match';
        return res.redirect('/passwordreset/' + code);
    }

    let hashedPassword = await bcrypt.hash(req.body.password, 8);

    pool.query('UPDATE users SET password = ? WHERE confirmation_code = ?', [hashedPassword, code], (error, results) => {
        if (error) {
            console.log(error);
        }

        pool.query('UPDATE users SET confirmation_code = 0 WHERE confirmation_code = ?', [code], (error, results) => {
            if (error) {
                console.log(error);
            }
        });
    });

    console.log("Someone succesfully reset their password");
    return res.render('login', {
        message2: 'Password Reset, Please Login'
    });
}


exports.updateEmail = (req, res) => {
    //console.log("New Email: " + req.body.newEmail);
    //console.log("Old Email: " + req.params.email);
    if (!req.body.newEmail.includes("@clarku.edu")) {
        req.session.message1 = 'Please use your Clark Email Address';
        return res.redirect('/settings');
    }
    pool.query('UPDATE users SET email = ? WHERE email = ?', [req.body.newEmail, req.params.email], (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log(req.params.email + " has succesfully updated their email to " + req.body.newEmail);
            req.session.message2 = 'Email Updated';
            return res.redirect('/settings');
        }
    });
}

exports.toggleEmailNotifications = (req, res) => {
    //console.log(req.body);
    let email_consent = req.body.email_consent;
    if (email_consent.length > 1) {
        email_consent = '1';
    }


    pool.query('UPDATE users SET email_consent = ? WHERE email = ?', [email_consent, req.params.email], (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log(req.params.email + " has updated their notification preferences ");
            req.session.message2 = 'Preferences Updated';
            return res.redirect('/settings');
        }
    });
}

exports.updateName = (req, res) => {

    pool.query('UPDATE users SET name = ? WHERE email = ?', [req.body.newName, req.params.email], (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log(req.params.email + " has succesfully updated their name to " + req.body.newName);
            req.session.message2 = 'Name Updated';
            return res.redirect('/settings');
        }
    });
}

exports.updateYear = (req, res) => {
    let grad_year = req.body.grad_year;

    if (grad_year == '0000') {
        grad_year = null;
    }

    pool.query('UPDATE users SET grad_year = ? WHERE email = ?', [grad_year, req.params.email], (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log(req.params.email + " has succesfully updated their grad year to " + grad_year);
            req.session.message2 = 'Grad Year Updated';
            return res.redirect('/settings');
        }
    });
}

exports.sendResetEmail = (req, res) => {
    pool.query('SELECT * FROM users WHERE email = ?', [req.body.email], (error, results) => {
        if (error) {
            console.log(error);
        }
        if (results.length == 0) {
            console.log(req.body.email + " just tried to get a password email, but there email is not in our records");
            req.session.message1 = 'There is no user with that email in our records';
            return res.redirect('/settings');
        }
        else {
            const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let token = '';
            for (let i = 0; i < 25; i++) {
                token += characters[Math.floor(Math.random() * characters.length)];
            }
            pool.query('UPDATE users SET confirmation_code = ? WHERE email = ?', [token, req.body.email], (error, results) => {
                if (error) {
                    console.log(error);
                }
            });
            transport.sendMail({
                from: process.env.CTA_EMAIL,
                to: req.body.email,
                subject: "Password Reset",
                html: `<h1>Password Reset</h1>
                    <h2>Hello</h2>
                    <p>To reset your ClarkTech Apply Password, please click the link below</p>
                    <a href=https://clarktechapply.com/passwordreset/${token}> Click here </a>
                    <p>If you did not request a password change, no action is needed from you at this time</p>

                    </div>`,
            }).catch(err => console.log(err));

            console.log(req.body.email + " has just requested to reset their password");
            return res.render('login', {
                message2: 'Reset Email Sent'
            });

        }

    });
}
/**********************************************************Internship Pages Methods*******************************************************************/

//populate the internships page from the database
exports.populateFulltime = async (req, res, next) => {
    if (req.user) {
        try {
            pool.query('SELECT * FROM ' + process.env.DB_CURRENT_SEASON + ' WHERE is_ft = 1 AND is_ugrad = 1 ORDER BY job_id', async (error, result, fields) => {
                //console.log(result);
                if (error) {
                    console.log(error);
                }
                if (!result) {
                    return next();
                }
                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                //console.log('>> json: ', json);

                pool.query('SELECT * FROM ' + process.env.DB_PREV_SEASON + ' WHERE is_ft = 1 AND is_ugrad = 1 ORDER BY job_id', async (error, results, fields) => {
                    //console.log(result);
                    if (error) {
                        console.log(error);
                    }
                    if (!results) {
                        return next();
                    }
                    var string2 = JSON.stringify(results);
                    var json2 = JSON.parse(string2);

                    populateInternshipsHelper(req, json, function () {
                        // console.log(json);
                        req.cur_listings = json;

                        populateInternshipsHelper(req, json2, function () {
                            // console.log(json);
                            req.prev_listings = json2;
                            return next();
                        });
                    });
                });

            });
        } catch (error) {
            console.log(error);
            return next();
        }
        console.log(req.user.email + " has just loaded up the New-Grad page");
    }
    else {
        return next();
    }
}

//populate the internships page from the database
exports.populateInternships = async (req, res, next) => {
    if (req.user) {
        try {
            pool.query('SELECT * FROM ' + process.env.DB_CURRENT_SEASON + ' WHERE is_ug = 0 AND is_ep = 0 AND is_ft = 0 AND is_uc = 0 AND is_ugrad = 1 ORDER BY job_id', async (error, result, fields) => {
                if (error) {
                    console.log(error);
                }
                if (!result) {
                    return next();
                }
                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                //console.log('>> json: ', json);

                pool.query('SELECT * FROM ' + process.env.DB_PREV_SEASON + ' WHERE is_ug = 0 AND is_ep = 0 AND is_ft = 0 AND is_uc = 0 AND is_ugrad = 1 ORDER BY job_id', async (error, results, fields) => {
                    //console.log(result);
                    if (error) {
                        console.log(error);
                    }
                    if (!results) {
                        return next();
                    }
                    var string2 = JSON.stringify(results);
                    var json2 = JSON.parse(string2);
                    //console.log('>> json: ', json);

                    populateInternshipsHelper(req, json, function () {
                        //console.log('small list: ', json);
                        req.cur_listings = json;

                        populateInternshipsHelper(req, json2, function () {
                            // console.log(json);
                            req.prev_listings = json2;
                            return next();
                        });

                        //return next(); 
                    });
                });
            });
        }
        catch (error) {
            console.log(error);
            return next();
        }
        console.log(req.user.email + " has just loaded up the internships page");
    }
    else {
        return next();
    }
}

function populateInternshipsHelper(req, json, _callback) {
    //console.log('>> json: ', json);

    pool.query('SELECT job_id FROM ' + req.user.id + '_apps ORDER BY job_id', (error, results, fields) => {
        if (error) {
            console.log(error);
        }
        if (!results) {
            return next();
        }

        var string_tracked = JSON.stringify(results);
        var json_tracked = JSON.parse(string_tracked);
        //console.log('>> json_tracked: ', json_tracked);

        for (var i = 0; i < json.length; i++) {
            json[i]["date_added"] = json[i]["date_added"].substring(0, 10);
        }

        var jsonPtr = 0;
        var trackedPtr = 0;

        while (jsonPtr < json.length && trackedPtr < json_tracked.length) {
            if (json[jsonPtr]["job_id"] > json_tracked[trackedPtr]["job_id"]) {
                trackedPtr++;
            }
            else if (json[jsonPtr]["job_id"] == json_tracked[trackedPtr]["job_id"]) {
                json[jsonPtr]["is_tracked"] = 1;
                jsonPtr++;
                trackedPtr++;
            }
            else {
                json[jsonPtr]["is_tracked"] = 0;
                jsonPtr++;
            }
        }

        json = json.sort((job1, job2) => (job1.date_added < job2.date_added) ? 1 : (job1.date_added > job2.date_added) ? -1 : 0);

        _callback();

    });

}

//populate the grad internships page from the database
exports.populateGradInternships = async (req, res, next) => {
    if (req.user) {
        try {
            pool.query('SELECT * FROM ' + process.env.DB_CURRENT_SEASON + ' WHERE is_ug = 0 AND is_ep = 0 AND is_ft = 0 AND is_uc = 0 AND is_grad = 1 ORDER BY job_id', async (error, result, fields) => {
                //console.log(result);
                if (error) {
                    console.log(error);
                }
                if (!result) {
                    return next();
                }
                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                //console.log('>> json: ', json);

                pool.query('SELECT * FROM ' + process.env.DB_PREV_SEASON + ' WHERE is_ug = 0 AND is_ep = 0 AND is_ft = 0 AND is_uc = 0 AND is_grad = 1 ORDER BY job_id', async (error, results, fields) => {
                    //console.log(result);
                    if (error) {
                        console.log(error);
                    }
                    if (!results) {
                        return next();
                    }
                    var string2 = JSON.stringify(results);
                    var json2 = JSON.parse(string2);
                    //console.log('>> json: ', json);

                    populateInternshipsHelper(req, json, function () {
                        //console.log('small list: ', json);
                        req.cur_listings = json;

                        populateInternshipsHelper(req, json2, function () {
                            // console.log(json);
                            req.prev_listings = json2;
                            return next();
                        });

                        //return next(); 
                    });
                });
            });
        } catch (error) {
            console.log(error);
            return next();
        }
        console.log(req.user.email + " has just loaded up the grad internships page");
    }
    else {
        return next();
    }
}

//populate the grad fulltime page from the database
exports.populateGradFulltime = async (req, res, next) => {
    if (req.user) {
        try {
            pool.query('SELECT * FROM ' + process.env.DB_CURRENT_SEASON + ' WHERE is_ft = 1 AND is_grad = 1 ORDER BY job_id', async (error, result, fields) => {
                //console.log(result);
                if (error) {
                    console.log(error);
                }
                if (!result) {
                    return next();
                }
                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                //console.log('>> json: ', json);

                pool.query('SELECT * FROM ' + process.env.DB_PREV_SEASON + ' WHERE is_ft = 1 AND is_grad = 1 ORDER BY job_id', async (error, results, fields) => {
                    //console.log(result);
                    if (error) {
                        console.log(error);
                    }
                    if (!results) {
                        return next();
                    }
                    var string2 = JSON.stringify(results);
                    var json2 = JSON.parse(string2);

                    populateInternshipsHelper(req, json, function () {
                        //console.log('small list: ', json);
                        req.cur_listings = json;

                        populateInternshipsHelper(req, json2, function () {
                            // console.log(json);
                            req.prev_listings = json2;
                            return next();
                        });

                        //return next(); 
                    });
                });
            });
        } catch (error) {
            console.log(error);
            return next();
        }
        console.log(req.user.email + " has just loaded up the grad fulltime page");
    }
    else {
        return next();
    }
}


//populate the underrepresented groups page from the database
exports.populateUnderrepresented = async (req, res, next) => {
    if (req.user) {
        try {
            pool.query('SELECT * FROM ' + process.env.DB_CURRENT_SEASON + ' WHERE is_ug = 1 AND is_ugrad = 1 ORDER BY job_id', async (error, result, fields) => {
                //console.log(result);
                if (error) {
                    console.log(error);
                }
                if (!result) {
                    return next();
                }
                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                //console.log('>> json: ', json);

                pool.query('SELECT * FROM ' + process.env.DB_PREV_SEASON + ' WHERE is_ug = 1 AND is_ugrad = 1 ORDER BY job_id', async (error, results, fields) => {
                    //console.log(result);
                    if (error) {
                        console.log(error);
                    }
                    if (!results) {
                        return next();
                    }
                    var string2 = JSON.stringify(results);
                    var json2 = JSON.parse(string2);

                    populateInternshipsHelper(req, json, function () {
                        //console.log('small list: ', json);
                        req.cur_listings = json;

                        populateInternshipsHelper(req, json2, function () {
                            // console.log(json);
                            req.prev_listings = json2;
                            return next();
                        });

                        //return next(); 
                    });
                });
            });
        } catch (error) {
            console.log(error);
            return next();
        }
        console.log(req.user.email + " has just loaded up the programs for underrepresented peoples page");
    }
    else {
        return next();
    }
}

//populate the underclassmen page from the database
exports.populateUnderclassmen = async (req, res, next) => {
    if (req.user) {
        try {
            pool.query('SELECT * FROM ' + process.env.DB_CURRENT_SEASON + ' WHERE is_uc = 1 AND is_ugrad = 1 ORDER BY job_id', async (error, result, fields) => {
                //console.log(result);
                if (error) {
                    console.log(error);
                }
                if (!result) {
                    return next();
                }
                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                //console.log('>> json: ', json);

                pool.query('SELECT * FROM ' + process.env.DB_PREV_SEASON + ' WHERE is_uc = 1 AND is_ugrad = 1 ORDER BY job_id', async (error, results, fields) => {
                    //console.log(result);
                    if (error) {
                        console.log(error);
                    }
                    if (!results) {
                        return next();
                    }
                    var string2 = JSON.stringify(results);
                    var json2 = JSON.parse(string2);
                    //console.log('>> json: ', json);

                    populateInternshipsHelper(req, json, function () {
                        //console.log('small list: ', json);
                        req.cur_listings = json;

                        populateInternshipsHelper(req, json2, function () {
                            // console.log(json);
                            req.prev_listings = json2;
                            return next();
                        });

                        //return next(); 
                    });
                });
            });
        } catch (error) {
            console.log(error);
            return next();
        }
        console.log(req.user.email + " has just loaded up the programs for underclassmen page");
    }
    else {
        return next();
    }
}

//populate the internships page from the database
exports.populateExploratory = async (req, res, next) => {
    if (req.user) {
        try {
            pool.query('SELECT * FROM ' + process.env.DB_CURRENT_SEASON + ' WHERE is_ep = 1 AND is_ugrad = 1 ORDER BY job_id', async (error, result, fields) => {
                //console.log(result);
                if (error) {
                    console.log(error);
                }
                if (!result) {
                    return next();
                }
                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                //console.log('>> json: ', json);

                pool.query('SELECT * FROM ' + process.env.DB_PREV_SEASON + ' WHERE is_ep = 1 AND is_ugrad = 1 ORDER BY job_id', async (error, results, fields) => {
                    //console.log(result);
                    if (error) {
                        console.log(error);
                    }
                    if (!results) {
                        return next();
                    }
                    var string2 = JSON.stringify(results);
                    var json2 = JSON.parse(string2);
                    //console.log('>> json: ', json);


                    populateInternshipsHelper(req, json, function () {
                        //console.log('small list: ', json);
                        req.cur_listings = json;

                        populateInternshipsHelper(req, json2, function () {
                            // console.log(json);
                            req.prev_listings = json2;
                            return next();
                        });

                        //return next(); 
                    });
                });
            });
        } catch (error) {
            console.log(error);
            return next();
        }
        console.log(req.user.email + " has just loaded up the Exploratory Programs page");
    }
    else {
        return next();
    }
}

//adds a suggestion to suggestions table once user has submitted it
exports.suggest = (req, res) => {
    //console.log(req.body);

    let { suggested_by, origin, role_type, class_type, company_name, internship_title, link, international_allowed, swe_web_tag, swe_backend_tag, swe_mobile_tag,
        dsci_tag, devops_tag, consulting_tag, cyber_tag, networks_tag, pm_tag, ux_tag, it_tag, ba_tag, juniors_only, is_ug, is_uc } = req.body;

    let is_ep = 0;
    let is_ft = 0;

    let is_ugrad = 0;
    let is_grad = 0;
    let is_both = 0;

    if (role_type == 2) {
        is_ft = 1;
    }
    else if (role_type == 3) {
        is_ep = 1;
    }

    if (class_type == 3) {
        is_both = 1;
        is_ugrad = 1;
        is_grad = 1;
    }
    else if (class_type == 1) {
        is_ugrad = 1;
    }
    else {
        is_grad = 1;
    }

    if (swe_backend_tag.length > 1) {
        swe_backend_tag = '1';
    }
    if (swe_web_tag.length > 1) {
        swe_web_tag = '1';
    }
    if (swe_mobile_tag.length > 1) {
        swe_mobile_tag = '1';
    }
    if (dsci_tag.length > 1) {
        dsci_tag = '1';
    }
    if (devops_tag.length > 1) {
        devops_tag = '1';
    }
    if (consulting_tag.length > 1) {
        consulting_tag = '1';
    }
    if (cyber_tag.length > 1) {
        cyber_tag = '1';
    }
    if (networks_tag.length > 1) {
        networks_tag = '1';
    }
    if (pm_tag.length > 1) {
        pm_tag = '1';
    }
    if (ux_tag.length > 1) {
        ux_tag = '1';
    }
    if (it_tag.length > 1) {
        it_tag = '1';
    }
    if (ba_tag.length > 1) {
        ba_tag = '1';
    }
    if (juniors_only.length > 1) {
        juniors_only = '1';
    }
    if (is_ug.length > 1) {
        is_ug = '1';
    }
    if (is_uc.length > 1) {
        is_uc = '1';
    }


    pool.query('INSERT INTO suggestions SET ?', {
        suggested_by: suggested_by, company_name: company_name, internship_title: internship_title, link: link, juniors_only: juniors_only,
        dsci_tag: dsci_tag, swe_backend_tag: swe_backend_tag, swe_web_tag: swe_web_tag, swe_mobile_tag: swe_mobile_tag, devops_tag: devops_tag, consulting_tag: consulting_tag, cyber_tag: cyber_tag, networks_tag: networks_tag, pm_tag: pm_tag,
        ux_tag: ux_tag, it_tag: it_tag, ba_tag: ba_tag, international_allowed: international_allowed, is_ug: is_ug, is_ep: is_ep, is_ft: is_ft, is_uc: is_uc, is_grad: is_grad, is_ugrad: is_ugrad, is_both: is_both
    }, (error, results) => {
        if (error) {
            console.log(error);
            return;
        }
        else {
            console.log("User " + suggested_by + "has submitted an internship reccomendation for approval")
            req.session.message2 = 'Suggestion Submitted for Approval. Thanks!';
            if (origin == 1) {
                return res.redirect('/internships');
            }
            if (origin == 2) {
                return res.redirect('/underrepresented');
            }
            if (origin == 3) {
                return res.redirect('/exploratory');
            }
            if (origin == 4) {
                return res.redirect('/fulltime');
            }
            if (origin == 5) {
                return res.redirect('/underclassmenonly');
            }
            if (origin == 6) {
                return res.redirect('/gradfulltime');
            }
            if (origin == 7) {
                return res.redirect('/gradinternships');
            }
        }

    });
}

//adds a correction suggestion to edit_suggestions table once user has submitted it
exports.suggestCorrection = (req, res) => {
    //console.log(req.body);
    let { job_id, link, is_closed, comments } = req.body;
    let suggested_by = req.user.id;

    if (is_closed == null && comments == '') {
        console.log("An empty suggestion was submitted by: " + suggested_by + " and filtered out");
        return;
    }

    pool.query('INSERT INTO edit_suggestions SET ?', {
        job_id: job_id,
        link: link, is_closed: is_closed, comments: comments, suggested_by: suggested_by
    }, (error, results) => {
        if (error) {
            console.log(error);
            return;
        }
        else {
            console.log("User " + suggested_by + "has submitted a correction for approval")
            return;
        }
    });
}

//allows a user to track an internship from the internships page (add it to myapps page)
exports.track = (req, res, next) => {
    //console.log(req.body);
    const jid = req.body.job_id;
    const tid = req.body.table_id;
    var table_name = '';
    if (tid == 1) {
        table_name = process.env.DB_CURRENT_SEASON;
    }
    else {
        table_name = process.env.DB_PREV_SEASON;
    }

    //console.log("tid value: ", req.body.table_id);
    pool.query('SELECT * FROM ' + table_name + ' WHERE job_id = ?', [jid], async (error, result) => {
        if (error) {
            console.log(error);
        }

        var string = JSON.stringify(result);
        var data = JSON.parse(string);
        //console.log('>> json: ', data); 
        const decoded = await promisify(jtoken.verify)(req.cookies.jtoken, process.env.JWT_SECRET);
        //console.log(decoded.id);

        pool.query('INSERT INTO ' + decoded.id + '_apps SET ?', { job_id: jid, company_name: data[0].company_name, link: data[0].link, internship_title: data[0].internship_title }, (error, results) => {
            if (error) {
                console.log(error);
                return;

            }

            else {
                console.log("User: " + decoded.id + " has just tracked job# " + jid);
                try {
                    return next();
                }
                catch (error) {
                    console.log(error);
                    return next();
                }
            }

        });
    });

}

/**********************************************************MyApps Methods*******************************************************************/

//allows a user to untrack an app from the myapps page
exports.untrack = async (req, res) => {
    const jid = req.body.job_id;
    const decoded = await promisify(jtoken.verify)(req.cookies.jtoken, process.env.JWT_SECRET);


    pool.query('DELETE FROM ' + decoded.id + '_apps WHERE job_id = ?', [jid], (error, result) => {
        if (error) {
            console.log(error);
        }

        else {
            console.log("User: " + decoded.id + " has just untracked job# " + jid);
            res.status(200).redirect("/myapps");
        }
    });
}

//method to update app status in MyApps
exports.update = async (req, res) => {

    const decoded = await promisify(jtoken.verify)(req.cookies.jtoken, process.env.JWT_SECRET);
    const jid = req.body.job_id;

    var updateCodes = {
        1: "'Applied'",
        2: "'Screener'",
        3: "'Hackerrank'",
        4: "'Recorded Behavioral'",
        5: "'Phone Interview'",
        6: "'Final/Onsite Interview'",
        7: "'Received Offer'",
        8: "'Accepted Offer'",
        9: "'Declined Offer'",
        10: "'Withdrew'",
        11: "'Rejected'"
    };

    if (req.body.update_code == 1) {

        pool.query("UPDATE " + decoded.id + "_apps SET app_status = " + updateCodes[req.body.update_code] + ", has_status = 1, date_applied = current_date() WHERE job_id = ?", [jid], (error, result) => {
            if (error) {
                console.log(error);
            }
            //console.log(result);
            console.log("User: " + decoded.id + " has just applied to job#: " + jid);
            res.status(200).redirect("/myapps");

        });
    }

    else {
        pool.query("UPDATE " + decoded.id + "_apps SET app_status = " + updateCodes[req.body.update_code] + ", has_status = 1 WHERE job_id = ?", [jid], (error, result) => {
            if (error) {
                console.log(error);
            }
            console.log("User: " + decoded.id + " has just updated their status on job#: " + jid + " to: " + updateCodes[req.body.update_code]);
            res.status(200).redirect("/myapps");

        });
    }
}

//populates the table in the myapps page from the user's tracked apps table
exports.populateMyApps = async (req, res, next) => {
    try {
        pool.query('SELECT * FROM ' + req.user.id + '_apps ORDER BY date_tracked DESC', (error, result, fields) => {
            if (error) {
                console.log(error);
            }
            if (!result) {
                return next();
            }

            var string = JSON.stringify(result);
            //console.log('>> string: ', string );
            var json = JSON.parse(string);
            for (var i = 0; i < json.length; i++) {
                if (json[i]["date_applied"] != null) {
                    json[i]["date_applied"] = json[i]["date_applied"].substring(0, 10);
                }
            }
            //console.log('>> json: ', json);
            req.myapps = json;
            console.log(req.user.email + " has just loaded up MyApps");
            return next();
        });
    } catch (error) {
        console.log(error);
        return next();
    }
}

/**********************************************************Privileged Methods*******************************************************************/
//populate the internships page from the database
exports.populateApprovals = async (req, res, next) => {
    if (req.user) {
        try {
            pool.query('SELECT * FROM suggestions ORDER BY date_suggested', async (error, result, fields) => {
                //console.log(result);
                if (error) {
                    console.log(error);
                }
                if (!result) {
                    return next();
                }
                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                //console.log('>> json: ', json);
                for (var i = 0; i < json.length; i++) {
                    //Parse time of day:
                    json[i]["date_suggested"] = json[i]["date_suggested"].substring(0, 10);
                }
                req.suggestions = json;
                pool.query('SELECT * FROM edit_suggestions ORDER BY date_suggested', async (error, results, fields) => {
                    if (error) {
                        console.log(error);
                    }
                    if (!results) {
                        return next();
                    }
                    var string2 = JSON.stringify(results);
                    var json2 = JSON.parse(string2);
                    //console.log('>> json: ', json);
                    for (var i = 0; i < json2.length; i++) {
                        //Parse time of day:
                        json2[i]["date_suggested"] = json2[i]["date_suggested"].substring(0, 10);
                    }
                    req.edits = json2;

                    return next();
                });
            });
        } catch (error) {
            console.log(error);
            return next();
        }
        console.log(req.user.email + " has just loaded up the approvals page");
    }
    else {
        return next();
    }
}

//approve all suggested listings
exports.approveAll = (req, res) => {
    try {
        pool.query('INSERT INTO ' + process.env.DB_CURRENT_SEASON + ' (company_name, internship_title, link, juniors_only, dsci_tag, swe_tag, devops_tag, consulting_tag, cyber_tag, pm_tag, international_allowed, is_ug, is_ep, is_ft, is_uc, ux_tag, swe_web_tag, swe_backend_tag, networks_tag, swe_mobile_tag, it_tag, ba_tag, is_ugrad, is_grad) (SELECT company_name, internship_title, link, juniors_only, dsci_tag, swe_tag, devops_tag, consulting_tag, cyber_tag, pm_tag, international_allowed, is_ug, is_ep, is_ft, is_uc, ux_tag, swe_web_tag, swe_backend_tag, networks_tag, swe_mobile_tag, it_tag, ba_tag, is_ugrad, is_grad FROM suggestions)', async (error, result) => {
            if (error) {
                console.log(error);
                return;
            }
            else {
                console.log('An admin has approved all internship listings in suggestion');
                try {
                    pool.query('SELECT suggested_by FROM suggestions', async (error, results) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            let arr = {}

                            for (i = 0; i < results.length; i++) {
                                //console.log(results[i].suggested_by);
                                let id = results[i].suggested_by;
                                if (arr[id] == null) {
                                    arr[id] = 5;
                                }
                                else {
                                    arr[id] = arr[id] + 5;
                                }
                            }

                            let keys = Object.keys(arr);

                            for (i = 0; i < keys.length; i++) {
                                let uid = keys[i];
                                let toAdd = arr[uid];

                                try {
                                    pool.query('UPDATE users SET karma = karma + ? WHERE id = ?', [toAdd, uid], (error, result) => {
                                        if (error) {
                                            console.log(error);
                                        }
                                        else {
                                            console.log("User: " + uid + " has gained " + toAdd + " karma from having their listing suggestion(s) approved");
                                            try {
                                                pool.query('DELETE FROM suggestions', async (error, results) => {
                                                    if (error) {
                                                        console.log(error);
                                                        return res.redirect('/approvals');

                                                    }
                                                    else {
                                                        console.log("Listings suggestions have been cleared");
                                                    }
                                                });
                                            }
                                            catch (error) {
                                                console.log(error);
                                                return res.redirect('/approvals');
                                            }
                                        }

                                    });
                                }
                                catch (error) {
                                    console.log(error);
                                    return res.redirect('/approvals');

                                }
                            }
                        }
                    });
                }
                catch (error) {
                    console.log(error);
                    return res.redirect('/approvals');
                }
            }
        });
    }
    catch (error) {
        console.log(error);
        return;
    }
    return res.redirect('/approvals');
}

//adds a suggestion to internships table once privileged user has approved it
exports.approve = (req, res) => {
    //console.log(req.body);

    let { role_type, class_type, suggestion_id, suggested_by, company_name, internship_title, link, international_allowed, swe_backend_tag, swe_web_tag, swe_mobile_tag,
        dsci_tag, devops_tag, consulting_tag, cyber_tag, networks_tag, pm_tag, ux_tag, it_tag, ba_tag, juniors_only, is_ug, eligibility, dates, is_uc } = req.body;

    let is_ep = 0;
    let is_ft = 0;

    let is_grad = 0;
    let is_ugrad = 1;

    if (role_type == 2) {
        is_ft = 1;
    }
    else if (role_type == 3) {
        is_ep = 1;
    }

    if (class_type == 3) {
        is_grad = 1;
        is_ugrad = 1;
    }
    else if (class_type == 1) {
        is_ugrad = 1;
    }
    else {
        is_grad = 1;
    }

    if (swe_backend_tag.length > 1) {
        swe_backend_tag = '1';
    }
    if (swe_web_tag.length > 1) {
        swe_web_tag = '1';
    }
    if (swe_mobile_tag.length > 1) {
        swe_mobile_tag = '1';
    }
    if (dsci_tag.length > 1) {
        dsci_tag = '1';
    }

    if (devops_tag.length > 1) {
        devops_tag = '1';
    }
    if (consulting_tag.length > 1) {
        consulting_tag = '1';
    }
    if (cyber_tag.length > 1) {
        cyber_tag = '1';
    }
    if (networks_tag.length > 1) {
        networks_tag = '1';
    }
    if (pm_tag.length > 1) {
        pm_tag = '1';
    }
    if (ux_tag.length > 1) {
        ux_tag = '1';
    }
    if (it_tag.length > 1) {
        it_tag = '1';
    }
    if (ba_tag.length > 1) {
        ba_tag = '1';
    }
    if (juniors_only.length > 1) {
        juniors_only = '1';
    }
    if (is_ug.length > 1) {
        is_ug = 1;
    }
    if (eligibility == '') {
        eligibility = null;
    }
    if (dates == '') {
        dates = null;
    }
    if (is_uc.length > 1) {
        is_uc = 1;
    }


    pool.query('INSERT INTO ' + process.env.DB_CURRENT_SEASON + ' SET ?', {
        company_name: company_name, internship_title: internship_title, link: link, juniors_only: juniors_only,
        dsci_tag: dsci_tag, swe_backend_tag: swe_backend_tag, swe_web_tag: swe_web_tag, swe_mobile_tag: swe_mobile_tag, devops_tag: devops_tag, consulting_tag: consulting_tag, cyber_tag: cyber_tag, networks_tag: networks_tag, pm_tag: pm_tag,
        ux_tag: ux_tag, it_tag: it_tag, ba_tag: ba_tag, international_allowed: international_allowed, is_ug: is_ug, eligibility: eligibility, is_ep: is_ep, is_ft: is_ft, event_dates: dates, is_uc: is_uc, is_grad: is_grad, is_ugrad: is_ugrad
    }, (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            //create the user their own instance of an internship apps table
            pool.query('SELECT karma FROM users WHERE id = ?', [suggested_by], async (error, result) => {
                if (error) {
                    console.log(error);
                }
                else if (result.length < 1) {
                    console.log('User does not exist, no Karma awarded');

                    pool.query('DELETE FROM suggestions WHERE suggestion_id = ?', [suggestion_id], (error, result) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            console.log('An internship suggestion at ' + company_name + ' has been approved by a privileged user');
                            return res.redirect('/approvals');
                        }
                    });
                }
                else {
                    var newKarma = result[0].karma + 5;

                    pool.query('UPDATE users SET karma = ? WHERE id = ?', [newKarma, suggested_by], (error, results) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            //console.log(suggestion_id);
                            pool.query('DELETE FROM suggestions WHERE suggestion_id = ?', [suggestion_id], (error, result) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    console.log('An internship suggestion at ' + company_name + ' has been approved by a privileged user');
                                    return res.redirect('/approvals');
                                }
                            });


                        }
                    });
                }
            });
        }
    });


}

//a rejection of a suggestion ordered by the admin
exports.reject = (req, res) => {
    //console.log(req.body.suggestion_id);

    pool.query('DELETE FROM suggestions WHERE suggestion_id = ?', [req.body.suggestion_id], (error, result) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log("A Privileged User has rejected an internship addition request ")
            return res.redirect('/approvals');
        }
    });
}

//allows privileged users to directly edit internship listings w/o direct DB access
exports.edit = (req, res) => {
    //console.log(req.body);

    let { role_type, class_type, job_id, origin, company_name, internship_title, link, international_allowed, swe_tag, swe_backend_tag, swe_web_tag, swe_mobile_tag, dsci_tag,
        devops_tag, consulting_tag, cyber_tag, networks_tag, pm_tag, ux_tag, it_tag, ba_tag, juniors_only, is_ug, eligibility, event_dates, is_uc } = req.body;

    let is_ep = 0;
    let is_ft = 0;

    let is_ugrad = 0;
    let is_grad = 0;

    if (role_type == 2) {
        is_ft = 1;
    }
    else if (role_type == 3) {
        is_ep = 1;
    }

    if (class_type == 3) {
        is_grad = 1;
        is_ugrad = 1;
    }
    else if (class_type == 1) {
        is_ugrad = 1;
    }
    else {
        is_grad = 1;
    }

    if (swe_tag.length > 1) {
        swe_tag = '1';
    }
    if (swe_backend_tag.length > 1) {
        swe_backend_tag = '1';
    }
    if (swe_web_tag.length > 1) {
        swe_web_tag = '1';
    }
    if (swe_mobile_tag.length > 1) {
        swe_mobile_tag = '1';
    }
    if (dsci_tag.length > 1) {
        dsci_tag = '1';
    }

    if (devops_tag.length > 1) {
        devops_tag = '1';
    }
    if (consulting_tag.length > 1) {
        consulting_tag = '1';
    }
    if (cyber_tag.length > 1) {
        cyber_tag = '1';
    }
    if (networks_tag.length > 1) {
        networks_tag = '1';
    }
    if (pm_tag.length > 1) {
        pm_tag = '1';
    }
    if (ux_tag.length > 1) {
        ux_tag = '1';
    }
    if (it_tag.length > 1) {
        it_tag = '1';
    }
    if (ba_tag.length > 1) {
        ba_tag = '1';
    }
    if (juniors_only.length > 1) {
        juniors_only = '1';
    }
    if (is_ug.length > 1) {
        is_ug = 1;
    }
    if (eligibility == '') {
        eligibility = null;
    }
    if (event_dates == '') {
        event_dates = null;
    }
    if (is_uc.length > 1) {
        is_uc = 1;
    }


    pool.query('UPDATE ' + process.env.DB_CURRENT_SEASON + ' SET ? WHERE job_id = ' + job_id, {
        company_name: company_name, internship_title: internship_title, link: link,
        juniors_only: juniors_only, dsci_tag: dsci_tag, swe_tag: swe_tag, swe_backend_tag: swe_backend_tag, swe_web_tag: swe_web_tag, swe_mobile_tag: swe_mobile_tag,
        devops_tag: devops_tag, consulting_tag: consulting_tag, cyber_tag: cyber_tag, networks_tag: networks_tag, pm_tag: pm_tag, ux_tag: ux_tag, it_tag: it_tag,
        ba_tag: ba_tag, international_allowed: international_allowed, is_ug: is_ug, eligibility: eligibility, is_ep: is_ep, is_ft: is_ft, event_dates: event_dates,
        is_uc: is_uc, is_grad: is_grad, is_ugrad: is_ugrad
    }, (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log("A priviledged user has updated info for listing #" + job_id);
            if (origin == 1) {
                return res.redirect('/iedits');
            }
            else if (origin == 2) {
                return res.redirect('/ugedits');
            }
            else if (origin == 3) {
                return res.redirect('/epedits')
            }
            else if (origin == 4) {
                return res.redirect('/fedits')
            }
            else if (origin == 5) {
                return res.redirect('/ucedits')
            }
            else if (origin == 6) {
                return res.redirect('/gfedits')
            }
            else if (origin == 7) {
                return res.redirect('/giedits')
            }
        }
    });
}

//a priviliged user may remove a listing from the internship table, client-side
exports.deleteListing = (req, res) => {
    pool.query('DELETE FROM ' + process.env.DB_CURRENT_SEASON + ' WHERE job_id = ?', [req.body.job_id], (error, result) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log("A Privileged User has deleted a listing at: " + req.body.company_name + " titled: " + req.body.internship_title);
            if (req.body.origin == 1) {
                return res.redirect('/iedits');
            }
            else if (req.body.origin == 2) {
                return res.redirect('/ugedits');
            }
            else if (req.body.origin == 3) {
                return res.redirect('/epedits')
            }
            else if (req.body.origin == 4) {
                return res.redirect('/fedits')
            }
            else if (req.body.origin == 5) {
                return res.redirect('/ucedits')
            }
            else if (req.body.origin == 6) {
                return res.redirect('/gfedits')
            }
            else if (req.body.origin == 7) {
                return res.redirect('/giedits')
            }
        }
    });
}

//a dismissal of an edit suggestion ordered by the admin, don't award Karma
exports.dismissEdit = (req, res) => {
    //console.log(req.body.suggestion_id);

    pool.query('DELETE FROM edit_suggestions WHERE identifier = ?', [req.body.identifier], (error, result) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log("A Privileged User has dismissed an edit suggestion")
            return res.redirect('/approvals');
        }
    });
}

//delete the listing, award karma, remove from edit_suggestions
exports.approveDeleteEdit = (req, res) => {
    //console.log(req.body.suggestion_id);

    pool.query('DELETE FROM ' + process.env.DB_CURRENT_SEASON + ' WHERE job_id = ?', [req.body.job_id], (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            pool.query('SELECT karma FROM users WHERE id = ?', [req.body.suggested_by], async (error, result) => {
                if (error) {
                    console.log(error);
                }
                else if (result.length < 1) {
                    console.log('User does not exist, no Karma awarded');

                    pool.query('DELETE FROM edit_suggestions WHERE identifier = ?', [req.body.identifier], (error, result) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            console.log('A closed edit suggestion for job# ' + req.body.job_id + ' has been approved by a privileged user');
                            return res.redirect('/approvals');
                        }
                    });
                }
                else {
                    var newKarma = result[0].karma + 1;

                    pool.query('UPDATE users SET karma = ? WHERE id = ?', [newKarma, req.body.suggested_by], (error, results) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            //console.log(suggestion_id);
                            pool.query('DELETE FROM edit_suggestions WHERE identifier = ?', [req.body.identifier], (error, result) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    console.log('A closed edit suggestion for job# ' + req.body.job_id + ' has been approved by a privileged user');
                                    return res.redirect('/approvals');
                                }
                            });


                        }
                    });
                }
            });
        }
    });
}

//award karma, remove from edit_suggestions
exports.markEditResolved = (req, res) => {
    //console.log(req.body.suggestion_id);

    pool.query('SELECT karma FROM users WHERE id = ?', [req.body.suggested_by], async (error, result) => {
        if (error) {
            console.log(error);
        }
        else if (result.length < 1) {
            console.log('User does not exist, no Karma awarded');

            pool.query('DELETE FROM edit_suggestions WHERE identifier = ?', [req.body.identifier], (error, result) => {
                if (error) {
                    console.log(error);
                }
                else {
                    console.log('An edit suggestion has been marked resolved by a privileged user');
                    return res.redirect('/approvals');
                }
            });
        }
        else {
            var newKarma = result[0].karma + 1;

            pool.query('UPDATE users SET karma = ? WHERE id = ?', [newKarma, req.body.suggested_by], (error, results) => {
                if (error) {
                    console.log(error);
                }
                else {
                    //console.log(suggestion_id);
                    pool.query('DELETE FROM edit_suggestions WHERE identifier = ?', [req.body.identifier], (error, result) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            console.log('An edit suggestion has been marked resolved by a privileged user, Karma awarded');
                            return res.redirect('/approvals');
                        }
                    });


                }
            });
        }
    });
}

/************************************************************************************************************************************* */