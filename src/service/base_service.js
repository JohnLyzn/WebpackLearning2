import { getBaseUrl,getBaseContext,search,ajax,notify,toast,error } from 'common/env';
import { Config,ErrorLanguages } from 'common/constants';
import Utils from 'common/utils';
import { JSONPath } from 'jsonpath-plus';

const CACHE_SUFFIX = '_MAP';
const TASK_CACHE_NAME = 'BS_TASK';
const PAGINATION_CACHE_NAME = 'BS_PAGINATION';
const TASK_STATUS__DEFAULT = 'default';
const TASK_STATUS__SUCCESS = 'success';
const TASK_STATUS__FAIL = 'fail';
const HANDLING__CREATE = 'create';
const HANDLING__UPDATE = 'update';
const HANDLING__DELETE = 'delete';
const HANDLING__QUERY = 'query';

/**
 * 基础数据服务
 */
export default class BaseService {

	constructor() {
		// 定义缓存对象的组织关系
		this.CACHE_RULES = {
			SINGLE: {
				identifyKeys: ['objType|model','objId|removeObjId'],
				get: (params, placeholders, args) => {
					let obj = this._getObjInCache(placeholders['objId'], _getObjType(placeholders), params, placeholders);
					if(! obj) {
						return {
							objs: [],
							singleResult: true,
						};
					}
					return {
						objs: [obj],
						singleResult: true,
					};
				},
				set: (params, placeholders, args) => {
					let rawObj = args.objs[0];
					if(! rawObj) {
						return {
							objs: [],
							singleResult: true,
						};
					}
					if(! args.innerCall) {
						_updatingCache(params, placeholders, rawObj);
					}
					let obj = this._putObjInCache(rawObj, _getObjType(placeholders), params, placeholders);
					return {
						objs: [obj],
						singleResult: true,
					};
				},
				remove: (params, placeholders, args) => {
					const obj = this._getObjInCache(placeholders['removeObjId'], placeholders['objType'], params, placeholders);
					_updatingCache(params, placeholders, obj);
					this._removeObjInCache(placeholders['removeObjId'], placeholders['objType'], params, placeholders);
					return {
						objs: [obj],
						singleResult: true,
					};
				},
			},
			MULTI: {
				identifyKeys: ['objType|model', 'objIds|removeObjIds'],
				get: (params, placeholders, args) => {
					let objs = this._getObjsInCache(placeholders['objIds'], _getObjType(placeholders), params, placeholders);
					if(! objs || objs.length != placeholders['objIds'].length) { /* 数量不一致当做没缓存 */
						return {
							objs: [],
							singleResult: false,
						};
					}
					objs = _sortingCache(params, placeholders, objs);
					return {
						objs: objs,
						singleResult: false,
					};
				},
				set: (params, placeholders, args) => {
					if(! args.objs || ! args.objs.length) {
						return {
							objs: [],
							singleResult: false,
						};
					}
					let rawObjs = args.objs;
					if(! args.innerCall) {
						for(let rawObj of rawObjs) {
							_updatingCache(params, placeholders, rawObj);
						}
					}
					let objs = this._putObjsInCache(rawObjs, _getObjType(placeholders), params, placeholders);
					objs = _sortingCache(params, placeholders, objs);
					return {
						objs: objs,
						singleResult: false,
					};
				},
				remove: (params, placeholders, args) => {
					const objs = this._getObjsInCache(placeholders['removeObjIds'], placeholders['objType'], params, placeholders);
					if(! args.innerCall) {
						for(let obj of objs) {
							_updatingCache(params, placeholders, obj);
						}
					}
					this._removeObjsInCache(placeholders['removeObjIds'], placeholders['objType'], params, placeholders);
					return {
						objs: objs,
						singleResult: false,
					};
				},
			},
			PARENT_CHILD: {
				identifyKeys: ['parentObjType', 'subObjType', 'parentObjId','subObjIdCacheKey', '|removeSubObjId'],
				get: (params, placeholders, args) => {
					let parentObj = this._getObjInCache(placeholders['parentObjId'], placeholders['parentObjType'], params, placeholders);
					if(! parentObj) {
						parentObj = this._generateUnfetchObjAndCache(placeholders['parentObjId'], placeholders['parentObjType'], params, placeholders);
					}
					let subObjId = _getCacheSubObjIdProp(placeholders, parentObj);
					let obj = this._getObjInCache(subObjId, placeholders['subObjType'], params, placeholders);
					return {
						objs: obj ? [obj] : [],
						parentObj: parentObj,
						singleResult: true,
					};
				},
				set: (params, placeholders, args) => {
					let cacheable = this.CACHE_RULES.SINGLE.set(params, {
						objType: placeholders['subObjType'],
						innerCall: true
					}, args);
					const obj = cacheable.objs[0];
					if(! obj) {
						return cacheable;
					}
					const parentObjId = _getCacheParentObjId(placeholders, obj);
					if(! parentObjId) {
						return cacheable;
					}
					let parentObj = this._getObjInCache(parentObjId, placeholders['parentObjType'], params, placeholders);
					if(! parentObj) {
						parentObj = this._generateUnfetchObjAndCache(parentObjId, placeholders['parentObjType'], params, placeholders);
					}
					_setCacheSubObjIdProp(placeholders, parentObj, obj.id);
					_updatingCache(params, placeholders, obj, parentObj);
					this._putObjInCache(parentObj, placeholders['parentObjType'], params, placeholders);
					return {
						objs: cacheable.objs,
						parentObj: parentObj,
						singleResult: true,
					};
				},
				remove: (params, placeholders, args) => {
					const cacheable = this.CACHE_RULES.SINGLE.remove(params, {
						objId: placeholders['removeSubObjId'],
						objType: placeholders['subObjType'],
					}, args);
					const obj = cacheable.objs[0];
					if(! obj) {
						return cacheable;
					}
					const parentObjId = _getCacheParentObjId(placeholders, obj);
					if(! parentObjId) {
						return cacheable;
					}
					const parentObj = this._getObjInCache(parentObjId, placeholders['parentObjType'], params, placeholders);
					if(! parentObj) {
						return cacheable;
					}
					_setCacheSubObjIdProp(placeholders, parentObj, null);
					_updatingCache(params, placeholders, obj, parentObj);
					this._putObjInCache(parentObj, placeholders['parentObjType'], params, placeholders);
					return {
						objs: cacheable.objs,
						parentObj: parentObj,
						singleResult: true,
					};
				},
			},
			PARENT_CHILDREN: {
				identifyKeys: ['parentObjType', 'subObjType', 'parentObjId','subObjIdsCacheKey', '|removeObjIds'],
				get: (params, placeholders, args) => {
					let parentObj = this._getObjInCache(placeholders['parentObjId'], placeholders['parentObjType'], params, placeholders);
					if(! parentObj) {
						parentObj = this._generateUnfetchObjAndCache(placeholders['parentObjId'], placeholders['parentObjType'], params, placeholders);
					}
					let subObjIds = _getCacheSubObjIdsProp(placeholders, parentObj);
					let objs = this._getObjsInCache(subObjIds, placeholders['subObjType'], params, placeholders);
					objs = _sortingCache(params, placeholders, objs, parentObj);
					return {
						objs: objs && objs.length ? objs : [],
						parentObj: parentObj,
						singleResult: false,
					};
				},
				set: (params, placeholders, args) => {
					let cachable = this.CACHE_RULES.MULTI.set(params, {
						objType: placeholders['subObjType'],
						innerCall: true
					}, args);
					let parentObj, objs = cachable.objs;
					for(let obj of objs) {
						const parentObjId = _getCacheParentObjId(placeholders, obj);
						if(! parentObjId) {
							continue;
						}
						parentObj = this._getObjInCache(parentObjId, placeholders['parentObjType'], params, placeholders);
						if(! parentObj) {
							parentObj = this._generateUnfetchObjAndCache(parentObjId, placeholders['parentObjType'], params, placeholders);
						}
						let cachedSubObjIds = _getCacheSubObjIdsProp(placeholders, parentObj);
						// 已存在不处理
						if(cachedSubObjIds.indexOf(obj.id) != -1) {
							continue;
						}
						// 创建时插入到前面
						if(placeholders._handling == HANDLING__CREATE) {
							cachedSubObjIds = [obj.id].concat(cachedSubObjIds);
						} else { // 否则直接拼接到后面
							cachedSubObjIds.push(obj.id);
						}
						_setCacheSubObjIdsProp(placeholders, parentObj, cachedSubObjIds);
						_updatingCache(params, placeholders, obj, parentObj);
						this._putObjInCache(parentObj, placeholders['parentObjType'], params, placeholders);
					}
					objs = _sortingCache(params, placeholders, objs);
					return {
						objs: objs,
						parentObj: parentObj,
						singleResult: false,
					};
				},
				remove: (params, placeholders, args) => {
					const cacheable = this.CACHE_RULES.MULTI.remove(params, {
						removeObjIds: placeholders['removeObjIds'],
						objType: placeholders['subObjType'],
					}, args);
					for(let obj of cacheable.objs) {
						const parentObjId = _getCacheParentObjId(placeholders, obj);
						if(! parentObjId) {
							continue;
						}
						const parentObj = this._getObjInCache(parentObjId, placeholders['parentObjType'], params, placeholders);
						if(! parentObj) {
							continue;
						}
						let cachedSubObjIds = _getCacheSubObjIdsProp(placeholders, parentObj);
						if(! cachedSubObjIds || ! cachedSubObjIds.length) {
							continue;
						}
						let index = cachedSubObjIds.indexOf(obj.id);
						if(index != -1) {
							cachedSubObjIds.splice(index, 1);
						}
						_setCacheSubObjIdsProp(placeholders, parentObj, cachedSubObjIds);
						_updatingCache(params, placeholders, obj, parentObj);
						this._putObjInCache(parentObj, placeholders['parentObjType'], params, placeholders);
					}
					return {
						objs: cacheable.objs,
						parentObj: parentObj,
						singleResult: false,
					};
				},
			},
			NONE: {
				get: (params, placeholders, args) => {
					let objs = this._getAllObjsInCache(_getObjType(placeholders), params, placeholders);
					objs = _sortingCache(params, placeholders, objs);
					return {
						objs: objs && objs.length ? objs : [],
					};
				},
				set: (params, placeholders, args) => {
					return this.CACHE_RULES.MULTI.set(params, placeholders, args);
				},
				remove: (params, placeholders, args) => {
					return this.CACHE_RULES.MULTI.remove(params, placeholders, args);
				},
			},
		};
	}

	/**
	 * 模版方法: 创建对象, 并加入缓存
	 */
	async createTemplate(params, callbacks, placeholders, task) {
		params = params || {};
		callbacks = callbacks || {};
		task = params.task || task;
		placeholders._handling = HANDLING__CREATE;
		placeholders._ajaxMethod = placeholders['ajaxMethod'] || 'POST';
		placeholders._ajaxParamsHandleFn = null;
		placeholders._ajaxSuccessFn = async (json) => {
			if(_getResultFromJson(json, placeholders['resultPath']) === false) {
				return false;
			}
			placeholders._handlingCreate = true;
			const detailsHandleResult = await this._handleDetailsFetch(params, callbacks, placeholders, json);
			if(! detailsHandleResult) {
				if(Utils.isFunc(callbacks.onSuccess)) {
					callbacks.onSuccess(null, null, json);
				}
				return json;
			}
			return detailsHandleResult;
		};
		placeholders._ajaxErrorFn = null;
		return _ajaxTemplate(params, callbacks, placeholders, task);
	};
	
	/**
	 * 模版方法: 删除对象, 同时更新缓存
	 */
	async deleteTemplate(params, callbacks, placeholders, task) {
		params = params || {};
		callbacks = callbacks || {};
		task = params.task || task;
		const success4Inner = (json) => {
			if(params['notCacheRemove'] || placeholders['notCacheRemove']) {
				return json;
			}
			let cacheable = this._handleCacheByRule(params, placeholders, 'remove');
			if(Utils.isFunc(callbacks.onSuccess)) {
				callbacks.onSuccess(cacheable.objs, cacheable.parentObj, json);
			}
			return true;
		};
		if(params['onlyRemoveCache'] || placeholders['onlyRemoveCache']) {
			return success4Inner();
		}
		placeholders._handling = HANDLING__DELETE;
		placeholders._ajaxMethod = placeholders['ajaxMethod'] || 'POST';
		placeholders._ajaxParamsHandleFn = null;
		placeholders._ajaxSuccessFn = (json) => {
			if(_getResultFromJson(json, placeholders['resultPath']) === false) {
				return false;
			}
			return success4Inner(json);
		};
		placeholders._ajaxErrorFn = null;
		return _ajaxTemplate(params, callbacks, placeholders, task);
	};
	
	/**
	 * 模版方法: 更新对象信息, 同时更新缓存
	 */
	async updateTemplate(params, callbacks, placeholders, task) {
		params = params || {};
		callbacks = callbacks || {};
		task = params.task || task;
		placeholders._handling = HANDLING__UPDATE;
		placeholders._ajaxMethod = placeholders['ajaxMethod'] || 'POST';
		placeholders._ajaxParamsHandleFn = null;
		placeholders._ajaxSuccessFn = async (json) => {
			if(_getResultFromJson(json, placeholders['resultPath'])  === false) {
				return false;
			}
			const detailsHandleResult = await this._handleDetailsFetch(params, callbacks, placeholders, json);
			if(! detailsHandleResult) {
				if(Utils.isFunc(callbacks.onSuccess)) {
					callbacks.onSuccess(null, null, json);
				}
				return json;
			}
			return detailsHandleResult;
		};
		placeholders._ajaxErrorFn = null;
		return _ajaxTemplate(params, callbacks, placeholders, task);
	};
	
	/**
	 * 模版方法: 查询对象, 如果缓存中包含该信息则返回缓存
	 */
	async queryTemplate(params, callbacks, placeholders, task) {
		params = params || {};
		callbacks = callbacks || {};
		task = params.task || task;
		// 是否仅从缓存中查找
		let fromCache = params['fromCache'] || placeholders['fromCache'];
		// 是否阻止从缓存中查找
		let preventCache = params['preventCache'] || placeholders['preventCache'];
		// 是否阻止远程请求
		let preventAjax = params['preventAjax'] || placeholders['preventAjax'];
		// 如果外层定义没有确定返回结果数目, 则由参数决定
		let singleResult = params['singleResult'] || placeholders['singleResult'];
		// 允许查找不到结果进行sucess的回调, 非单个结果的情况下默认允许找不到
		let canNotFound = params['canNotFound'] || placeholders['canNotFound'] || ! singleResult;
		// 处理成功的内部函数
		const success4Inner = (cacheable, json) => {
			if(singleResult === undefined) {
				singleResult = cacheable.singleResult;
			}
			if(Utils.isFunc(callbacks.onSuccess)) {
				// 如果已经通过ajax获取成功了, 则不允许缓存触发
				if(callbacks.onSuccess.$fromAjax && json.$fromCache) {
					return;
				}
				callbacks.onSuccess.$fromAjax = ! json.$fromCache;
				// 调用成功回调
				let continueParams = callbacks.onSuccess(
					singleResult ? cacheable.objs[0] : cacheable.objs,
					cacheable.parentObj,
					json);
				if(continueParams) {
					let continueFn = placeholders['continueFn'];
					if(Utils.isFunc(continueFn)) {
						continueFn(continueParams, callbacks, placeholders);
					}
				}
			}
			if(singleResult) {
				if(! cacheable.objs[0] && canNotFound) {
					return undefined;
				}
				return cacheable.objs[0];
			}
			if(cacheable.objs) {
				return cacheable.objs;
			}
			return json;
		};
		// 读缓存的内部函数
		const _loadCache4Inner = (needReadyRetry) => {
			const promise = new Promise((resolve) => {
				// 不setTimeou会抢占, 就无法进行正确的resolve处理了
				setTimeout(() => {
					// 根据传参判断是否需要缓存初始化完成回调处理
					if(needReadyRetry) {
						// 设置缓存读取成功的回调
						placeholders._cacheReadyFn = () => {
							// 递归调用一下
							delete placeholders._cacheReadyFn;
							resolve(_loadCache4Inner(false));
						};
					}
					// 查询缓存
					let cacheable = this.queryFromCache(params, placeholders, callbacks);
					// 查不到结果, 可能是缓存未初始化完成, 也可能是没有缓存
					if(! cacheable.objs.length) {
						return;
					}
					resolve(success4Inner(cacheable, { $fromCache: true }));
				}, 0);
			});
			return promise;
		};
		/* 默认先从缓存查找 */ 
		// 若被阻止远程请求的情况下,直接返回
		if(preventAjax) {
			return _loadCache4Inner(true);
		}
		// 若指定只从缓存读取则读取缓存有效直接返回, 否则再进行请求
		if(! preventCache) {
			if(fromCache) {
				const start = Date.now();
				const result = await _loadCache4Inner(true);
				console.log('_loadCache4Inner fromCache end', placeholders['errorTag'], Date.now() - start, result);
				if(result) {
					return result;
				}
			} else {
				_loadCache4Inner(true);
			}
		}
		// 否则准备ajax请求
		placeholders._handling = HANDLING__QUERY;
		placeholders._ajaxMethod = placeholders['ajaxMethod'] || 'GET';
		placeholders._ajaxParamsHandleFn = (ajaxParams) => {
			let ajaxParamsIntercepter = placeholders['ajaxParamsIntercepter'];
			if(Utils.isFunc(ajaxParamsIntercepter)) {
				let cacheable = this.queryFromCache(params, placeholders, callbacks);
				return ajaxParamsIntercepter(params, ajaxParams, cacheable.parentObj);
			}
		};
		placeholders._ajaxSuccessFn = (json) => {
			// 获取判断是否成功请求的值
			if(_getResultFromJson(json, placeholders['resultPath']) === false) {
				return false;
			}
			// 获取请求到的数据集
			const rows = _getRowsFromJson(json, placeholders['rowsPath']);
			if(! rows || (singleResult && ! canNotFound && rows.length == 0)) {
				return false;
			}
			// 总是调用缓存模块存储
			let cacheable = this._handleCacheByRule(params, placeholders, 'set', {
				objs: rows
			});
			// 通知成功
			return success4Inner(cacheable, json);
		};
		placeholders._ajaxErrorFn = null;
		return _ajaxTemplate(params, callbacks, placeholders, task);
	};

	/**
	 * 查询缓存, 为了不复杂化定义为同步执行
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 * @param {Object} callbacks 回调
	 * @return {Object} 缓存的对象, 包含obj,parentObj,singleResult
	 */
	queryFromCache(params, placeholders, callbacks) {
		let pagination = params['pagination'] || placeholders['pagination'];
		let cacheSearches = placeholders['cacheSearches'] || params['cacheSearches'];
		let cacheable = this._handleCacheByRule(params, placeholders, 'get');
		if(cacheSearches) {
			cacheable.objs = _searchCache(cacheable.objs, cacheSearches, cacheSearches.strict);
		}
		if(params.pagination) {
			cacheable.objs = _pagingCache(cacheable.objs, pagination, callbacks);
		}
		return cacheable;
	};

	/**
	 * 根据ID集合获取缓存中的对象
	 * @param {String Array} objIds 对象ID集合
	 * @param {Model Function} objType 对象模型类型
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 * @return {Model Array} 缓存的对象模型集合
	 */
	_getObjsInCache(objIds, objType, params, placeholders) {
		if(! objIds) {
			return null;
		}
		const objs = [];
		for(let objId of objIds) {
			const obj = this._getObjInCache(objId, objType, params, placeholders);
			if(obj) {
				objs.push(obj);
			}
		}
		return objs;
	};
	
	/**
	 * 根据ID获取缓存中的对象
	 * @param {String} objId 对象ID
	 * @param {Model Function} objType 对象模型类型
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 * @return {Model} 缓存的对象模型
	 */
	_getObjInCache(objId, objType, params, placeholders) {
		if(! objId) {
			return null;
		}
		const cacheManager = _getCacheManager(params, placeholders, objType);
		const cacheOptions = _getCacheOptions(params, placeholders);
		const cache = cacheManager.cacheOf(objType, cacheOptions);
		const obj = _getCache(cache, objId, cacheOptions);
		if(obj) {
			return new objType(obj, true);
		}
		return null;
	};
	
	/**
	 * 添加批量对象到缓存池中
	 * @param {Model Array} objs 
	 * @param {Model Function} objType 对象模型类型
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 * @return {Model Array} 缓存的对象模型集合
	 */
	_putObjsInCache(objs, objType, params, placeholders) {
		const result = [];
		for(let obj of objs) {
			result.push(this._putObjInCache(obj, objType, params, placeholders));
		}
		return result;
	};
	
	/**
	 * 添加对象到缓存池中
	 * @param {Model} obj 
	 * @param {Model Function} objType 对象模型类型
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 * @return {Model Array} 缓存的对象模型集合
	 */
	_putObjInCache(obj, objType, params, placeholders) {
		const cacheObj = new (objType)(obj, Utils.isInstance(obj, objType), placeholders);
		if(! Utils.isString(cacheObj.id)) {
			throw new Error('请保证模型的id为字符串类型');
		}
		const cacheManager = _getCacheManager(params, placeholders, objType);
		const cache = cacheManager.cacheOf(objType);
		_putCache(cache, cacheObj);
		return this._getObjInCache(cacheObj.id, objType, params, placeholders);
	};
	
	/**
	 * 获取在缓存池中某种类型的所有对象
	 * @param {Model Function} objType 对象模型类型
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 * @return {Model Array} 缓存的对象模型集合
	 */
	_getAllObjsInCache(objType, params, placeholders) {
		const cacheManager = _getCacheManager(params, placeholders, objType);
		const cacheOptions = _getCacheOptions(params, placeholders);
		const cache = cacheManager.cacheOf(objType, cacheOptions);
		const objs = _getCache(cache, null, cacheOptions);
		if(! objs) {
			return [];
		}
		const result = [];
		for(let obj of objs) {
			result.push(new (objType)(obj, true));
		}
		return result;
	};

	/**
	 * 批量移除缓存池中的对象
	 * @param {String Array} objIds 
	 * @param {Model Function} objType
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 */
	_removeObjsInCache(objIds, objType, params, placeholders) {
		if(! objIds) {
			return;
		}
		for(let objId of objIds) {
			this._removeObjInCache(objId, objType, params, placeholders);
		}
	};
	
	/**
	 * 在缓存池中移除对象
	 * @param {String} objId 
	 * @param {Model Function} objType 
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 */
	_removeObjInCache(objId, objType, params, placeholders) {
		if(! objId) {
			return;
		}
		const cacheManager = _getCacheManager(params, placeholders, objType);
		const cache = cacheManager.cacheOf(objType);
		_removeCache(cache, objId);
	};

	/**
	 * 根据缓存规则处理缓存, 缓存规则见CACHE_RULES
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 * @param {Object} type 处理类型, 对应缓存规则中的回调方法
	 * @param {Object} args 表示额外的参数, 在一些缓存处理需要用到
	 * @return {Object} 包含处理到的模型对象信息的对象, 包括objs/parentObj/singleResult
	 */
	_handleCacheByRule(params, placeholders, type, args) {
		args = args || {};
		for(var key in this.CACHE_RULES) {
			if(! this.CACHE_RULES.hasOwnProperty(key)) {
				continue;
			}
			const rule = this.CACHE_RULES[key];
			if(! Utils.hasKeys(placeholders, rule.identifyKeys)) {
				continue;
			}
			return rule[type](params, placeholders, args);
		}
		return this.CACHE_RULES.NONE[type](params, placeholders, args);
	};

	/**
	 * 私有: 处理创建/更新后获取指定ID(单个或集合)的新对象缓存
	 * @param {Object} params 请求参数
	 * @param {Object} callbacks 请求回调
	 * @param {Object} placeholders 占位参数
	 * @param {Object} json 远程请求结果
	 */
	async _handleDetailsFetch(params, callbacks, placeholders, json) {
		let handleDetailsFetchPlaceholdersFn = placeholders['handleDetailsFetchPlaceholdersFn'];
		if(! Utils.isFunc(handleDetailsFetchPlaceholdersFn)) {
			return false;
		}
		const detailFetchPlaceholders = handleDetailsFetchPlaceholdersFn(json, params);
		if(! detailFetchPlaceholders) {
			return false;
		}
		/* 复制的属性不需要包括父子关系配置, 已由最外层决定了, 这里只看查询的对象本身 */
		const queryPlaceholders = {};
		for(let copyKey of ['objId', 'objIds', 'objType', 'model', 'url', 'ajaxParams']) {
			if(! detailFetchPlaceholders.hasOwnProperty(copyKey)
				|| ! detailFetchPlaceholders[copyKey]) {
				continue;
			}
			queryPlaceholders[copyKey] = detailFetchPlaceholders[copyKey];
		}
		return await this.queryTemplate({
			fromCache: detailFetchPlaceholders['fromCache'],
		}, {
			onSuccess: (objs) => {
				let singleResult = detailFetchPlaceholders['singleResult'];
				if(detailFetchPlaceholders.hasOwnProperty('objId')) {
					singleResult = true;
				}
				if(! Utils.isArray(objs)) {
					objs = [objs];
				}
				let cacheable = this._handleCacheByRule(params, placeholders, 'set', {
					objs: objs
				});
				if(singleResult === undefined) {
					singleResult = cacheable.singleResult;
				}
				if(Utils.isFunc(callbacks.onSuccess)) {
					callbacks.onSuccess(singleResult ? cacheable.objs[0] : cacheable.objs, cacheable.parentObj, json);
				}
			},
		}, queryPlaceholders);
	};

	/**
	 * 私有: 获取未远程获取的对象并添加到缓存中
	 * @param {String} objId 任意指定的对象ID
	 * @param {Any Model Type} objType 缓存模型类型
	 * @param {Object} params 请求参数
	 * @param {Object} placeholders 占位参数
	 * @return {Model} 生成的未远程获取的对象
	 */
	_generateUnfetchObjAndCache(objId, objType, params, placeholders) {
		if(! objId) {
			console.error('无法为无效ID创建默认模型实例', objId, placeholders);
		}
		const obj = new objType({
			id: objId.toString(),
			name:'#未获取#'
		}, true);
		return this._putObjInCache(obj, objType, params, placeholders);
	};
};

/**
 * 私有: 模版方法: 进行ajax请求
 */
const _ajaxTemplate = async (params, callbacks, placeholders, task) => {
	if(! params) {
		throw new Error('参数不能为null');
	}
	if(! callbacks) {
		throw new Error('回调不能为null');
	}
	// 加人默认错误处理回调
	_handleDefaultErrorCallbacks(callbacks);
	// 准备请求参数
	const ajaxParams = placeholders['ajaxParams'] || {};
	// 如果有搜索参数, 则构建对应的搜索参数到请求参数中
	if(params.searches) {
		Utils.copyProperties(params.searches, ajaxParams);
	}
	// 额外参数加入
	const copyParamNames = Config.COPY_PARAM_NAMES;
	for(let i = 0; i < copyParamNames.length; i ++ ) {
		const copyParamName = copyParamNames[i];
		if(Utils.isString(copyParamName)) {
			if(! params.hasOwnProperty(copyParamName) || ! params[copyParamName]) {
				continue;
			}
			ajaxParams[copyParamName] = params[copyParamName];
			continue;
		}
		if(Utils.isObject(copyParamName)) {
			ajaxParams[copyParamName.key] = params[copyParamName.value];
		}
	}
	// 处理分页
	if(params.pagination) {
		if(! _setPagination(params.pagination, ajaxParams, callbacks)) {
			return;
		}
	}
	// 内部定义回调 - 处理请求参数
	let ajaxParamsHandleFn = placeholders['_ajaxParamsHandleFn'];
	if(Utils.isFunc(ajaxParamsHandleFn)) {
		if(ajaxParamsHandleFn(ajaxParams)) {
			return;
		}
	}
	// 格式化参数 
	for(let ajaxParamKey in ajaxParams) {
		if(! ajaxParams.hasOwnProperty(ajaxParamKey)) {
			continue;
		}
		// 移除无效值
		let ajaxParamVal = ajaxParams[ajaxParamKey];
		if(! Utils.isValidVariable(ajaxParamVal)) {
			delete ajaxParams[ajaxParamKey];
			continue;
		}
		// 略过文件类型
		if(Utils.isInstance(ajaxParamVal, File)) {
			continue;
		}
		// 格式化对象为json字符串
		if(Utils.isObject(ajaxParamVal) || Utils.isArray(ajaxParamVal)) {
			ajaxParams[ajaxParamKey] = JSON.stringify(ajaxParamVal);
		}
	}
	// 如果需要作为任务提交则加入任务处理队列(未完成)
	if(task && ! _postTask(task, ajaxParams, params, callbacks, placeholders)) {
		return;
	}
	// 基本回调 - start
	if(Utils.isFunc(callbacks.onStart)) {
		callbacks.onStart();
	}
	// 构建请求方法和请求地址
	let url = placeholders['url'];
	let method = placeholders['_ajaxMethod'] || placeholders['method'];
	if(! url) {
		url = getBaseUrl(params);
	} else if(Utils.isArray(url)) {
		const urlArray = url;
		method = urlArray[0];
		url = urlArray[1];
	}
	// 发起请求得到结果
	const json = await ajax({
		url: url,
		type: method,
		data: ajaxParams,
		headers: placeholders['ajaxHeaders'],
		responseType: placeholders['ajaxResponseType'],
		responseFormatter: placeholders['ajaxResponseFormatter'],
		error: (response, err) => {
			// 内部定义回调 - 处理错误
			let ajaxErrorFn = placeholders['_ajaxErrorFn'];
			if(Utils.isFunc(ajaxErrorFn) 
				&& ajaxErrorFn(response, err)) {
				return;
			}
			// 如果有任务, 则标记任务已失败
			if(task) {
				_markTaskStatus(task, TASK_STATUS__FAIL, response, params, placeholders);
			}
			// 基本回调 - error
			if(Utils.isFunc(callbacks.onError)) {
				callbacks.onError(response, placeholders['errorMsg']);
			}
			// 根据重试回调是否存在来调用内部定义回调 - 重试
			let retryFn = placeholders['_retryFn'];
			if(Utils.isFunc(retryFn)) {
				params.preventAjax = true;
				params.fromCache = true;
				retryFn();
			}
			// 基本回调 - end
			if(Utils.isFunc(callbacks.onEnd)) {
				callbacks.onEnd();
			}
			throw err; 
		},
	});
	// 设置分页总数
	if(json && params.pagination) {
		let total = _getTotalFromJson(json, placeholders['totalPath']);
		if(total !== undefined) {
			_setPaginationTotal(params.pagination, total, callbacks);
		}
	}
	// 内部定义回调 - 请求成功处理
	let ajaxSuccessFn = placeholders['_ajaxSuccessFn'];
	let handleResult;
	if(Utils.isFunc(ajaxSuccessFn)) {
		handleResult = json ? await ajaxSuccessFn(json) : false;
		if(handleResult !== false) { /* 返回false表示失败 */
			// 如果有任务, 则标记任务成功
			if(task) {
				_markTaskStatus(task, TASK_STATUS__SUCCESS, json, params, placeholders);
			}
		} else {
			// 如果有任务, 则标记任务失败
			if(task) {
				_markTaskStatus(task, TASK_STATUS__FAIL, json, params, placeholders);
			}
			// 通用错误识别和接口错误识别, 返回true说明被处理了
			if(Utils.isFunc(callbacks.onFail) && ! callbacks.onFail.default) {
				callbacks.onFail(_getErrorMsgFromJson(json, placeholders['errorMsgPath']) || placeholders['errorMsg'], json);
			} else if(! _handleError(json, ['COMMON', placeholders['errorTag']], callbacks, placeholders)) {
				callbacks.onFail(_getErrorMsgFromJson(json, placeholders['errorMsgPath']) || placeholders['errorMsg'], json);
			}
			// 根据重试回调是否存在来调用内部定义回调 - 重试
			let retryFn = placeholders['_retryFn'];
			if(Utils.isFunc(retryFn)) {
				params.preventAjax = true;
				params.fromCache = true;
				handleResult = await retryFn();
			}
		}
	}
	// 基本回调 - end
	if(Utils.isFunc(callbacks.onEnd)) {
		callbacks.onEnd();
	}
	return handleResult;
};

/**
 * 私有: 获取默认模型
 * @param {String} tag 该默认模型的tag
 * @return {Model Function} 默认模型对象类型
 */
const _getDefaultModel = (tag) => {
	class Model {
		constructor(row, isFromCache, placeholders) {
			if(Utils.isObject(row)) {
				Utils.copyProperties(row, this, Config.CACHE_COPY_OPTIONS);
			} else {
				this.$value = row;
			}
			if(isFromCache) {
				return this;
			}
			if(placeholders && placeholders['model']) {
				const model = placeholders['model'];
				Utils.forEach(model, (rowKey, key) => {
					this[key.replace(/Key/g, '')] = this[rowKey];
				});
			}
			if(! this.id) {
				this.id = Utils.generateTemporyId();
			}
			this.id = this.id && this.id.toString();
		}
	}
	Model.typeName = (tag || '') + 'Model';
	Model.displayName = (tag || '') + '对象';
	return Model;
};

/**
 * 私有: 获取需要生成的对象类型
 * @param {Object} placeholders 占位参数
 * @return {Model Function} 参数中指定的模型对象类型, 如果没有则返回默认的
 */
const _getObjType = (placeholders) => {
	return placeholders['objType'] || placeholders['subObjType'] 
		|| _getDefaultModel(placeholders['tag'] || placeholders['errorTag']);
};

/**
 * 获取缓存管理器实例
 * @param {Object} params 请求参数
 * @param {Object} placeholders 占位参数
 * @param {Model Function} objType 模型对象类型
 * @return {CacheManager} 参数中指定的缓存管理器实例, 如果没有则返回默认的
 */
const _getCacheManager = (params, placeholders, objType) => {
	if(params && params['cacheManager']) {
		return params['cacheManager'];
	}
	if(placeholders && placeholders['cacheManager']) {
		return placeholders['cacheManager'];
	}
	if(objType && objType['cacheManager']) {
		return objType['cacheManager'];
	}
	return new CacheManager();
};

/**
 * 获取缓存选项
 * @param {Object} params 请求参数
 * @param {Object} placeholders 占位参数
 * @return {Object} 参数中指定的缓存选项, 如果没有则返回默认的
 */
const _getCacheOptions = (params, placeholders) => {
	const cacheOptions = params['cacheOptions'] || placeholders['cacheOptions'] || {};
	cacheOptions.onReady = (cache) => {
		const oldReadyFn = cacheOptions.onReady;
		if(Utils.isFunc(cacheReadyFn)) {
			oldReadyFn(cache);
		}
		const cacheReadyFn = placeholders['_cacheReadyFn'];
		if(Utils.isFunc(cacheReadyFn)) {
			cacheReadyFn(cache);
		}
	};
	return cacheOptions;
};

/**
 * 私有: 获取缓存模型的缓存名称
 * @param {Model Function} objType 缓存模型类型
 * @return {String} 缓存模型的缓存名称
 */
const _getCacheKey = (objType) => {
	if(Utils.isString(objType)) {
		return objType + CACHE_SUFFIX;
	}
	if(! Utils.isString(objType.typeName)) {
		throw new Error('缓存的对象类型必须包含typeName属性');
	}
	return objType.typeName.toUpperCase() + CACHE_SUFFIX;
};

/**
 * 私有: 把数据模型添加到缓存中
 * @param {Any Cache} cache 缓存管理器
 * @param {Any Model} obj 缓存对象
 * @param {Object} options 缓存选项, 可选
 */
const _putCache = (cache, obj, options) => {
	const oldObj = cache.get(obj.id, options);
	if(oldObj) {
		Utils.copyProperties(obj, oldObj, Config.CACHE_COPY_OPTIONS);
		cache.cache(oldObj.id, oldObj, options);
		return;
	}
	cache.cache(obj.id, obj, options);
};

/**
 * 私有: 根据对象ID获取缓存中的数据模型
 * @param {Any Cache} cache 缓存管理器
 * @param {String} id 查询的记录ID, 若没有指定则返回所有
 * @param {Object} options 缓存选项, 可选
 * @return {Any Model} 数据模型
 */
const _getCache = (cache, id, options) => {
	if(! id) {
		return cache.all(options);
	}
	return cache.get(id, options);
};

/**
 * 私有: 根据对象ID删除缓存中的数据模型
 * @param {Any Cache} cache 缓存管理器
 * @param {String} id 删除的记录ID
 * @param {Object} options 缓存选项, 可选
 * @return {Boolean} 是否命中
 */
const _removeCache = (cache, id, options) => {
	return cache.remove(id, options);
};

/**
 * 私有: 在对象集合中搜索符合目标条件(可能多个, 全OR或全AND连接)的对象
 * @param {Object Array} searchObjs 缓存对象集合
 * @param {Object Array} searches 搜索内容
 * @param {Boolean} strict 是否严格匹配所查询的值
 * @return {Object Array} 缓存对象集合中符合条件的对象集
 */
const _searchCache = (searchObjs, searches, strict) => {
	if(searchObjs.length == 0) {
		return [];
	}
	if(! searches) {
		return [];
	}
	let isAnd = ! searches.or;
	let searchResults = [];
	for(let key in searches) {
		if(! searches.hasOwnProperty(key) || ['or'].indexOf(key) != -1) {
			continue;
		}
		let searchValue = searches[key];
		let results = search(searchObjs, key, searchValue, strict);
		for(let i = 0; i < results.length; i ++) {
			let result = results[i];
			if(searchResults.indexOf(result) == -1) {
				searchResults.push(result);
			}
		}
		if(isAnd) {
			searchObjs = searchResults;
		}
	}
	if(searchResults.length == 0) {
		return [];
	}
	return searchResults;
};

/**
 * 私有: 获取指定的当前缓存对象所属缓存父对象ID
 * @param {Object} placeholders 占位参数
 * @param {Object} obj 当前缓存对象
 * @return {String} 所属缓存父对象ID
 */
const _getCacheParentObjId = (placeholders, obj) => {
	let parentKey = placeholders['parentKey'];
	if(parentKey && obj) {
		return JSONPath({path: _formatPath(parentKey), json: obj});
	}
	return placeholders['parentObjId'];
};

/**
 * 私有: 获取父缓存中的对子对象ID缓存属性的值
 * @param {Object} placeholders 占位参数
 * @param {Model} parentObj 父对象
 * @return {String} 返回ID
 */
const _getCacheSubObjIdProp = (placeholders, parentObj) => {
	return JSONPath({
		path: _formatPath(placeholders['subObjIdCacheKey']), 
		json: parentObj,
		wrap: false,
	});
};

/**
 * 私有: 设置缓存中的指定属性名称的值
 * @param {String} cacheKey 指定属性名称
 * @param {Model} parentObj 父对象
 * @param {String} newVal 新的ID值
 * @param {Object} obj 当前缓存对象
 */
const _setCacheProp = (cacheKey, parentObj, newVal, obj) => {
	if(! parentObj) {
		return;
	}
	if(cacheKey.indexOf('[') == -1) {
		parentObj[cacheKey] = newVal;
		return;
	}
	const pieces = cacheKey.split('[');
	const mapCacheKey = pieces[0];
	const newValueKey = pieces[1].replace(/\[|\]/g, '');
	if(! parentObj[mapCacheKey]) {
		parentObj[mapCacheKey] = {};
	}
	if(newValueKey.indexOf('$') == -1) {
		parentObj[mapCacheKey][newValueKey] = newVal;
		return;
	}
	const pathTypeKey = JSONPath({
		path: _formatPath(newValueKey), 
		json: obj,
		wrap: false,
	});
	parentObj[mapCacheKey][pathTypeKey] = newVal;
};

/**
 * 私有: 设置父缓存中的对子对象ID缓存属性的值
 * @param {Object} placeholders 占位参数
 * @param {Model} parentObj 父对象
 * @param {String} newVal 新的ID值
 * @param {Object} obj 当前缓存对象
 */
const _setCacheSubObjIdProp = (placeholders, parentObj, newVal, obj) => {
	_setCacheProp(placeholders['subObjIdCacheKey'], parentObj, newVal, obj);
};

/**
 * 私有: 获取父缓存中的对子对象ID列表缓存属性的值
 * @param {Object} placeholders 占位参数
 * @param {Model} parentObj 父对象
 * @return {Array} ID列表
 */
const _getCacheSubObjIdsProp = (placeholders, parentObj) => {
	const value = JSONPath({
		path: _formatPath(placeholders['subObjIdsCacheKey']), 
		json: parentObj,
		wrap: false,
	});
	if(! value) {
		_setCacheSubObjIdsProp(placeholders, parentObj, []);
		return [];
	}
	return value;
};

/**
 * 私有: 设置父缓存中的对子对象ID列表缓存属性的值
 * @param {Object} placeholders 占位参数
 * @param {Model} parentObj 父对象
 * @param {String} newVal 新的ID列表值
 * @param {Object} obj 当前缓存对象
 */
const _setCacheSubObjIdsProp = (placeholders, parentObj, newVal, obj) => {
	_setCacheProp(placeholders['subObjIdsCacheKey'], parentObj, 
		Utils.isArray(newVal) ? newVal : [], obj);
};

/**
 * 私有: 设置列表缓存排序
 * @param {*} params 请求参数
 * @param {*} placeholders 占位参数
 * @param {*} objs 目标列表
 * @param {*} parentObj 目标列表父对象
 */
const _sortingCache = (params, placeholders, objs, parentObj) => {
	const handleFn = params['handleSortCacheFn'] || placeholders['handleSortCacheFn'];
	if(Utils.isFunc(handleFn)) {
		return handleFn(objs, parentObj);
	}
	return objs;
};

/**
 * 私有: 设置缓存更新
 * @param {*} params 请求参数
 * @param {*} placeholders 占位参数
 * @param {*} obj 目标缓存
 * @param {*} parentObj 目标列表父对象
 */
const _updatingCache = (params, placeholders, obj, parentObj) => {
	const handleFn = params['handleUpdateCacheFn'] || placeholders['handleUpdateCacheFn'];
	if(! Utils.isFunc(handleFn)) {
		return;
	}
	handleFn(obj, parentObj);
};

/**
 * 私有: 对本地缓存的对象进行分页切割
 * @param {Object Array} objs 缓存对象总集合
 * @param {Object} pagination 分页对象
 * @param {Object} callbacks 回调对象
 */
const _pagingCache = (objs, pagination, callbacks) => {
	if(objs.length == 0) {
		return objs;
	}
	if(! pagination.page || ! pagination.count) {
		return objs;
	}
	
	pagination.fetchedTotal = objs.length;
	_setPagination(pagination, null, callbacks);
	pagination.cachePaged = true;
	
	let start = (pagination.page - 1) * pagination.count; /* 缓存分页忽略offset */
	let end = start + pagination.count;
	let result = objs.slice(start, end);
	if(result.length == 0) {
		pagination.cacheMissed = true;
		return [];
	} /* 即使不满足count的数量也返回 */
	return result;
};

/**
 * 私有: 设置分页的总数
 * @param {Object} pagination 分页对象
 * @param {Object} ajaxParams AJAX对象
 * @param {Object} callbacks 回调对象
 */
const _setPagination = (pagination, ajaxParams, callbacks) => {
	if(! pagination.id) {
		throw new Error('请指定分页ID, 建议使用时间戳!');
	}
	const cacheManager = _getCacheManager();
	const cache = cacheManager.cacheOf(PAGINATION_CACHE_NAME);
	let command = pagination.command;
	let oldPagination = _getCache(cache, pagination.id);
	if(! oldPagination) {
		oldPagination = {
			id: pagination.id,
		};
		command = 'reset';
	}
	if(! pagination.cacheMissed
		&& ! pagination.cachePaged) {
		let currentTime = Date.now();
		if(oldPagination.$lastPagingTime 
			&& currentTime - oldPagination.$lastPagingTime <= Config.MIN_PAGING_INTERVEL) {
			return false;
		}
		oldPagination.$lastPagingTime = currentTime;
	}
	switch(command) {
	case 'next':
		if(pagination.$pagingEnd) {
			// 最后一页了, 调用基本回调
			if(callbacks && Utils.isFunc(callbacks.onLastPage)) {
				callbacks.onLastPage(pagination);
			}
			return false;
		}
		/* cacheMissed在缓存按分页切割时进行设置的, 如果有这个字段表示缓存已经读完了,
			*  这时page已经是缓存最大页的下一页了(所以才会没有), 因此跳过页码增加的步骤 */
		if(! pagination.cacheMissed) {
			oldPagination.page ++;
		}
		break;
	case 'previous':
		if(oldPagination.page <= 1) {
			return false;
		}
		oldPagination.page --;
		break;
	case 'reset':
		oldPagination.count = pagination.count || 20;
		oldPagination.page = 1;
		oldPagination.offset = 0;
		oldPagination.total = NaN;
		oldPagination.totalPage = NaN;
		oldPagination.$pagingEnd = false;
		delete oldPagination.ajaxParams;
		break;
	default: /* 不传命令表示刷新或自己控制 */
		if(pagination.page !== undefined) {
			oldPagination.page = pagination.page;
		}
		if(pagination.offset !== undefined) {
			oldPagination.offset = pagination.offset;
		}
		break;
	}
	if(oldPagination.ajaxParams) {
		Utils.copyProperties(oldPagination.ajaxParams, ajaxParams);
	}
	if(ajaxParams) {
		if(! oldPagination.ajaxParams) {
			oldPagination.ajaxParams = {};
			Utils.copyProperties(ajaxParams, oldPagination.ajaxParams);
		}
		if(oldPagination.page) {
			ajaxParams.page = oldPagination.page;
		}
		if(oldPagination.count) {
			ajaxParams.count = oldPagination.count;
		}
		if(oldPagination.offset) {
			ajaxParams.offset = oldPagination.offset;
		}
	}
	delete pagination.cacheMissed; /* 不缓存这些 */
	delete pagination.cachePaged;
	Utils.copyProperties(oldPagination, pagination);
	_putCache(cache, oldPagination);
	return true;
};

/**
 * 私有: 设置分页查询结果的总数
 * @param {Object} pagination 分页对象
 * @param {Number} total 查询到的中数量
 * @param {Object} callbacks 回调对象
 */
const _setPaginationTotal = (pagination, total, callbacks) => {
	const cacheManager = _getCacheManager();
	const cache = cacheManager.cacheOf(PAGINATION_CACHE_NAME);
	const oldPagination = _getCache(cache, pagination.id);
	if(! oldPagination) {
		throw new Error('无id为' + pagination.id + '分页环境!');
	}
	oldPagination.total = total;
	oldPagination.totalPage = Math.ceil(total / oldPagination.count);
	
	// 最后一页了, 进行处理
	const isLastPage = oldPagination.page >= oldPagination.totalPage;
	if(isLastPage) {
		oldPagination.$pagingEnd = true;
		oldPagination.loaded = oldPagination.count * (oldPagination.page - 1) + (total % oldPagination.count);
	} else {
		oldPagination.loaded = oldPagination.count * oldPagination.page;
	}
	oldPagination.left = total - oldPagination.loaded;
	Utils.copyProperties(oldPagination, pagination);
	_putCache(cache, oldPagination);
	if(isLastPage && callbacks && Utils.isFunc(callbacks.onLastPage)) {
		callbacks.onLastPage(pagination);
	}
};

/**
 * 私有: 处理来自后台的异常信息, 转换为用户可理解的输出, 与常量配置中的ErrorLanguages配合使用
 * @param {Object} json 后台传回来的错误信息
 * @param {String Array} types 指定识别的类型
 * @param {Function Object} callbacks 可用的回调
 */
const _handleError = (json, types, callbacks, placeholders) => {
	if(Utils.isString(types)) {
		types = [types];
	}
	const testErrorMsg = _getErrorMsgFromJson(json, placeholders['errorMsgPath']);
	const testErrorType = _getErrorTypeFromJson(json, placeholders['errorTypePath']);
	const defaultHandler = ErrorLanguages.DEFAULT_HANDLER;
	if(! defaultHandler) {
		return false;
	}
	for(let i = 0; i < types.length; i ++) {
		const type = types[i];
		const defs = ErrorLanguages[type];
		if(! defs) {
			return false;
		}
		for(let j = 0; j < defs.length; j ++) {
			const def = defs[j];
			const accept = def.accept;
			const handler = def.handler || defaultHandler;
			if(accept && ! accept(json)) {
				continue;
			}
			if(def.msgPiece && testErrorMsg && testErrorMsg.indexOf(def.msgPiece) != -1) {
				handler(json, callbacks);
				return true;
			}
			if(def.errorType && testErrorType && def.errorType == testErrorType) {
				handler(json, callbacks);
				return true;
			}
		}
	}
};

/**
 * 添加默认的回调
 * @param {Object} callbacks 回调对象
 */
const _handleDefaultErrorCallbacks = (callbacks) => {
	if(! callbacks.onTooFast) {
		callbacks.onTooFast = () => {
			toast('请慢点进行操作');
		};
		callbacks.onTooFast.default = true;
	}
	if(! callbacks.onPostSame) {
		callbacks.onPostSame = () => {
			toast('正在进行该项处理, 请耐心等待...');
		};
		callbacks.onPostSame.default = true;
	}
	if(! callbacks.onError) {
		callbacks.onError = (response, errorMsg) => {
			if(errorMsg) {
				notify('网络异常: ' + errorMsg);
			}
			error(response);
		};
		callbacks.onError.default = true;
	}
	if(! callbacks.onFail) {
		callbacks.onFail = (errorMsg, json) => {
			if(errorMsg) {
				notify(errorMsg);
			}
			error(json);
		};
		callbacks.onFail.default = true;
	}
};

/**
 * 获取任务管理器实例 
 * @param {Object} params 请求参数
 * @param {Object} placeholders 占位参数
 * @return {TaskManager} 参数中指定的任务管理器实例, 如果没有则返回默认的
 */
const _getTaskManager = (params, placeholders) => {
	if(params && params['taskManager']) {
		return params['taskManager'];
	}
	if(placeholders && placeholders['taskManager']) {
		return placeholders['taskManager'];
	}
	return new TaskManager();
};

/**
 * 私有: 提交一个任务
 * @param {Object} task 任务
 * @param {Any} ajaxParams ajax请求参数
 * @param {Object} params 请求参数
 * @param {Object} callbacks 回调对象
 * @param {Object} placeholders 占位参数
 */
const _postTask = (task, ajaxParams, params, callbacks, placeholders) => {
	const taskManager = _getTaskManager(params, placeholders);
	return taskManager.post(task, callbacks, ajaxParams);
};

/**
 * 私有: 标记一个任务状态
 * @param {Object} task 任务
 * @param {String} status 任务状态
 * @param {Any} resultObj 响应结果
 * @param {Object} params 请求参数
 * @param {Object} placeholders 占位参数
 */
const _markTaskStatus = (task, status, resultObj, params, placeholders) => {
	const taskManager = _getTaskManager(params, placeholders);
	taskManager.complete(task, status, resultObj);
};

/**
 * 私有: (底层) 格式化Path
 * @param {String} path 从中获取对象时使用的Path
 */
const _formatPath = (path) => {
	return path;
};

/**
 * 私有: (底层) 根据Path获取对象
 * @param {Object} json 目标对象
 * @param {String} path 从中获取对象时使用的Path
 */
const _getObjByPath = (json, path) => {
	return JSONPath({path: _formatPath(path), json: json})[0];
};

/**
 * 私有: (底层) 获取请求结果中的对象
 * @param {Object} json 请求结果对象
 * @param {String} path 从中获取对象时使用的Key
 */
const _getObjFromJsonByPath = (json, path) => {
	if(_getObjByPath(json, path) !== undefined) {
		return _getObjByPath(json, path);
	}
	if((json.value && _getObjByPath(json.value, path)) !== undefined) {
		return _getObjByPath(json.value, path);
	}
	if((json.data && _getObjByPath(json.data, path)) !== undefined) {
		return _getObjByPath(json.data, path);
	}
};

/**
 * 私有: (底层) 获取请求结果中的对象
 * @param {Object} json 请求结果对象
 * @param {String | String Array} paths 从中获取对象时使用的Path, 可以为集合
 * @param {Object} defaultVal 默认值
 */
const _getObjFromJson = (json, paths, defaultVal) => {
	if(! json || ! paths) {
		return;
	}
	if(! Utils.isObject(json)) {
		return defaultVal;
	}
	if(Utils.isString(paths)) {
		let result = _getObjFromJsonByPath(json, paths);
		if(result !== undefined) {
			return result;
		}
	}
	if(Utils.isArray(paths)) {
		for(let path of paths) {
			let result = _getObjFromJsonByPath(json, path);
			if(result) {
				return result;
			}
		}
	}
	return [json];
};

/**
 * 私有: 获取请求结果中的处理结果标志
 * @param {Object} json 请求结果对象
 * @param {String | String Array} path 从中获取处理结果标志时使用的Path, 可以为集合
 */
const _getResultFromJson = (json, path = 'result') => {
	return _getObjFromJson(json, path, false);
};

/**
 * 私有: 获取请求结果中的数据集
 * @param {Object} json 请求结果对象
 * @param {String | String Array} path 从中获取数据集时使用的Path, 可以为集合
 */
const _getRowsFromJson = (json, path = 'rows') => {
	const rows = _getObjFromJson(json, path);
	if(! rows) {
		return rows;
	}
	if(! Utils.isArray(rows)) {
		return [rows];
	}
	return rows;
};

/**
 * 私有: 获取请求结果中的总数的值
 * @param {Object} json 请求结果对象
 * @param {String | String Array} path 从中获取总数的值时使用的Path, 可以为集合
 */
const _getTotalFromJson = (json, path = 'total') => {
	return _getObjFromJson(json, path);
};

/**
 * 私有: 获取错误请求结果中的错误信息
 * @param {Object} json 请求结果对象
 * @param {String | String Array} path 从中获取错误信息时使用的Path, 可以为集合
 */
const _getErrorMsgFromJson = (json, path = ['msg', 'message', 'exMsg']) => {
	return _getObjFromJson(json, path);
};

/**
 * 私有: 获取错误请求结果中的错误类型
 * @param {Object} json 请求结果对象
 * @param {String | String Array} path 从中获取错误类型时使用的Path, 可以为集合
 */
const _getErrorTypeFromJson = (json, path = 'errorType') => {
	return _getObjFromJson(json, path);
};

/**
 * 默认缓存实现(使用内存)
 */
class Cache {

	/**
	 * 构造器: 指定缓存名称来构建Map
	 * @param {String} cacheKey 缓存名称
	 * @param {Object} options 可选参数
	 */
	constructor(cacheKey, options) {
		if(! cacheKey) {
			throw new Error('无效的缓存名称');
		}
		const context = getBaseContext();
		if(! context.__DEFAULT_CACHE_POOL__) {
			context.__DEFAULT_CACHE_POOL__ = {};
		}
		if(! context.__DEFAULT_CACHE_POOL__[cacheKey]) {
			context.__DEFAULT_CACHE_POOL__[cacheKey] = {};
		}
		this._options = options;
		this._cache = context.__DEFAULT_CACHE_POOL__[cacheKey];
		this._cacheKey = cacheKey;
		this._cacheContainer = context.__DEFAULT_CACHE_POOL__;
	};

	/**
	 * 从缓存中获取对象
	 * @param {String} key 缓存对象的key
	 */
	get(key) {
		return this._cache[key];
	};

	/**
	 * 从缓存中获取全部对象
	 */
	all() {
		return Utils.asList(this._cache);
	};

	/**
	 * 存入一个对象到缓存
	 * @param {String} key 缓存的键
	 * @param {Object} value 目标对象
	 */
	cache(key, value) {
		this._cache[key] = value;
	};

	/**
	 * 从缓存中删除一个对象
	 * @param {String} key 缓存的键
	 */
	remove(key) {
		delete this._cache[key];
	};

	/**
	 * 清理缓存所有对象
	 */
	clear() {
		this._cacheContainer[this._cacheKey] = {};
	};
};

/**
 * 默认缓存管理器实现
 */
class CacheManager {
	
	/**
	 * 根据对象类型获取一个缓存实例
	 * @param {Model Function} objType 缓存模型类型
	 * @param {Object} options 可选参数
	 * @return {Cache} 缓存实例
	 */
	cacheOf(objType, options) {
		return new Cache(_getCacheKey(objType), options);
	};
};

/**
 * 默认任务管理器实现, 使用默认缓存
 */
class TaskManager {

	/**
	 * 发起任务请求
	 * @param {Object} task 任务对象
	 * @param {Object} callbacks 外部指定的回调函数 
	 * @param {Object} args 任务的额外参数
	 */
	post(task, callbacks, args) {
		const currentTime = Date.now();
		const cacheManager = _getCacheManager();
		const cache = cacheManager.cacheOf(TASK_CACHE_NAME);
		const oldTask = _getCache(cache, task.id);
		if(oldTask) {
			// 过快
			if(currentTime - oldTask.startTime < Config.MIN_SAME_TASK_POST_INTERVEL) {
				if(Utils.isFunc(callbacks.onTooFast)) {
					callbacks.onTooFast(oldTask);
				}
				return false;
			}
			// 验证状态
			switch(oldTask.status) {
			case TASK_STATUS__DEFAULT: /* 未结束 */
				// 超时, 则重新开始, 即使可能出现重复数据提交
				if(currentTime - oldTask.startTime > Config.TIMEOUT_INTERVEL) {
					break;
				}
				if(Utils.isFunc(callbacks.onPostSame)) {
					callbacks.onPostSame(oldTask);
				}
				return false;
			case TASK_STATUS__SUCCESS: /* 上一个该类任务已结束, 可以重新开始 */
			case TASK_STATUS__FAIL:
				task = oldTask;
				break;
			default:
				return false;
			}
			_removeCache(cache, oldTask.id);
		}
		// 重设任务
		task.status = TASK_STATUS__DEFAULT;
		task.startTime = currentTime;
		task.args = args;
		_putCache(cache, task);
		return true;
	};

	/**
	 * 标记任务完成, 可以是成功也可以是失败
	 * @param {Object} task 任务对象
	 * @param {String} status 任务状态, success/fail/error
	 * @param {Object} result 任务请求结果
	 */
	complete(task, status, result) {
		const currentTime = Date.now();
		const cacheManager = _getCacheManager();
		const cache = cacheManager.cacheOf(TASK_CACHE_NAME);
		const oldTask = _getCache(cache, task.id);
		if(oldTask) {
			oldTask.result = result.data || result;
			oldTask.status = status;
			oldTask.updateTime = currentTime;
			_putCache(cache, oldTask);
			return true;
		}
		return false;
	};
};