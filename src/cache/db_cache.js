import _ from 'lodash';
import localforage from 'localforage';

import { Config } from 'common/constants';
import Utils from 'common/utils';

if(Config.CACHE_NAME) {
    localforage.config({ name: Config.CACHE_NAME });
}

export default class DbCache {

    constructor(name, options) {
        if(! Config.CACHE_NAME) {
            return;
        }
        this._store = localforage.createInstance({
            name: Config.CACHE_NAME + '_' + g_userId
        });
        this._name = name;
        this._cache = {};
        this._removedKeys = [];
        this._options = options;
        this._objType = options.objType;
        this._syncing = false;
        this._hasSync = false;
        this._persist = _.throttle(this._persist, 5000);
    };

    async sync(readyFn) {
        if(this._syncing) {
            return;
        }
        if(this._hasSync) {
            readyFn && readyFn(this);
            return;
        }
        const start = _.now();
        await this._persist();
        console.log('sync end', this._name, _.now() - start);
        readyFn && readyFn(this);
    };

    get(key) {
        return this._cache[key];
    };

    async getAsync(key) {
        await this._persist();
        return this.get(key);
    };
    
	all() {
        return Utils.asList(this._cache);
    };

    async allAsync() {
        await this._persist();
        return this.all();
    };
    
	cache(key, value) {
        this._cache[key] = value;
        this._unsetRemoved(key);
        return this._persist();
    };
    
	remove(key) {
        delete this._cache[key];
        this._markRemoved(key);
        return this._persist();
    };

	clear() {
        return this._store.removeItem(this._name);
    };

    _markRemoved(key) {
        if(this._removedKeys.indexOf(key) != -1) {
            return;
        }
        this._removedKeys.push(key);
    };

    _unsetRemoved(key) {
        const index = this._removedKeys.indexOf(key);
        if(index == -1) {
            return;
        }
        this._removedKeys.splice(index, 1);
    };

    async _persist() {
        this._syncing = true;
        const oldCache = await this._store.getItem(this._name);
        if(oldCache) {
            for(let key of this._removedKeys) {
                delete oldCache[key];
            }
            this._cache = _.merge(oldCache, this._cache);
            this._hasSync = true;
        }
        this._store.setItem(this._name, this._cache);
        this._syncing = false;
    };
};