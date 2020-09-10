
import _ from 'lodash';

import Utils from '../common/utils';

import BaseService from 'service/base_service';

export default class Injection {

    constructor(type, target) {
        const injectableType = require('./' + _.toLower(type) + '/index').default;
        if(! injectableType || ! Utils.isInherit(injectableType, Injectable)) {
            throw new Error(`注入类型${type}不存在`);
        }
        this._injectable = new injectableType(this);
        this._target = target;
        this._children = [];
        this._parent = null;
        this._hasInit = false;
    };

    target() {
        return this._target;
    };

    // 代理上下文
    proxy() {
        if(! this._target) {
            return;
        }
        return this._injectable.proxy();
    };

    // 初始化注入环境
    init() {
        if(this._hasInit) {
            return false;
        }
        this._hasInit = true;
        return this._injectable.init();
    };

    add(injection) {
        if(this._children.indexOf(injection) != -1) {
            return;
        }
        injection._parent = this;
        if(this._hasInit) {
            injection.init();
        }
        this._children.push(injection);
    };

    remove(injection) {
        const index = this._children.indexOf(injection);
        if(index == -1) {
            return;
        }
        injection._parent = null;
        this._children.splice(index, 1);
    };

    children() {
        return this._children;
    };

    root() {
        let current = this;
        while(current._parent) {
            current = current._parent;
        }
        return current;
    };

    // 在当前注入上下文规则中注入对象到目标中
    to(container, name) {
        if(! this._hasInit) {
            throw new Error('请先进行初始化', name);
        }
        if(! container) {
            throw new Error('未指定注入目标', name);
        }
        if(! name) {
            throw new Error('未指定注入目标名称', name);
        }
        const existed = this._existedInjecting(container, name);
        if(existed) {
            return existed;
        }
        const injecting = new Injecting(this, container, name)
        this._injectable.to(injecting);
        return injecting;
    };

    lookup(injecting, name) {
        if(! this._hasInit) {
            throw new Error('请先进行初始化', name);
        }
        const pieces = name.split(':');
        return this._lookup(injecting, pieces[0], pieces[1]);
    };

    destroy() {
        if(! this._hasInit) {
            throw new Error('请先进行初始化', name);
        }
        this._injectable.destroy();
        for(let childInjection of this.children()) {
            childInjection.destroy();
        }
    };

    _lookup(injecting, name, content) {
        if(! name) {
            return this.root()._injectable.lookup(injecting, content);
        }
        if(this._injectable.name().indexOf(name) != -1) {
            return content.indexOf(':') == -1
                ? this._injectable.lookup(injecting, content)
                : this.lookup(injecting, content);
        }
        for(let childInjection of this.children()) {
            const result = childInjection._lookup(injecting, name, content);
            if(result) {
                return result;
            }
        }
    };

    _existedInjecting(container, name) {
        const root = this.root();
        root._injectings = root._injectings || {};
        const injecting = root._injectings[name];
        if(injecting && injecting.container() === container) {
            return injecting;
        }
    };
};

export class Injectable {
    
    /* 子类不用重写构造器 */
    constructor(context) {
        if(! context) {
            throw new Error('未指定注入上下文');
        }
        this._context = context;
    };

    context() {
        return this._context;
    };

    proxy() {
        return this.context().target();
    };

    name() {
        throw new Error('未指定name');
    };

    init() {
        // 需子类根据需要实现
    };

    to(injecting) {
        // 需子类根据需要实现
    };

    lookup(injecting, name) {
        // 需子类根据需要实现
    };
};

export class Injecting {

    constructor(injection, container, name) {
        this._name = name;
        this._container = container;
        this._injection = injection;
    };

    name() {
        return this._name;
    };

    container() {
        return this._container;
    };

    get(name) {
        return this._injection.root()
            .lookup(this, name);
    };

    call(name, ...args) {
        const fn = this.get(name);
        if(! Utils.isFunc(fn)) {
            return;
        }
        return fn(...args);
    };

    watch() {

    };
};

export function injectionOf(type, target) {
    return new Injection(type, target);
};

export function wrapVue(vue) {
    if(! vue || ! vue.use) {
        throw new Error('wrapVue只能接收Vue作为参数');
    }
    return injectionOf('Vue', vue).proxy();
};

export function wrapComponent(componentDef) {
    if(! componentDef || ! Utils.isObject(componentDef)) {
        throw new Error('wrapComponent只能接收Vue组件对象作为参数');
    }
    return injectionOf('Component', componentDef).proxy();
};

export function wrapService(serviceType) {
    if(! serviceType || Utils.isInherit(serviceType, BaseService)) {
        throw new Error('wrapService只能接收Service作为参数');
    }
    return injectionOf('Service', serviceType).proxy();
};