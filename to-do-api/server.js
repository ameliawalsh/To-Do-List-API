
//Source: Sample Web App using auth0, used as base for structure of application
//url: https://github.com/auth0-samples/auth0-express-webapp-sample/tree/master/01-Login

const express = require('express')
const app = express()

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const path = require('path')

const login = require('./routes/login.routes')
const users = require('./routes/users.routes')
const items = require('./routes/items.routes')
const lists = require('./routes/lists.routes')


const { auth } = require('express-openid-connect')

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

const baseURL = 'http://localhost:8080'
// const baseURL = 'https://cs493-hw7-walshame.wl.r.appspot.com'

const CLIENT_ID = '3K21icsiTS0DOBE73Z9YUSSDbpaKfKZC'
const CLIENT_SECRET = 'hw5sPnWFkKUTr9QsV4K5n04F4GC0CzeH3_3nd-iZKa8a1IfaScZ5dyhQ8oWtepez'
const DOMAIN = 'walshame-cs493.us.auth0.com'


const config = {
  authRequired: false,
  auth0Logout: true,
  secret: CLIENT_SECRET,
  baseURL: baseURL,
  clientID: CLIENT_ID,
  issuerBaseURL: `https://${DOMAIN}`,
  routes:{
    login: false
  }
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

//make user available to all views
app.use(function (req, res, next) {
    res.locals.user = req.oidc.user;
    next();
  });

app.use('/', login)
app.use('/users', users)
app.use('/items', items)
app.use('/lists', lists)



// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});