
import _ from 'lodash';
import Utils from 'common/utils';
import Task from './task';

export default class TaskQueue {

    constructor(settings, callbacks) {
        this._eventBus = settings.eventBus;
        this._callbacks = callbacks;
        this._queue = [];
        this._idMapping = {};
        this._nameMapping = {};

        this._events = this._eventBus.register(this);
        this._events.subscribe('ALWAYS', (e) => {
            switch(e.name) {
                case 'clean':
                    if(e.options.task) {
                        this._untrace(e.options.task);
                    }
                    this._cleanCache();
                    break;
            };
        });
    };

    schedule(taskObj, callbacks) {
        if(! _.isString(taskObj.name)) {
            throw new Error('请指定任务名称');
        }
        const task = this._buildTask(taskObj, callbacks);
        if(! this._putIdMapping(task)) {
            this._retryExistedTask(task);
            return false;
        }
        this._putNameMapping(task);
        this._queue.push(task);
        this._updateCache();
        return true;
    };

    pop() {
        const task = this._queue.pop();
        if(! task) {
            return;
        }
        return task;
    };

    push(task) {
        // 不是之前入过队列的任务不能使用此方法
        if(! this.getTaskById(this._getTaskId(task))) {
            return false;
        }
        this._queue.push(task);
        this._cleanCache();
        return true;
    };

    getTaskById(taskId) {
        return this._idMapping[taskId];
    };

    getTasksByName(taskName) {
        return this._nameMapping[taskName] || [];
    };

    getMatchTask(taskNameOrId, containerName) {
        if(_.startsWith(taskNameOrId, Task.idPrefix)) {
            return this.getTaskById(taskNameOrId);
        }
        const tasks = this.getTasksByName(taskNameOrId);
        if(containerName) {
            for(let task of tasks) {
                if(_.startsWith(task.path(), containerName)) {
                    return task;
                }
            }
        }
        return tasks[0];
    };

    cancel(task) {
        if(this._queue.indexOf(task) == -1) {
            return;
        }
        this._events.publish('clean', task);
    };

    notify(taskSource) {
        
    };

    _getTaskId(task) {
        return task.id();
    };

    _getTaskName(task) {
        return task.name();
    };

    _buildTaskId(taskObj) {
        const id = Utils.hashCode(taskObj.name 
            + taskObj.path 
            + JSON.stringify(taskObj.args));
        return Task.idPrefix + Math.abs(id);
    };

    _buildTaskName(taskObj) {
        if(taskObj.name) {
            return taskObj.name;
        }
        return '';
    };

    _buildTask(taskObj, callbacks) {
        taskObj.id = this._buildTaskId(taskObj);
        taskObj.name = this._buildTaskName(taskObj);
        return new Task({
            id: taskObj.id,
            name: taskObj.name,
            args: taskObj.args,
            path: taskObj.path,
            eventBus: this._eventBus,
            taskQueue: this,
            cacheManager: taskObj.cacheManager,
        }, callbacks);
    };

    _putIdMapping(task) {
        const taskId = this._getTaskId(task);
        if(this._idMapping[taskId]) {
            return false;
        }
        this._idMapping[taskId] = task;
        return true;
    };

    _putNameMapping(task) {
        const taskName = this._getTaskName(task);
        if(! this._nameMapping[taskName]) {
            this._nameMapping[taskName] = [];
        }
        this._nameMapping[taskName].push(task);
    };

    _retryExistedTask(task) {
        const taskId = this._getTaskId(task);
        const exisedTask = this._idMapping[taskId];
        if(! exisedTask) {
            return false;
        }
        if(! exisedTask.retry()) {
            exisedTask.persist();
            this._untrace(exisedTask);
            return false;
        }
        return true;
    };

    _untrace(task) {
        this._idMapping[this._getTaskId(task)] = undefined;
    };

    _updateCache() {
        for(let task of this._queue) {
            task.persist();
        }
    };

    _cleanCache() {
        for(let task of this._queue) {
            if(task.status() == 'abort'
                || task.status() == 'cancel') {
                this._untrace(task);
            }
        }
        _.remove(this._queue, (task) => {
            return this._idMapping[this._getTaskId(task)] ? false : true;
        });
    };
};