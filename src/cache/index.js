import _ from 'lodash';

import DbCache from './db_cache';

const CACHE_SUFFIX = '_CACHE';

export default class DbCacheManager {

    constructor() {
        this._caches = {};
    };

    cacheOf(objType, options) {
        const start = _.now();
        const cacheKey = this._getCacheKey(objType);
        if(this._caches[cacheKey]) {
            this._caches[cacheKey].sync(options && options.onReady);
            console.log('cacheOf end', _.now() - start);
            return this._caches[cacheKey];
        }
        this._caches[cacheKey] = new DbCache(cacheKey, _.merge({
            objType: objType,
        }, options));
        this._caches[cacheKey].sync(options && options.onReady);
        return this._caches[cacheKey];
    };

    _getCacheKey(objType) {
        if(_.isString(objType)) {
            return objType + CACHE_SUFFIX;
        }
        if(! _.isString(objType.typeName)) {
            throw new Error('缓存的对象类型必须包含typeName属性');
        }
        return _.toUpper(objType.typeName) + CACHE_SUFFIX;
    };
};
