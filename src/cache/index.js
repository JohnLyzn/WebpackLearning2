import _ from 'lodash';

import DbCache from './db_cache';

const CACHE_SUFFIX = '_CACHE';

export default class DbCacheManager {

    constructor() {
        this._caches = {};
    };

    cacheOf(objType, options) {
        const cacheKey = this._getCacheKey(objType);
        if(this._caches[cacheKey]) {
            this._queueSyncReadyFn(this._caches[cacheKey], options && options.onReady);
            this._caches[cacheKey].sync(this._notifySyncReadyAll);
            return this._caches[cacheKey];
        }
        this._caches[cacheKey] = new DbCache(cacheKey, _.merge({
            objType: objType,
        }, options));
        this._queueSyncReadyFn(this._caches[cacheKey], options && options.onReady);
        this._caches[cacheKey].sync(this._notifySyncReadyAll);
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

    _queueSyncReadyFn(cache, readyFn) {
        if(! readyFn) {
            return;
        }
        cache.readyFnQueue = cache.readyFnQueue || [];
        cache.readyFnQueue.push(readyFn);
    };

    _notifySyncReadyAll(cache) {
        cache.readyFnQueue = cache.readyFnQueue || [];
        _.forEach(cache.readyFnQueue, (readyFn) => {readyFn(cache);});
        cache.readyFnQueue = '';
    };
};
