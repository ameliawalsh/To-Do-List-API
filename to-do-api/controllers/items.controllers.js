
// source #1: used to as model to configure task
// https://github.com/googleapis/nodejs-datastore/blob/main/samples/quickstart.js

// source #2: used for utility function for array equality
// url: https://flexiple.com/javascript/javascript-array-equality/

const ds = require('../models/datastore')
const datastore = ds.datastore

const date = require('date-fns')
// const lists_ctrl = require('./lists.controllers')

const [LIST, ITEM] = ['list', 'item']
const ITEM_PROPERTIES = ['name', 'done', 'due_date', 'priority']
const ITEM_UPDATE_ALL = ['name', 'done', 'due_date', 'priority']

const [PRIO_MIN, PRIO_MAX] = [0, 5]

async function post_item(req, owner, next){
    
    //check body has required attributes
    if(!isValidItem(req.body, ITEM_PROPERTIES)){
        err = {code: 400, message: "attribute-error", status: "Bad Request"};
        next(err);
        return
    }

    //check date is valid format (ISO 8601 w/o Z)
    if(!date.isMatch(req.body.due_date, "yyyy-MM-dd'T'HH:mm:ssxx")){
        err = {code: 400, message: "invalid-due_date", status: "Bad Request"};
        next(err);
        return
    }

    //check that priority value is within range
    if(!isValidPriority(req.body.priority, PRIO_MIN, PRIO_MAX)){
        err = {code: 400, message: "invalid-priority", status: "Bad Request"};
        next(err);
        return 
    }
    //add list property set to null
    req.body.list = null

    const key = datastore.key(ITEM)
	const task = createTask(key, req.body, owner)
    const results = await datastore.save(task)

    next(null, postResponse(results,req))
    return 


}

//get all to-do list items for a particular owner
async function get_items(req, owner, next){

    //get total number of items for a particular owner
    const total_items = await getNumItems(owner)
    
    //generate query that filters by owner with limit of 5 results per page
    var query = datastore.createQuery(ITEM)
    .filter('owner', '=', owner)
    .limit(5)

    //if the query has a cursor, start at the query @ the location of the cursor
    if(Object.keys(req.query).includes("cursor")){
        query = query.start(req.query.cursor)
    }

    const entities = await datastore.runQuery(query)

    //generate return object to send to client
    const results = {}
    results.total_items = total_items
    results.items = entities[0].map(ds.fromDatastore)

    if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS){
        const cursor = encodeURIComponent(entities[1].endCursor)
        results.next = req.protocol + '://' + req.get('host') + req.baseUrl + '?cursor=' + cursor
    }

    next(null, results)
    return
}

//get item by item id
async function get_item(req, id, owner, next){

    const key = datastore.key([ITEM, parseInt(id, 10)]);
    const entity = await datastore.get(key)

    //check entity given id exists
    if(!isEntityValid(entity[0])){
        err = {code: 404, message: "invalid-id", status: "Not Found"};
        next(err);
        return
    }

    //check that user is owner of this item
    const entity_owner = entity[0].owner
    if(entity_owner != owner){
        err = {code: 403, message: "invalid-owner", status: "Forbidden"};
        next(err);
        return
    }

    next(null, getResponse(entity[0], req, id))
    return

}

//update item at id (all non-list params)
async function update_all(req, owner, next){
    // create variables to catch returns from get
    let [orig_item, error] = [{}, {}] 

    //check item with id exists
    await get_item(req,req.params.id, owner,(err, response) => {
        if(err){
            error = err
            return
        } 
        orig_item = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error)){
        next(error)
        return
    }

    //check body has required attributes
    if(!isValidItem(req.body, ITEM_UPDATE_ALL)){
        err = {code: 400, message: "attribute-error", status: "Bad Request"};
        next(err);
        return
    }

    //check date is valid format (ISO 8601 w/o Z)
    if(!date.isMatch(req.body.due_date, "yyyy-MM-dd'T'HH:mm:ssxx")){
        err = {code: 400, message: "invalid-due_date", status: "Bad Request"};
        next(err);
        return
    }

    //check that priority value is within range
    if(!isValidPriority(req.body.priority, PRIO_MIN, PRIO_MAX)){
        err = {code: 400, message: "invalid-priority", status: "Bad Request"};
        next(err);
        return 
    }

    const updated_item = updateProperties(req.body, orig_item)

    const key = datastore.key([ITEM, parseInt(req.params.id, 10)]);
    const task = createTask(key, updated_item, updated_item.owner)

    const results = await datastore.save(task)
    
    next(null, results)
    return

}


//update item at id (all non-list params)
async function update_prtl(req, owner, next){
    // create variables to catch returns from get
    let [orig_item, error] = [{}, {}] 

    //check item with id exists
    await get_item(req,req.params.id, owner,(err, response) => {
        if(err){
            error = err
            return
        } 
        orig_item = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error)){
        next(error)
        return
    }

    //check body has required attributes
    if(!isValidPrtl(req.body, ITEM_UPDATE_ALL)){
        err = {code: 400, message: "attribute-error", status: "Bad Request"};
        next(err);
        return
    }

    const update_properties = Object.keys(req.body)

    if(update_properties.includes('due_date')){
        //check date is valid format (ISO 8601 w/o Z)
        if(!date.isMatch(req.body.due_date, "yyyy-MM-dd'T'HH:mm:ssxx")){
            err = {code: 400, message: "invalid-due_date", status: "Bad Request"};
            next(err);
            return
        }
    }

    if(update_properties.includes('priority')){
        //check that priority value is within acceptable range
        if(!isValidPriority(req.body.priority, PRIO_MIN, PRIO_MAX)){
            err = {code: 400, message: "invalid-priority", status: "Bad Request"};
            next(err);
            return 
        }
    }

    const updated_item = updateProperties(req.body, orig_item)

    const key = datastore.key([ITEM, parseInt(req.params.id, 10)]);
    const task = createTask(key, updated_item, updated_item.owner)

    const results = await datastore.save(task)
    
    next(null, results)
    return

}

async function delete_item(req, owner, next){
    //check id/owner of item using get_item function
    let [orig_item, error] = [{}, {}] 

    //check item with id exists
    await get_item(req,req.params.id, owner,(err, response) => {
        if(err){
            error = err
            return
        } 
        orig_item = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error)){
        next(error)
        return
    }

    //if item assigned to list, remove from list
    if(orig_item.list != null){
        removeItemFromList(orig_item.list, req.params.id)
    }

    //delete item from datastore
    const key = datastore.key([ITEM, parseInt(req.params.id, 10)]);
    await datastore.delete(key)

    next(null)
    return
}


//-------HELPERS----//

function isEntityValid(entity){
    if (entity === undefined || entity === null || Object.keys(entity).length === 0) {
        // No entity found. Don't try to add the id attribute
        return false
    }

    return true
} 

function isValidItem(data, properties){
    var data_properties = Object.keys(data)
    return isArrayEqual(data_properties, properties)

}

function isValidPrtl(data, properties){
    var data_properties = Object.keys(data)
    return arrayContains(properties, data_properties)

}

function isValidPriority(value, min, max){
    return value >= min && value <= max
}

//generates datastore key & organizes data to send to datastore
function createTask(key, data, owner){
    const task = {
        key: key,
        data: {
          name: data.name,
          done: data.done,
          due_date: data.due_date, 
          priority: data.priority,
          list: data.list,
          owner: owner
        },
    };

    return task
}

//generates response object with id and path to entity added to datastore
function postResponse(results, req){
    const id = results[0].mutationResults[0].key.path[0].id
    const response = {
        id: id,
        self: req.protocol + "://" + req.get("host") + req.baseUrl + "/" + id
    }

    return response
}

//generates response object with id and path to entity added to datastore
function getResponse(results, req, id){
    results.id = id
    results.self = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + req.params.id

    return results
}

function updateProperties(new_object, object){
    var update_list = Object.keys(new_object)
    update_list.forEach(property => {
        object[property] = new_object[property]
    })

    return object
}

async function removeItemFromList(list_id, item_id){

    const key = datastore.key([LIST, parseInt(list_id, 10)]);
    const entity = await datastore.get(key)
    const orig_list = entity[0]

    const updated_list = removeItem(orig_list, item_id)
    
    const list_key = datastore.key([LIST, parseInt(list_id, 10)]);
    await datastore.save({key: list_key, data: updated_list})

    return
}

function removeItem(list, item_id){

    const index = list.items.findIndex(item =>{
        return item.id === item_id
    })
    
    if(index != -1){
        list.items.splice(index, 1)
    }

    return list
}

//get the total number of items owned by specified owner
async function getNumItems(owner){
    const query =  datastore.createQuery(ITEM)
    .filter('owner', '=', owner)

    const entities = await datastore.runQuery(query)
    const results = entities[0].map(ds.fromDatastore)

    return results.length
}

//used to compare item properties with incoming request body (source #2)
function isArrayEqual(a, b){
    return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

function arrayContains(array, target){
    return target.every(element => array.includes(element))
}

module.exports = {
    post_item,
    get_items,
    get_item, 
    update_all,
    update_prtl,
    createTask,
    delete_item
}