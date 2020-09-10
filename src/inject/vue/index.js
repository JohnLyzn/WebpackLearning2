import { Injectable, injectionOf } from '../index';

import QueueTaskManager from 'task';
import DbCacheManager from 'cache';

import MsgUtils from './msg_utils';
import Utils from '../../common/utils';

export default class VueInjectable extends Injectable {

    name() {
        return 'common';
    };
    
    proxy() {
        const Vue = this.context().target();
        // 添加Service注入对象
        this.context().add(injectionOf('Service'));
        // 添加Component注入对象
        this.context().add(injectionOf('Component'));
        // 初始化引用对象
        Vue.prototype.$inject = {
            initWith: this._initWith.bind(this),
            to: this._injectTo.bind(this),
        };
        return Vue;
    };

    init() {
        this._containers = {};
        // 初始化数据库管理器
        this._$cache = new DbCacheManager();
        // 初始化任务管理器
        this._$task = new QueueTaskManager();
        // 初始化工具类
        this._$utils = MsgUtils;
        // 启动任务调度
        this._$task.active();
        // 完成环境初始化
        console.log('已初始化Vue的注入环境');
    };

    to(injecting) {
        injecting.task = this._$task.get.bind(this._$task);
    };

    lookup(injecting, name) {
        const pieces = name.split('.');
        const objName = '_$' + pieces[0];
        const fnName = pieces[1];
        if(! fnName) {
            return this[objName];
        }
        if(! this[objName]) {
            return;
        }
        if(! Utils.isFunc(this[objName][fnName])) {
            return;
        }
        return this[objName][fnName].bind(this[objName]);
    };

    _initWith(app) {
        if(! app || ! app._isVue) {
            throw new Error('只能使用Vue组件初始化');
        }
        this._app = app;
        this.context().init();
    };

    _injectTo(component, name) {
        if(! component || ! component._isVue) {
            throw new Error('只能注入到Vue组件');
        }
        // 同样名称的不同组件实例使用同一个注入上下文
        if(this._containers[name]) {
            return this._containers[name];
        }
        // 生成注入上下文
        const injecting = this.context().to(component, name);
        // 还原对应上下文的任务到任务队列中
        this._restoreHistoryTask(component, name);
        // 记录名称
        this._containers[name] = injecting;
        // 返回注入上下文
        return injecting;
    };

    async _restoreHistoryTask(component, componentName) {
        const tasks = await this._$task.history(this._$cache);
        for(let task of tasks) {
            // 分割path得到任务所属的上下文和任务恢复调用的函数
            const pieces = _.split(task.path, '/');
            // 不对应当前上下文的跳过
            if(componentName != pieces[0]) {
                continue;
            }
            // 得到任务恢复调用的函数
            const targetFn = component[pieces[1]];
            if(! _.isFunction(targetFn)) {
                continue;
            }
            // 以任务内指定的参数重新调用该函数
            targetFn.apply(component, task.args);
        }
    };
};