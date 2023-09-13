const express = require('express')
const router = express.Router()

const lists_ctrl = require('../controllers/lists.controllers')

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

    lists_ctrl.post_list(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }

        // res.location()
        res.status(201).send(results)
    });
});

//READ (list owner's lists)
router.get('/', checkJwt, function(req, res, next){
    const accepts = req.accepts(['application/json'])
    if(!accepts){
        err = { code: 406, message: "invalid-content-return-type", status: 'Not Acceptable' }
        next(err)
        return
    }

    lists_ctrl.get_lists(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }
        // res.location()
        res.status(200).send(results)
    });

});

//READ list associated with id param
router.get('/:id', checkJwt, function(req, res, next){
    const accepts = req.accepts(['application/json'])
    if(!accepts){
        err = { code: 406, message: "invalid-content-return-type", status: 'Not Acceptable' }
        next(err)
        return
    }
    
    lists_ctrl.get_list(req, req.params.id, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }
        // res.location()
        res.status(200).send(results)
    });

});

//UPDATE item associated with id param (all non-list attributes)
router.put('/:id', checkJwt, function(req, res, next){
    const accepts = req.accepts(['application/json'])
    if(!accepts){
        err = { code: 406, message: "invalid-content-return-type", status: 'Not Acceptable' }
        next(err)
        return
    }

    lists_ctrl.update_all(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }
        res.status(204).end()
    });

});

//UPDATE item associated with id param (some non-list attributes)
router.patch('/:id', checkJwt, function(req, res, next){
    const accepts = req.accepts(['application/json'])
    if(!accepts){
        err = { code: 406, message: "invalid-content-return-type", status: 'Not Acceptable' }
        next(err)
        return
    }

    lists_ctrl.update_prtl(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }
        res.status(204).end()
    });

});


//UPDATE add item to list
router.put('/:list_id/items/:item_id', checkJwt, function(req, res, next){
    lists_ctrl.add_list_item(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }

        res.status(204).end()
    });

});

//UPDATE add item to list
router.delete('/:list_id/items/:item_id', checkJwt, function(req, res, next){
    lists_ctrl.remove_list_item(req, req.auth.sub, (err, results) => {
        if (err) {
            next(err);
            return;
        }

        res.status(204).end()
    });

});

//DELETE list
router.delete('/:id', checkJwt, function(req, res, next){
    lists_ctrl.delete_list(req, req.auth.sub, (err, results) => {
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
    }  else if(err.name === "UnauthorizedError"){
        res.status(401).json({ 'Error': '401 Unauthorized : Invalid JSON web token.' })
    } else if(err.message == 'invalid-owner'){
        res.status(403).json({ 'Error': '403 Forbidden: User is not authorized to access this item.' })
    } else if(err.message == 'item-assigned'){
        res.status(403).json({ 'Error': '403 Forbidden: Item is already assigned to list' })
    } else if(err.message == 'invalid-id'){
        res.status(404).json({ 'Error': '404 Not Found: Request id parameter invalid.' })
    } else if(err.message == 'invalid-list_item'){
        res.status(404).json({ 'Error': '404 Not Found: Item not assigned to specified list.' })
    } else if(err.message == 'invalid-route'){
        res.status(405).json({ 'Error': '405 Method Not Allowed' })
    } else if(err.message == 'invalid-content-return-type'){
        res.status(406).json({ 'Error': '406 Not Acceptable: Return type in Accept header unsupported.' })
    } else {
        res.status(err.status).json({'Error': err.message})
    }

})

module.exports = router;