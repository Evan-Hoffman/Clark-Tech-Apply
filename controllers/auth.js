const mysql = require("mysql");
const jtoken = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {promisify} = require('util');
var fs = require('fs');


var db_config = {
    //connectionLimit : 100,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DATABASE
};

//setup Database connection:
let pool = mysql.createPool(db_config);


//login a user
exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).render('login', {
                message: 'Please provide an email and a password'
            })
        }

        pool.query('SELECT * FROM users WHERE email = ?',[email], async (error, results) => {
            //console.log(results);
            if (error) {
                console.log(error);
            }
            if(results.length == 0 || !(await bcrypt.compare(password, results[0].password))) {
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
    //db.end;
    console.log("connection closed");
}

//register a new user
exports.register = (req, res) => {
    //console.log(req.body);

    const {name, email, password, passwordConfirm} = req.body;

    if (name == '' || email == '' || password == '' || passwordConfirm == ''){
        return res.render('register', {
            message: 'You are missing one or more fields'
        })
    }

    pool.query('SELECT email FROM users WHERE email = ?', [email], async (error, results)=>{
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
        pool.query('INSERT INTO users SET ?', {name: name, email: email, password: hashedPassword}, (error, results) => {
            if(error) {
                console.log(error);
            }
            else {
                //console.log(results);
                //create the user their own instance of an internship apps table
                var table_name = results.insertId + '_apps';
                pool.query('CREATE TABLE ' + table_name + ' (job_id INT PRIMARY KEY AUTO_INCREMENT, company_name VARCHAR (250), internship_title VARCHAR (250), date_applied DATE, app_status VARCHAR (50), has_status INT)', (error, results) => {
                    if(error){
                        console.log(error);
                    }
                    else {
                        console.log(results);
                    }
                })
                return res.render('register', {
                    message: 'User Registered'
                });
                
            }
        });
        });
        //db.end;
        //console.log("connection closed");

}

//allows a user to track an internship from the internships page (add it to myapps page)
exports.track =  (req, res) => {
    console.log(req.body);

    const jid = req.body.job_id;

    pool.query('SELECT * FROM internships WHERE job_id = ?', [jid], async (error, result) => {
        if (error) {
            console.log(error);
        }
            console.log(result);


            var string = JSON.stringify(result);
            //console.log('>> string: ', string );
            var data =  JSON.parse(string);
            //console.log('>> json: ', data); 
        const decoded = await promisify(jtoken.verify)(req.cookies.jtoken, process.env.JWT_SECRET);
        //console.log(decoded.id);
        //console.log(data[0].company_name);

        pool.query('INSERT INTO ' + decoded.id + '_apps SET ?', {job_id: jid, company_name: data[0].company_name, internship_title: data[0].internship_title}, (error, results) => {
            if(error){
                console.log(error);
                if (error.errno == 1062){
                    return res.status(200).redirect("/internships");
                }
            }

            else {
                console.log(results);
                res.status(200).redirect("/internships");
            }
            });
    });
    //db.end;
    //console.log("connection closed");
}

//allows a user to untrack an app from the myapps page
exports.untrack = async (req, res) => {
    //console.log(req.body);
    
        const jid = req.body.job_id;
        const decoded = await promisify(jtoken.verify)(req.cookies.jtoken, process.env.JWT_SECRET);


        pool.query('DELETE FROM ' + decoded.id + '_apps WHERE job_id = ?', [jid], async (error, result) => {
            if(error){
                console.log(error);
            }

            else {
                console.log(result);
                res.status(200).redirect("/myapps");
            }
        });   
        //db.end;
        //console.log("connection closed");
}

//method to update app status in MyApps
exports.update =  async (req, res) => {
    //console.log(req);

    const decoded = await promisify(jtoken.verify)(req.cookies.jtoken, process.env.JWT_SECRET);
    const jid = req.body.job_id;
    console.log(jid);

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
        11:"'Rejected'"
    };
    console.log(updateCodes[req.body.update_code]);

    if (req.body.update_code == 1){

        pool.query("UPDATE " + decoded.id + "_apps SET app_status = " + updateCodes[req.body.update_code] + ", has_status = 1, date_applied = current_date() WHERE job_id = ?", [jid], (error, result) => {
                if(error){
                    console.log(error);
                }
                console.log(result);
                res.status(200).redirect("/myapps");

        });
    }

    else {
        pool.query("UPDATE " + decoded.id + "_apps SET app_status = " + updateCodes[req.body.update_code] + ", has_status = 1 WHERE job_id = ?", [jid], (error, result) => {
            if(error){
                console.log(error);
            }
            console.log(result);
            res.status(200).redirect("/myapps");

    });
    }
    //db.end;
    //console.log("connection closed");
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
   // db.end;
    //console.log("connection closed");
}

//populate the internships page from the database
exports.populateInternships = async (req, res, next) => {
if (req.user){
    try {
        pool.query('SELECT * FROM internships ORDER BY date_added', (error, result, fields) => {
        //console.log(result);
        if (error) {
            console.log(error);
        }
        if(!result){
            return next();
        }
        var string = JSON.stringify(result);
        //console.log('>> string: ', string );
        var json =  JSON.parse(string);
        //console.log('>> json: ', json);
        pool.query('SELECT job_id FROM ' + req.user.id + '_apps ORDER BY job_id', (error, results, fields) => {
            //console.log("got here");
            if (error) {
                console.log(error);
            }
            if(!results){
                //console.log("this");
                return next();
            }
            //console.log(results);
            var string_tracked = JSON.stringify(results);
            var json_tracked =  JSON.parse(string_tracked);
            console.log(json_tracked);
            //console.log(json);
           // console.log("check1");
            var ct = 0;
            for(var i = 0; i < json.length; i++) {
                //console.log("check2");

                //Parse time of day:
                json[i]["date_added"] = json[i]["date_added"].substring(0, 10);
                if (ct < json_tracked.length && json[i]["job_id"] == json_tracked[ct]["job_id"]){
                    json[i]["is_tracked"] = 1;
                    ct++;
                    //console.log("edit a")
                }
                else {
                    json[i]["is_tracked"] = 0;
                    //console.log("edit b")
                }
                //console.log("check3");

            }
         });
        //console.log(json);
        //console.log(req.user.id);
        req.internships = json; 
        return next();
    });
    } catch (error) {
        console.log(error);
        return next();
    }

    //db.end;
    //console.log("connection closed");
}
else {
    return next();
}
}

//populates the table in the myapps page from the user's tracked apps table
exports.populateMyApps = async (req, res, next) => {
    try {
        pool.query('SELECT * FROM ' + req.user.id + '_apps ORDER BY job_id', (error, result, fields) => {
        //console.log(result);
        if (error) {
            console.log(error);
        }
        if(!result){
            return next();
        }
        
        var string = JSON.stringify(result);
        //console.log('>> string: ', string );
        var json =  JSON.parse(string);
        for(var i = 0; i < json.length; i++) {
            if (json[i]["date_applied"] != null){
                json[i]["date_applied"] = json[i]["date_applied"].substring(0, 10);
            }
        }
        //console.log('>> json: ', json);
        req.myapps = json; 
        return next();
    });
    } catch (error) {
        console.log(error);
        return next();
    }
   // db.end;
    //console.log("connection closed");
}

//allows the user to logout
exports.logout = async (req, res) => {
    res.cookie('jtoken', 'logout', {
        expires: new Date(Date.now() + 2*1000),
        httpOnly: true
    });
    res.status(200).redirect('/');
    //db.end;
    //console.log("connection closed");
}