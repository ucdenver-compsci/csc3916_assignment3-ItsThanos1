/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */
var Movie = require('./Movies'); //imported movies and users
var User = require('./Users'); 

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
db = require('./db')(); //hack
var jwt = require('jsonwebtoken');
var cors = require('cors');
var basicAuth = require('basic-auth');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();



function isAuthenticatedBasic(req, res, next) {
    var user = basicAuth(req);
    if (!user || !user.name || !user.pass) {
        return res.status(401).json({ success: false, message: 'Authentication failed. Missing credentials.' });
    } else {
        
        var storedUser = db.findOne(user.name); //added this line 

        
        if (storedUser && storedUser.password === user.pass) {
            next(); 
        } else {
            return res.status(401).json({ success: false, message: 'Authentication failed. Credentials incorrect.' });
        }
    }
}


function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', (req, res) => {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'});
    } else {
        var newUser = new User({
            username: req.body.username,
            password: req.body.password // Password hashing is handled in the User model
        });

        newUser.save().then(() => {
            res.json({success: true, msg: 'Successfully created new user.'});
        }).catch(err => {
            res.json({success: false, msg: 'Username already exists.', error: err.message});
        });
    }
});



router.post('/signin', (req, res) => {
    User.findOne({ username: req.body.username })
        .select('password')
        .then(user => {
            if (!user) {
                return res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
            }
            // Check if password matches
            user.comparePassword(req.body.password, (err, isMatch) => {
                if (err) {
                    return res.status(500).send({success: false, msg: 'Error comparing passwords.'});
                }
                if (isMatch) {
                    var userToken = { id: user._id, username: user.username };
                    var token = jwt.sign(userToken, process.env.SECRET_KEY);
                    res.json({ success: true, token: 'JWT ' + token });
                } else {
                    res.status(401).send({ success: false, msg: 'Authentication failed.' });
                }
            });
        })
        .catch(err => {
            res.status(500).send({success: false, msg: 'Authentication failed.', error: err.message});
        });
});



router.route('/testcollection')
    .delete(authController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        res.json(o);
    }
    )
    .put(authJwtController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        res.json(o);
    }
    );

    router.route('/movies')
    .get((req, res) => {
        Movie.find({})
            .then(movies => res.json({success: true, message: "GET movies", movies: movies}))
            .catch(err => res.status(500).json({success: false, message: "Error fetching movies.", error: err.message}));
    })
    .post((req, res) => {
        var newMovie = new Movie({
            title: req.body.title,
            releaseDate: req.body.releaseDate,
            genre: req.body.genre,
            actors: req.body.actors
        });
    
        newMovie.save()
            .then(movie => res.json({success: true, message: "Movie saved successfully.", movie: movie}))
            .catch(err => res.status(500).json({success: false, message: "Error saving movie.", error: err.message}));
    })
    .put(authJwtController.isAuthenticated, (req, res) => {
        Movie.findOneAndUpdate({ title: req.body.title }, req.body, { new: true })
            .then(movie => {
                if (!movie) {
                    res.status(404).json({success: false, message: "Movie not found."});
                } else {
                    res.json({success: true, message: "Movie updated", movie: movie});
                }
            })
            .catch(err => res.status(500).json({success: false, message: "Error updating movie.", error: err.message}));
    })
    .delete(isAuthenticatedBasic, (req, res) => {
        Movie.findOneAndDelete({ title: req.body.title })
            .then(movie => {
                if (!movie) {
                    res.status(404).json({success: false, message: "Movie not found."});
                } else {
                    res.json({success: true, message: "Movie deleted"});
                }
            })
            .catch(err => res.status(500).json({success: false, message: "Error deleting movie.", error: err.message}));
    });


    router.use('*', (req, res) => {
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

    
app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


