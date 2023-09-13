
const { Datastore } = require('@google-cloud/datastore');
const projectId = 'cs493-final-walshame'

const datastore = new Datastore({projectId: projectId});

//from datastore
function fromDatastore(item) {
    item.id = item[Datastore.KEY].id;
    return item;
}

//to datastore
function toDatastore (object) {
    const results = [];
    Object.keys(object).forEach((key) => {
      if (object[key] === undefined) {
        return;
      }
      results.push({
        name: key,
        value: object[key],
      });
    });
    return results;
}

module.exports = {
    Datastore,
    datastore,
    fromDatastore,
    toDatastore
}