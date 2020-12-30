import { DefaultValidators } from 'common/constants';

/**
 * 常用的工具方法
 */
const Utils = {

	/**
	* 验证变量是否符合规则
	* @param {Object} val 检查的变量
	* @param {Object} rulesMap 检查的规则集, 格式参考Constant.DefaultValidators
	* @return {Boolean} 是否有效
	*/
	validate(val, rulesMap) {
		if(! rulesMap) {
			return;
		}
		for(let name in rulesMap) {
			if(rulesMap.hasOwnProperty(name)) {
				let rules = rulesMap[name];
				if(! Utils.isObject(rules)) {
					throw new Error('不正确的规则对象: ' + rules);
				}
				let validator = DefaultValidators[name];
				if(! validator) {
					if(! Utils.isObject(rules.validator)) {
						throw new Error('非默认规则池的规则中不能没有指定validator: ' + rules);
					}
					validator = rules.validator;
					rules = rules.rules;
				}
				if(! rules) {
					continue;
				}
				if(! (rules instanceof Array)) {
					rules = [rules];
				}
				for(let i = 0; i < rules.length; i ++) {
					let rule = rules[i];
					if(! rule.hasOwnProperty('fail')) {
						rule.fail = false;
					}
					if(Utils.isFunc(rule.always)) {
						rule.always();
					}
					if(rule.fail === validator.validate(val, rule)) {
						return rule.fail;
					}
				}
			}
		}
		return true;
	},
	/**
	* 检查一个变量是否有效
	* @param {Object} variable 检查的变量
	* @return {Boolean} 是否有效
	*/
	isValidVariable(variable){
		if(variable === null || variable === undefined 
			|| variable === '' || variable === 'undefined'
			|| variable === 'null') {
			return false;
		}
		return true;
	},
	/**
	* 判断某个对象是否是函数
	* @param {Object} func 检查的对象
	* @return {Boolean} 是否是函数
	*/
	isFunc(func) {
		if(typeof func == 'function') {
			return true;
		}
		return false;
	},
	/**
	* 判断某个对象是否是对象
	* @param {Object} obj 检查的对象
	* @return {Boolean} 是否是对象
	*/
	isObject(obj) {
		if(obj instanceof Object || typeof obj == 'object') {
			return true;
		}
		return false;
	},
	/**
	* 判断某个对象是否是数组
	* @param {Object} arr 检查的对象
	* @return {Boolean} 是否是数组
	*/
	isArray(arr) {
		if(arr instanceof Array || (arr && arr.constructor.toString().indexOf('function Array() {') != -1)) {
			return true;
		}
		return false;
	},
	/**
	* 判断某个对象是否是字符串
	* @param {Object} str 检查的对象
	* @return {Boolean} 是否是字符串
	*/
	isString(str) {
		if(str instanceof String || typeof str == 'string') {
			return true;
		}
		return false;
	},
	/**
	* 判断某个对象是否数字
	* @param {Object} number 检查的对象
	* @return {Boolean} 是否是数字
	*/
	isNumber(number) {
		if(number instanceof Number || typeof number == 'number') {
			return true;
		}
		return false;
	},
	/**
	* 判断某个对象是否是指定类型实例
	* @param {Object} obj 检查的对象
	* @param {Object} type 指定类型实例
	* @return {Boolean} 对象是否是指定类型实例
	*/
	isInstance(obj, type) {
		if(obj instanceof type || (obj && type && obj.constructor.toString() == type.toString())) {
			return true;
		}
		return false;
	},
	/**
	 * 判断类型是否继承
	 * @param {Function} sonType 子类型
	 * @param {Function} fatherType 父类型
	 * @return {Boolean} 类型是否继承
	 */
	isInherit(sonType, fatherType) {
		if(! sonType || ! fatherType || ! sonType.prototype) {
			return false;
		}
		return sonType.prototype instanceof fatherType;
	},
	/**
	* 复制属性
	* @param {Object} from 复制源对象
	* @param {Object} to 内容复制写入到对象
	* @param {Object} options 复制选项 force: 同名强制覆盖; arrayContains: 数组合并重复判断回调;
	*/
	copyProperties(from, to, options) {
		if(! from || ! to) {
			return;
		}
		if(typeof from != 'object') {
			throw new Error('复制的目标必须为对象({...}或[...])');
		}
		if(typeof to != 'object') {
			throw new Error('复制的结果必须为对象({...}或[...])');
		}
		// 保证一定有这个对象, 用于存储处理过程中的一些临时变量
		options = options && ! options._meeted ? Object.assign({}, options) : {};
		// 保证有一个_meeted数组, 存储已经处理过的对象, 防止递归处理无限循环
		if(! options._meeted) {
			options._meeted = [];
		}
		// 数组处理时是将两者内容合并, 这里控制去重
		if(! options.arrayContains) {
			options.arrayContains = (newArr, oldItem) => {
				return newArr.indexOf(oldItem) != -1;
			};
		}
		// 顶层对象加入_meeted
		options._meeted.push(from);
		// 遍历对象的内容进行处理
		for(let property in from) {
			if(! from.hasOwnProperty(property)) {
				continue;
			}
			let fromVal = from[property];
			// 非强制覆盖情况下, 值相等就不做处理了
			if(! options.force && to[property] == fromVal) {
				continue;
			}
			// 如果已经遇到过这个值了, 指定赋值并跳过
			if(options._meeted.indexOf(fromVal) != -1) {
				to[property] = fromVal;
				continue;
			}
			// 当前处理的值加入_meeted
			options._meeted.push(fromVal);
			// 如果有验证回调则进行验证
			if(options.accept && ! options.accept(fromVal)) {
				to[property] = fromVal;
				continue;
			}
			// 如果是数组, 合并后赋值
			if(Utils.isArray(fromVal)) {
				let copyArr = [];
				// 被写入(from)的值遍历复制并加入数组,准备覆盖写入值(to)
				for(let item of fromVal) {
					// 这里要确定是否是重复需要跳过, 否则多次复制同值会不断重复
					if(options.arrayContains(copyArr, item)) {
						continue;
					}
					// 如果是对象, 进行递归复制处理
					if(Utils.isObject(item)) {
						let copyItem = {};
						Utils.copyProperties(item, copyItem)
						copyArr.push(copyItem);
						continue;
					}
					// 加入数组
					copyArr.push(item);
				}
				// 加入已有的值
				if(Utils.isArray(to[property])) {
					for(let item of to[property]) {
						// 这里要确定是否是重复需要跳过, 否则多次复制同值会不断重复
						if(options.arrayContains(copyArr, item)) {
							continue;
						}
						copyArr.push(item);
					}
				}
				to[property] = copyArr;
				continue;
			}
			// 如果是对象, 递归调用合并
			if(Utils.isObject(fromVal)) {
				let copyObj = {};
				// 递归调用写入已有的值
				if(Utils.isObject(to[property])) {
					Utils.copyProperties(to[property], copyObj, options);
				}
				// 递归调用写入新的值
				Utils.copyProperties(fromVal, copyObj, options);
				to[property] = copyObj;
				continue;
			}
			to[property] = fromVal;
		}
	},
	/**
	* 把List转换为Map
	* @param {Array} list List
	* @param {String} key Map的key的值对应在List中对象的属性名称
	* @return {Object} Map
	*/
	asMap(list, key, filter) {
		if(! list || ! key) {
			return;
		}
		let result = {};
		for(let i = 0; i < list.length; i ++) {
			let element = list[i];
			if(Utils.isFunc(filter) && ! filter(element, result)) {
				continue;
			}
			let elementKey = element[key];
			if(Utils.isFunc(key)) {
				elementKey = element[key(element)];
			}
			if(! Utils.isObject(element) || ! elementKey) {
				continue;
			}
			let existElement = result[elementKey];
			if(! existElement) {
				result[elementKey] = element;
				continue;
			}
			if(! Utils.isArray(existElement)) {
				existElement = [existElement];
				result[elementKey] = existElement;
			}
			existElement.push(element);
		}
		return result;
	},
	/**
	* 把Map转换为List
	* @param {Object} map Map
	* @return {Array} List
	*/
	asList(map, filter) {
		if(! map) {
			return;
		}
		let result = [];
		for(let key in map) {
			if(map.hasOwnProperty(key)) {
				let val = map[key];
				if(val) {
					if(Utils.isFunc(filter) && ! filter(key, val)) {
						continue;
					}
					result.push(val);
				}
			}
		}
		return result;
	},
	/**
	* 把Map的Key转换为List
	* @param {Object} map Map
	* @return {Array} List
	*/
	asKeyList(map, filter) {
		if(! map) {
			return;
		}
		let result = [];
		for(let key in map) {
			if(map.hasOwnProperty(key)) {
				if(Utils.isFunc(filter) && ! filter(key, map[key])) {
					continue;
				}
				result.push(key);
			}
		}
		return result;
	},
	/**
	* 把Map转换为List
	* @param {Object} map Map
	* @param {String} key 指定的Map的key, 对应的值组成List
	* @return {Array} List
	*/
	asListByKey(mapOrList, key) {
		if(! mapOrList || ! key) {
			return;
		}
		let result = [];
		for(let key1 in mapOrList) {
			if(mapOrList.hasOwnProperty(key1)) {
				let element = mapOrList[key1];
				let resultElement = element[key];
				if(Utils.isFunc(key)) {
					resultElement = element[key(element)];
				}
				result.push(resultElement);
			}
		}
		return result;
	},
	/**
	* 把第二个List中不在第一个List的元素添加到第一个List的结尾, 并且去掉重复的部分
	* @param {Array} list1 数组1
	* @param {Array} list2 数组2
	* @return {Array} List
	*/
	combindListWithoutRepeat(list1, list2) {
		if(! Utils.isArray(list1) || ! Utils.isArray(list2)) {
			throw new Error('合并的必须是数组');
		}
		for(let i = 0; i < list2.length; i ++) {
			let val = list2[i];
			if(val === undefined && val === null) {
				continue;
			}
			if(list1.indexOf(val) == -1 || list1.indexOf(val.toString()) == -1) {
				list1.push(val);
			}
		}
	},
	/**
	* 判断对象是否具备某些key
	* @param {Object} map 需要进行判断的目标对象
	* @param {String | String Array} keys 对象属性名称
	* @param {Boolean} isAny 是否是有一个出现就返回true
	* @return {Boolean} 是否指定的key在对象中出现
	*/
	hasKeys(map, keys, isAny) {
		if(! map || ! keys) {
			return false;
		}
		if(Utils.isString(keys)) {
			keys = [keys];
		}
		for(let i = 0; i < keys.length; i ++) {
			if(! keys[i]) {
				continue;
			}
			let includeKeys = keys[i].split('\|');
			let has = false;
			for(let j = 0; j < includeKeys.length; j ++) {
				if(! includeKeys[j]) {
					if(j == 0) {
						return true;
					}
					continue;
				}
				has = map.hasOwnProperty(includeKeys[j]);
				if(has) {
					if(isAny) {
						return true;
					}
					break;
				}
			}
			if(! has && ! isAny) {
				return false;
			} 
		}
		return true;
	},
	/**
	* 对类数组对象进行遍历操作
	* @param {Array Like} obj 需要进行判断的目标节点
	* @param {Function} callback 事件名称
	*/
	forEach(obj, callback) {
		if(! obj || ! Utils.isFunc(callback)) {
			return;
		}
		if(Utils.isFunc(obj.forEach)) {
			obj.forEach(callback);
			return;
		}
		if(Utils.isArray(obj)) {
			for(let i = 0; i < obj.length; i ++) {
				const element = obj[i];
				callback(element, i, obj);
			}
			return;
		}
		for(let key in obj) {
			if(! obj.hasOwnProperty(key)) {
				continue;
			}
			const element = obj[key];
			callback(element, key, obj);
		}
	},
	/**
	* 把格式字符串中的占位符替换指定上下文中指定名称的值
	* @param {String} format 格式字符串, 如{xxx}
	* @param {Object} context 某个上下文, 包含替换的名称对应的属性和值
	* @return {Boolean} 是否具备该事件
	*/
	replacePlaceHolder(format, context) {
		if(! Utils.isString(format)) {
			return '';
		}
		let isSingleVal = ! Utils.isObject(context);
		let matches = null, lastFormat = null;
		while((matches = format.match(/{.*?}/)) && matches.length > 0) {
			for(let i = 0; i < matches.length; i ++) {
				let match = matches[i];
				let val = (isSingleVal ? context : context[match.replace(/{|}/g, '')]) || '';
				format = format.replace(new RegExp(match, 'g'), val);
			}
			if(lastFormat == format) {
				break;
			}
			lastFormat = format;
		}
		return format;
	},
	/**
	* 截取数组中的元素作为新的数组
	* @param {String} arrayLike 类数组, 如Array或arguments
	* @param {Number} start 截取开始索引下标值
	* @param {Number} end 截取结束索引下标值
	* @return {Array} 截取到的数组
	*/
	sliceArrayLike(arrayLike, start, end) {
		if(! arrayLike) {
			return [];
		}
		if(! Utils.isArray(arrayLike)) {
			arrayLike = Utils.asList(arrayLike);
		}
		return arrayLike.slice(start, end);
	},
	/**
	* 生成一个临时ID
	* @return {String} 临时ID
	*/
	generateTemporyId() {
		let s = [];
		let hexDigits = '0123456789abcdef';
		for (let i = 0; i < 36; i++) {
			s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
		}
		s[14] = '4';  // bits 12-15 of the time_hi_and_version field to 0010
		s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
		s[8] = s[13] = s[18] = s[23] = '-';
		return s.join('');
	},
	/**
	* 生成字符串的hash码
	* @param {String} str 目标字符串
	* @return {String} 字符串的hash码
	*/
	hashCode(str) {
		if(! Utils.isString(str)) {
			return 0;
		}
		let hash = 0;
		if (str.length == 0) {
			return hash
		};
		for (let i = 0; i < str.length; i ++) {
			let char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	},
	/**
	 * 转换为查询参数字符串
	 * @param {Object} obj 查询参数的对象
	 * @return {String} 查询参数字符串, 如: 传入{a:1,b:2}返回&a=1&b=2
	 */
	toQueryStr(obj) {
		if(! Utils.isValidVariable(obj)) {
			return '';
		}
		if(Utils.isString(obj)) {
			return obj;
		}
		if(Utils.isObject(obj)) {
			let queryStr = '';
			Utils.forEach(obj, (value, key) => {
				if(Utils.isString(value)) {
					queryStr += '&' + key + '=' + value;
					return;
				}
				queryStr += '&' + key + '=' + encodeURI(JSON.stringify(value));
			});
			return queryStr;
		}
		return '';
	},
	/**
	 * 编码特殊字符
	 */
	encodeTransferStr(str) {
		return str.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\'/g, '&#39;')
			.replace(/\r\n/g, '<br>')
			.replace(/\n/g, '<br>')
			.replace(/ /g, '&nbsp;')
			.replace(/\"/g, '&quot;')
			.replace(/\+/g, '&#43;')
			.replace(/\%/g, '&#37;');
	},
	/**
	 * 解码特殊字符
	 */
	decodeTransferStr(str) {
		return str.replace(/\&amp;/g, '&')
			.replace(/\&lt;/g, '<')
			.replace(/\&gt;/g, '>')
			.replace(/\&#39;'/g, '\'')
			.replace(/<br>/g, '\r\n')
			.replace(/\&nbsp;/g, ' ')
			.replace(/\&quot;/g, '\"')
			.replace(/\&#43;/g, '+')
			.replace(/\&#37;/g, '%'); 
	},
};

export default Utils;