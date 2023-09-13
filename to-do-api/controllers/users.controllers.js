const ds = require('../models/datastore')
const datastore = ds.datastore

const USER = 'user'

async function get_users(req, next){

    const query = datastore.createQuery(USER)
    const entities = await datastore.runQuery(query)

    const results = getResponse(entities[0])
    
    next(null, results)
    return
}

function getResponse(user_array){
    results = []
    user_array.forEach(user => {
        results.push({
            email: user.email,
            user_id: user.user_id
        })
    });

    return results
}
module.exports = {
    get_users
}