import TimerEventBus from './event';
import TaskQueue from './task_queue';
import { getTasksInCache } from 'task/task';

export default class QueueTaskManager {

    constructor() {
        // 初始化事件管理器
        this._eventBus = new TimerEventBus({

        }, {

        });
        // 初始化任务队列
        this._taskQueue = new TaskQueue({
            eventBus: this._eventBus,
        });
        // 监听循环事件
        this._events = this._eventBus.register(this);
        this._events.subscribe('ALWAYS', (e) => {
            switch(e.name) {
                case 'actTask':
                     // 任务管理器获取一个任务
                    const task = this._taskQueue.pop();
                    if(! task) {
                        return;
                    }
                    // 执行任务
                    if(! task.start()) {
                        if(! task.autoRetry()) {
                            task.abort();
                        }
                    }
                    break;
            };
        });
        // 是否已经开始接受任务
        this._hasActive = false;
    };

    history(cacheManager) {
        return getTasksInCache(cacheManager);
    };

    schedule(taskObj, callbacks) {
        return this._taskQueue.schedule(taskObj, callbacks);
    };

    get(name, container) {
        return this._taskQueue.getMatchTask(name, container);
    };

    active() {
        if(this._hasActive) {
            return;
        }
        this._events.publish('actTask');
        this._hasActive = true;
    };

    post(taskObj, callbacks, args) {
        const task = this._taskQueue.getTaskById(taskObj.id);
        if(! task) {
            return;
        }
        task.post(callbacks, args);
        return true;
    };

    complete(taskObj, status, result) {
        const task = this._taskQueue.getTaskById(taskObj.id);
        if(! task) {
            return;
        }
        if(status === 'success') {
            task.success(result);
            return;
        }
        if(status === 'fail') {
            task.fail(this._copyFailResponseProps(result));
            return;
        }
    };

    _copyFailResponseProps(response) {
        if(! (response.request instanceof XMLHttpRequest)) {
            return response;
        }
        return {
            data: response.data,
            requestHeaders: response.config.headers,
            responseHeaders: response.headers,
            status: response.status,
            statusText: response.statusText,
        };
    };
};
