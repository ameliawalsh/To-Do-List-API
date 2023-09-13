
const ds = require('../models/datastore')
const datastore = ds.datastore

const USER = 'user'

async function create_user(email, user_id){

    if(await isUserNew(user_id)){
        //store username and auth0 user_id in datastore
        const key = datastore.key(USER)
	    const task = createTask(key, email, user_id)

        await datastore.save(task)
    }
    
    return
}

async function isUserNew(user_id){
    const query = datastore.createQuery(USER)
    .filter('user_id', '=', user_id)

    const entities = await datastore.runQuery(query)
    return !isEntityValid(entities[0])
}

function createTask(key, email, user_id){
    const task = {
        key: key,
        data: {
            user_id: user_id,
            email: email
        },
    };

    return task
}

function isEntityValid(entity){
    if (entity === undefined || entity === null || Object.keys(entity).length === 0) {
        // No entity found. Don't try to add the id attribute
        return false
    }

    return true
} 
module.exports = {
    create_user
}