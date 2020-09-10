import {toast,notify,alert} from 'common/env';

/** 
 * 配置常量
 */
export const Config = {
	ROUTER_MODE: 'hash',
	MIN_SAME_TASK_POST_INTERVEL: 0, /* 单位为毫秒, <=0不启用*/
	MIN_PAGING_INTERVEL: 500,/* 单位为毫秒*/
	TIMEOUT_INTERVEL: 60000, /* 单位为毫秒*/
	COPY_PARAM_NAMES: ['query', 'resources', 'extend', 'field', 'sort'],
	ACCEPT_IMG_TYPES: 'image/png,image/gif,image/jpg,image/jpeg',
	MAX_IMG_SIZE: 1024 * 1024 * 10,
	CACHE_COPY_OPTIONS: {
		force: false,
		skipTypes: [File, HTMLElement],
		accept: (copyItem) => {
			if(copyItem instanceof File) {
				return false;
			}
			if(copyItem instanceof HTMLElement) {
				return false;
			}
			return true;
		},
		arrayContains: (newArr, oldItem) => {
			// 没有id说明不是model, 直接判断是否在列表中并返回
			if(! oldItem.id) {
				return newArr.indexOf(oldItem) != -1;
			}
			// 否则判断ID是否相同
			for(let newItem of newArr) {
				if(oldItem.id == newItem.id) {
					return true;
				}
			}
			return false;
		},
	},
};

/**
 * 常用的验证器, 配合Utils.validate使用
 */
export const DefaultValidators = {
	length : {
		validate: function(val, rule) {
			if(typeof val != 'string') {
				return rule.fail;
			}
			if(rule.min && val.length < rule.min) {
				return rule.fail;
			}
			if(rule.max && val.length > rule.max) {
				return rule.fail;
			}
			return true;
		},
	},
	format : {
		validate: function(val, rule) {
			if(typeof val != 'string') {
				return rule.fail;
			}
			if(! rule.regex.test(val)) {
				return rule.fail;
			}
			return true;
		},
	}
};

/**
 * 后台错误信息转换和处理, 配合BaseService._handleError使用
 */
export const ErrorLanguages = {
	DEFAULT_HANDLER: function(json) {
		toast(json.msg || json.result.msg);
	},
	COMMON: [{
		msgPiece: '会话超时',
		handler: function() {
			alert('您已会话超时, 请重新登录后运行工具!');
		},
	}, {
		msgPiece: '内部错误',
		handler: function() {
			notify('服务异常!');
		},
	}],
	// serviceErrorTag: [{
	// 	msgPiece: '错误信息片段或全部',
	// 	handler: function() {
	// 		notify('作需要的全局处理!如需局部处理调用Service时使用onFail');
	// 	},
	// }],
};