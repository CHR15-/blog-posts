const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;
  this.hashkey = JSON.stringify(options.key || '');

  return this;
}

mongoose.Query.prototype.exec = async function() {
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }

  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );

  // see if we have value fir key in redis
  const cachedValue = await client.hget(this.hashkey, key);
  
  // if we do, return that
  if (cachedValue) {
    const doc = JSON.parse(cachedValue);

    return Array.isArray(doc) 
    ? doc.map(d => new this.model(d))
    : new this.model(doc)
  }

  // if not, do query and store it in redis.
  const result = await exec.apply(this, arguments);
  client.hset(this.hashkey, key, JSON.stringify(result), 'EX', 10);

  return result;
}

module.exports = {
  cleanCache(hashkey) {
    client.del(JSON.stringify(hashkey));
  }
}