
//Source: used to customize post login route to profile
//url: https://github.com/auth0/express-openid-connect/blob/master/examples/custom-routes.js

const express = require('express')
const router = express.Router()
const { requiresAuth } = require('express-openid-connect');

const login_ctrl = require('../controllers/login.controllers')

router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'To-Do list Application Login Page',
    isAuthenticated: req.oidc.isAuthenticated()
  });
});

router.get('/login', function (req, res, next) {
  res.oidc.login({ returnTo: '/profile' })
});


router.get('/profile', requiresAuth(), function (req, res, next) {
  //add user to user entity in cloud datastore
  login_ctrl.create_user(req.oidc.user.email, req.oidc.user.sub)

  res.render('profile', {
    title: 'Profile page',
    email: req.oidc.user.email,
    jwt: req.oidc.idToken
  });
});

module.exports = router;