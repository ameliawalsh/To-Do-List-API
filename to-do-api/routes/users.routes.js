const express = require('express')
const router = express.Router()
const users_ctrl = require('../controllers/users.controllers')

router.get('/', function(req, res, next){

    users_ctrl.get_users(req, (err, results) => {
        if (err) {
            next(err);
            return;
        }

        res.render('users', {
            title: 'Users',
            users: results
        });
    });

});

module.exports = router;