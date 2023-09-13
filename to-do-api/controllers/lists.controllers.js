// source #1: used to as model to configure task
// https://github.com/googleapis/nodejs-datastore/blob/main/samples/quickstart.js

// source #2: used for utility function for array equality
// url: https://flexiple.com/javascript/javascript-array-equality/

// source #3: model for removing object from array of objects using splice/find index
//url : https://bobbyhadz.com/blog/javascript-remove-object-from-array-by-value

const ds = require('../models/datastore')
const datastore = ds.datastore

const date = require('date-fns')

const [LIST, ITEM] = ['list', 'item']


const LIST_PROPERTIES = ['name', 'label']
const LIST_UPDATE_ALL = ['name', 'label'] //can't change date created

const items_ctrl = require('./items.controllers')

async function post_list(req, owner, next){

    //check body has required attributes
    if(!isValidList(req.body, LIST_PROPERTIES)){
        err = {code: 400, message: "attribute-error", status: "Bad Request"};
        next(err);
        return
    }
    //set items to empty array
    req.body.items = []
    
    const key = datastore.key(LIST)
	const task = createTask(key, req.body, owner, generateTimestamp())
    const results = await datastore.save(task)

    next(null, postResponse(results, req))
    return 

}

//get all to-do lists for a particular owner
async function get_lists(req, owner, next){

    //get total number of lists for a particular owner
    const total_items = await getNumLists(owner)
    
    //generate query that filters by owner with limit of 5 results per page
    var query = datastore.createQuery(LIST)
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
    results.lists = entities[0].map(ds.fromDatastore)

    if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS){
        const cursor = encodeURIComponent(entities[1].endCursor)
        results.next = req.protocol + '://' + req.get('host') + req.baseUrl + '?cursor=' + cursor
    }

    next(null, results)
    return
}


//get list by id
async function get_list(req, id, owner, next){

    const key = datastore.key([LIST, parseInt(id, 10)]);
    const entity = await datastore.get(key)

    //check entity given id exists
    if(!isEntityValid(entity[0])){
        err = {code: 404, message: "invalid-id", status: "Not Found"};
        next(err);
        return
    }

    //check that user is owner of this list
    const entity_owner = entity[0].owner
    if(entity_owner != owner){
        err = {code: 403, message: "invalid-owner", status: "Forbidden"};
        next(err);
        return
    }

    next(null, getResponse(entity[0], req, id))
    return
}

//update list at id (all non-list params)
async function update_all(req, owner, next){
    // create variables to catch returns from get
    let [orig_list, error] = [{}, {}] 

    //check item with id exists
    await get_list(req,req.params.id, owner,(err, response) => {
        if(err){
            error = err
            return
        } 
        orig_list = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error)){
        next(error)
        return
    }

    //check body has required attributes
    if(!isValidList(req.body, LIST_UPDATE_ALL)){
        err = {code: 400, message: "attribute-error", status: "Bad Request"};
        next(err);
        return
    }

    const updated_list = updateProperties(req.body, orig_list)

    const key = datastore.key([LIST, parseInt(req.params.id, 10)]);
    const task = createTask(key, updated_list, updated_list.owner, updated_list.date_created)

    const results = await datastore.save(task)
    
    next(null, results)
    return

}

//update list at id (some non-item params)
async function update_prtl(req, owner, next){
    // create variables to catch returns from get
    let [orig_list, error] = [{}, {}] 

    //check list with id exists
    await get_list(req,req.params.id, owner, (err, response) => {
        if(err){
            error = err
            return
        } 
        orig_list = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error)){
        next(error)
        return
    }

    //check body has required attributes
    if(!isValidPrtl(req.body, LIST_UPDATE_ALL)){
        err = {code: 400, message: "attribute-error", status: "Bad Request"};
        next(err);
        return
    }

    const updated_list = updateProperties(req.body, orig_list)

    const key = datastore.key([LIST, parseInt(req.params.id, 10)]);
    const task = createTask(key, updated_list, updated_list.owner, updated_list.date_created)

    const results = await datastore.save(task)
    
    next(null, results)
    return

}

async function add_list_item(req, owner, next){
    // that load and item with ids exist
    let [orig_list, error_list] = [{}, {}] 

    // check list with id exists
    await get_list(req, req.params.list_id, owner, (err, response) => {
        if(err){
            error_list = err
            return
        } 
        orig_list = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error_list)){
        next(error_list)
        return
    }

    let [orig_item, error_item] = [{}, {}] 

    //check item with id exists
    await items_ctrl.get_item(req, req.params.item_id, owner, (err, response) => {
        if(err){
            error_item = err
            return
        } 
        orig_item = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error_item)){
        next(error_item)
        return
    }

    //check if item is unassigned
    if(orig_item.list != null){
        err = {code: 403, message: 'item-assigned', status: "Forbidden"}
        next(err)
        return
    }

    //add item to list
    const updated_list = addListItem(orig_list, orig_item, req)

    const list_key = datastore.key([LIST, parseInt(req.params.list_id, 10)]);
    const list_task = createTask(list_key, updated_list, updated_list.owner, updated_list.date_created)

    await datastore.save(list_task)
    
    //make item's list value list_id
    const updated_item = orig_item
    updated_item.list = req.params.list_id

    const item_key = datastore.key([ITEM, parseInt(req.params.item_id, 10)]);
    const item_task = items_ctrl.createTask(item_key, updated_item, updated_item.owner)

    await datastore.save(item_task)

    next(null)
    return
    
}

async function remove_list_item(req, owner, next){
    // that load and item with ids exist
    let [orig_list, error_list] = [{}, {}] 

    // check list with id exists
    await get_list(req, req.params.list_id, owner, (err, response) => {
        if(err){
            error_list = err
            return
        } 
        orig_list = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error_list)){
        next(error_list)
        return
    }

    let [orig_item, error_item] = [{}, {}] 

    //check item with id exists
    await items_ctrl.get_item(req,req.params.item_id, owner, (err, response) => {
        if(err){
            error_item = err
            return
        } 
        orig_item = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error_item)){
        next(error_item)
        return
    }

    
    //check that item is assigned to specified list
    if(orig_item.list != req.params.list_id){
        err = {code: 404, message: 'invalid-list_item', status: "Bad Request"}
        next(err)
        return
    }

    //remove item from list
    const updated_list = removeListFromItem(orig_list, req.params.item_id)

    const list_key = datastore.key([LIST, parseInt(req.params.list_id, 10)]);
    const list_task = createTask(list_key, updated_list, updated_list.owner, updated_list.date_created)

    await datastore.save(list_task)
    
    //set item's list value to null
    const updated_item = orig_item
    updated_item.list = null

    const item_key = datastore.key([ITEM, parseInt(req.params.item_id, 10)]);
    const item_task = items_ctrl.createTask(item_key, updated_item, updated_item.owner)

    await datastore.save(item_task)

    next(null)
    return
}


async function delete_list(req, owner, next){
    //check id/owner of item using get_item function
    let [orig_list, error] = [{}, {}] 

    //check item with id exists
    await get_list(req, req.params.id, owner,(err, response) => {
        if(err){
            error = err
            return
        } 
        orig_list = response //save what's there in an object
    })

    // if there is an error with the id/owner return error to middleware
    if(isEntityValid(error)){
        next(error)
        return
    }

    //if list has items remove items from list
    if(orig_list.items.length != 0){
        removeItemsFromList(orig_list)
    }

    // delete list from datastore
    const key = datastore.key([LIST, parseInt(req.params.id, 10)]);
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

function isValidList(data, properties){
    var data_properties = Object.keys(data)
    return isArrayEqual(data_properties, properties)

}

function isValidPrtl(data, properties){
    var data_properties = Object.keys(data)
    return arrayContains(properties, data_properties)

}

function generateTimestamp(){
    //to add timezone getTimezoneOffset()???
    return new Date().toISOString()
}

//generates datastore key & organizes data to send to datastore
function createTask(key, data, owner, created){
    const task = {
        key: key,
        data: {
          name: data.name,
          label: data.label,
          date_created: created, 
          items: data.items,
          owner: owner
        },
    };

    return task
}

function addListItem(list, item, req){
    list.items.push({
        id: item.id,
        self: req.protocol + "://" + req.get("host") + "/items/" + item.id
    })

    return list
}

function removeListFromItem(list, item_id){

    const index = list.items.findIndex(item =>{
        return item.id === item_id
    })
    
    if(index != -1){
        list.items.splice(index, 1)
    }

    return list
}

function removeItemsFromList(list){
    list.items.forEach(item => {
        freeItem(item.id)
    })

    return
}

async function freeItem(item_id){
    const key = datastore.key([ITEM, parseInt(item_id, 10)]);
    const entity = await datastore.get(key)
    
    //set list property to null
    entity[0].list = null
    const updated_item = entity[0]
    
    const item_key = datastore.key([ITEM, parseInt(item_id, 10)]);
    await datastore.save({key: item_key, data: updated_item})

    return
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

//get the total number of items owned by specified owner
async function getNumLists(owner){
    const query =  datastore.createQuery(LIST)
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
    post_list,
    get_lists,
    get_list,
    update_all,
    update_prtl,
    add_list_item,
    remove_list_item,
    delete_list
}