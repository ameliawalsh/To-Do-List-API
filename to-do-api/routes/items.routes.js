const express = require('express')
const router = express.Router()

const items_ctrl = require('../controllers/items.controllers')

const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const DOMAIN = 'walshame-cs493.us.auth0.com'

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  issuer: `https://${DOMAIN}/`,
  algorithms: ['RS256']
});

//CREATE
router.post('/', checkJwt, function(req, res, next){
    const accepts = req.accepts(['application/json'])
    if(!accepts){
        err = { code: 406, message: "invalid-content-return-type", status: 'Not Acceptable' }
        next(err)
        return
    }

    items_ctrl.post_item(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }

        // res.location()
        res.status(201).send(results)
    });
});

//READ (list owner's items)
router.get('/', checkJwt, function(req, res, next){

    const accepts = req.accepts(['application/json'])
    if(!accepts){
        err = { code: 406, message: "invalid-content-return-type", status: 'Not Acceptable' }
        next(err)
        return
    }

    items_ctrl.get_items(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }
        // res.location()
        res.status(200).send(results)
    });

});

//READ item associated with id param
router.get('/:id', checkJwt, function(req, res, next){
    const accepts = req.accepts(['application/json'])
    if(!accepts){
        err = { code: 406, message: "invalid-content-return-type", status: 'Not Acceptable' }
        next(err)
        return
    }
    items_ctrl.get_item(req, req.params.id, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }
        // res.location()
        res.status(200).send(results)
    });

});

//UPDATE item associated with id param (all non-list items)
router.put('/:id', checkJwt, function(req, res, next){
    const accepts = req.accepts(['application/json'])
    if(!accepts){
        err = { code: 406, message: "invalid-content-return-type", status: 'Not Acceptable' }
        next(err)
        return
    }

    items_ctrl.update_all(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }
        res.status(204).end()
    });

});

//UPDATE item associated with id param (some non-list items)
router.patch('/:id', checkJwt, function(req, res, next){
    const accepts = req.accepts(['application/json'])
    if(!accepts){
        err = { code: 406, message: "invalid-content-return-type", status: 'Not Acceptable' }
        next(err)
        return
    }

    items_ctrl.update_prtl(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }

        res.status(204).end()
    });

});

//UPDATE item associated with id param (some non-list items)
router.delete('/:id', checkJwt, function(req, res, next){
    items_ctrl.delete_item(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }

        res.status(204).end()
    });

});

//unsupported route
router.put('/', (req, res, next) => {
    res.set('Accept', 'GET, POST')
    err = { code: 405, message: 'invalid-route', status: 'Not Acceptable' }
    next(err)
    return

})


//error handling middleware
router.use((err, req, res, next)=>{
    if(err.message === 'attribute-error'){
        res.status(400).json({ 'Error': '400 Bad Request: Request body contains invalid attributes.' })
    } else if(err.message == 'invalid-due_date'){
        res.status(400).json({ 'Error': "400 Bad Request: Request body has invalid 'due_date' value." })
    } else if(err.message == 'invalid-priority'){
        res.status(400).json({ 'Error': "400 Bad Request: Request body has invalid 'priority' value." })
    }else if(err.name === "UnauthorizedError"){
        res.status(401).json({ 'Error': '401 Unauthorized : Invalid JSON web token.' })
    } else if(err.message == 'invalid-id'){
        res.status(404).json({ 'Error': '404 Not Found: Request id parameter invalid.' })
    }else if(err.message == 'invalid-owner'){
        res.status(403).json({ 'Error': '403 Forbidden: User is not authorized to access this item.' })
    }else if(err.message == 'invalid-route'){
        res.status(405).json({ 'Error': '405 Method Not Allowed' })
    }else if(err.message == 'invalid-content-return-type'){
        res.status(406).json({ 'Error': '406 Not Acceptable: Return type in Accept header unsupported.' })
    } else {
        res.status(err.status).json({'Error': err.message})
    }

})

module.exports = router;
