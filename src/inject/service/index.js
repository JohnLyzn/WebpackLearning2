import { Injectable } from '../index';
import _ from 'lodash';
import Utils from '../../common/utils';
import BaseService from 'service/base_service';

export default class ServiceInjectable extends Injectable {

    name() {
        return 'service';
    };

    proxy() {
        const target = this.context().target();
        return this._getProxyServiceInstance(target);
    };

    lookup(injecting, name) {
        const pieces = name.split('.');
        const serviceName = pieces[0];
        const proxyService = this._getProxyServiceInstance(injecting, serviceName);
        if(! proxyService) {
            return;
        }
        const fnName = pieces[1];
        if(! fnName) {
            return proxyService;
        }
        return proxyService[fnName];
    };

    _getServiceName(serviceTarget) {
        if(Utils.isString(serviceTarget)) {
            return serviceTarget;
        }
        return serviceTarget.toString();
    };

    _getServiceType(serviceTarget) {
        if(Utils.isString(serviceTarget)) {
            return require('service/' + _.snakeCase(serviceTarget)).default;
        }
        if(Utils.isInherit(serviceTarget, BaseService)) {
            return serviceTarget;
        }
    };

    _getProxyServiceInstance(injecting, serviceTarget) {
        // 获取代理的Service名称
        const serviceName = this._getServiceName(serviceTarget);
        // 如果已经代理过存在实例则直接返回
        injecting._serviceInstances = injecting._serviceInstances || {};
        if(injecting._serviceInstances[serviceName]) {
            return injecting._serviceInstances[serviceName];
        }
        const serviceType = this._getServiceType(serviceName);
        if(! serviceType) {
            throw new Error(`${serviceName}不存在`);
        }
        const service = new serviceType();
        for(let fnName of Object.getOwnPropertyNames(serviceType.prototype)) {
            if(fnName == 'constructor') {
                continue;
            }
            const fn = service[fnName].bind(service);
            if(Utils.isFunc(fn)) {
                service[fnName] = this._proxyServiceFn(injecting, fn);
            }
        }
        injecting._serviceInstances[serviceName] = service;
        return service;
    };

    _proxyServiceFn(injecting, serviceFn) {
        return _.throttle((params, callbacks) => {
            params = params || {};
            callbacks = callbacks || {};
            return new Promise(async (resolve, reject) => {
                params.cacheManager = injecting.get(':cache');
                if(! params.task) {
                    resolve(serviceFn(params, callbacks));
                    return;
                }
                params.task = this._createTask(injecting, params);
                params.taskManager = injecting.get(':task');
                params.taskManager.schedule(params.task, {
                    onTaskQueue: (task) => {
                        console.log('task queue', task.path(), task.id());
                        callbacks.onTaskQueue && callbacks.onTaskQueue(task);
                    },
                    onTaskStart: (task) => {
                        console.log('task start', task.path(), task.id());
                        resolve(serviceFn(params, {
                            onFail: (errorMsg, json) => {
                                task.fail();
                                callbacks.onFail && callbacks.onFail(errorMsg, json);
                            },
                            onError: (response) => {
                                callbacks.onError && callbacks.onError(response);
                            },
                            onSuccess: (obj, parent, json) => {
                                task.success();
                                callbacks.onSuccess && callbacks.onSuccess(obj, parent, json);
                            },
                            onLastPage: callbacks.onLastPage,
                        }).catch((err) => {
                            task.error();
                            if(! task.autoRetry()) {
                                task.abort();
                            }
                            reject(err);
                        }));
                        return true;
                    },
                    onTaskPost: (task) => {
                        console.log('task post', task.path(), task.id());
                        callbacks.onTaskPost && callbacks.onTaskPost(task);
                    },
                    onTaskComplete: (task) => {
                        console.log('task complete', task.path(), task.id(),
                            task.status(), task.result());
                        callbacks.onTaskComplete && callbacks.onTaskComplete(task);
                    },
                    onTaskError: (task) => {
                        console.log('task error', task.path(), task.id(), task.errorType());
                        callbacks.onTaskCancel && callbacks.onTaskCancel(task);
                    },
                    onTaskCancel: (task) => {
                        console.log('task cancel', task.path(), task.id());
                        callbacks.onTaskCancel && callbacks.onTaskCancel(task);
                    },
                    onTaskAbort: (task) => {
                        console.log('task abort', task.path(), task.id());
                        callbacks.onTaskAbort && callbacks.onTaskAbort(task);
                    },
                });
            });
        }, 200);
    };

    _createTask(injecting, params) {
        if(! params.task) {
            throw new Error('外部任务定义无效', params);
        }
        return {
            name: params.task.name,
            path: this._buildTaskPath(injecting, params.task.path),
            args: _.cloneDeepWith(params.task.args),
            cacheManager: injecting.get(':cache'),
        };
    };

    _buildTaskPath(injecting, subPath) {
        return injecting.name() + '/' + subPath;
    };
};