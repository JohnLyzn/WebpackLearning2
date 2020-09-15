
import _ from 'lodash';

const TASK_STATUS = {
    DEFAULT: 'default',
    STARTED: 'started',
    POSTING: 'posting',
    SUCCESS: 'success',
    FAIL: 'fail',
    ABORT: 'abort',
    CANCEL: 'cancel',
};

const TASK_MAX_RETRY_COUNT = 3;

export default class Task {

    constructor(setting, callbacks) {
        this._eventBus = setting.eventBus;
        this._taskQueue = setting.taskQueue;
        this._id = setting.id;
        this._name = setting.name;
        this._path = setting.path;
        this._args = setting.args;
        this._cacheManager = setting.cacheManager;
        this._callbacks = callbacks;
        this._retryTimes = 0;
        this._status = TASK_STATUS.DEFAULT;
        this._result = '';
        this._error = '';

        this._callback('onTaskQueue');
    };

    id() {
        return this._id;
    };

    name() {
        return this._name;
    };

    path() {
        return this._path;
    };

    args() {
        return this._args;
    };

    status() {
        return this._status;
    };

    result() {
        return this._result;
    };

    errorType() {
        return this._error;
    };

    persist() {
        const cache = this._cacheManager.cacheOf(Task);
        if(! cache) {
            return false;
        }
        if(this._status == TASK_STATUS.CANCEL
            || this._status == TASK_STATUS.SUCCESS) {
            this._taskQueue.cancel(this);
            cache.remove(this.id());
            return false;
        }
        cache.cache(this.id(), {
            id: this.id(),
            name: this.name(),
            path: this.path(),
            args: this.args(),
            status: this.status(),
            result: this.result(),
        });
        return true;
    };
    
    start() {
        if(! this._setStatus(TASK_STATUS.STARTED, TASK_STATUS.DEFAULT)) {
            return;
        }
        return this._callback('onTaskStart');
    };

    post() {
        if(! this._setStatus(TASK_STATUS.POSTING, TASK_STATUS.STARTED)) {
            return;
        }
        return this._callback('onTaskPost');
    };

    success(result) {
        if(! this._setStatus(TASK_STATUS.SUCCESS, TASK_STATUS.POSTING)) {
            return;
        }
        this._result = result;
        return this._callback('onTaskComplete');
    };

    fail(result) {
        if(! this._setStatus(TASK_STATUS.FAIL, TASK_STATUS.POSTING)) {
            return;
        }
        this._result = result;
        return this._callback('onTaskComplete');
    };

    error(error) {
        if(! this._setStatus(TASK_STATUS.FAIL, TASK_STATUS.POSTING)) {
            return;
        }
        this._error = error;
        return this._callback('onTaskError');
    };

    retry() {
        if(! this._setStatus(TASK_STATUS.DEFAULT, [TASK_STATUS.FAIL, TASK_STATUS.ABORT])) {
            return false;
        }
        if(this._status === TASK_STATUS.ABORT) {
            this._retryTimes = 0;
        }
        return this._retry();
    };

    autoRetry() {
        if(this._retryTimes >= TASK_MAX_RETRY_COUNT
            || ! this._setStatus(TASK_STATUS.DEFAULT, [TASK_STATUS.FAIL])) {
            return false;
        }
        this._retryTimes ++ ;
        return this._retry();
    };

    abort() {
        this._setStatus(TASK_STATUS.ABORT);
        this._callback('onTaskAbort');
    };

    cancel() {
        this._setStatus(TASK_STATUS.CANCEL);
        this._taskQueue.cancel(this);
        this._callback('onTaskCancel');
    };

    _setStatus(status, beforeStatus) {
        if(beforeStatus) {
            if(_.isString(beforeStatus) 
                && this._status !== beforeStatus) {
                return false;
            }
            if(_.isArray(beforeStatus) 
                && beforeStatus.indexOf(this._status) == -1) {
                return false;
            }
        }
        status = _.toUpper(status.toString());
        if(! TASK_STATUS[status]) {
            return false;
        }
        this._status = TASK_STATUS[status];
        this.persist();
        return true;
    };

    _callback(type) {
        if(! this._callbacks 
            || ! _.isFunction(this._callbacks[type])) {
            return;
        }
        return this._callbacks[type](this);
    };

    _retry() {
        if(! this._taskQueue.push(this)) {
            return false;
        }
        this._callback('onTaskQueue');
        return true;
    };
};

Task.idPrefix = '$task_';
Task.typeName = 'Task';
Task.displayName = '任务';

export const getTasksInCache = async (cacheManager) => {
    const cache = cacheManager.cacheOf(Task);
    if(! cache) {
        return;
    }
    const taskCaches = await cache.allAsync();
    const result = [];
    for(let taskCache of taskCaches) {
        if(taskCache.status == TASK_STATUS.CANCEL
            || taskCache.status == TASK_STATUS.SUCCESS) {
            continue;
        }
        result.push(taskCache);
    }
    return result;
};