/* ! 环境配置, 把和上下文有关的所有公共方法或变量提取到这里 */

/* 环境变量方法 */
/**
 * 获取当前的客户端环境对象
 */
export const getBaseContext = () => {
	return window;
};

/**
 * 获取项目请求根路径
 */
export const getBaseUrl = (params) => {
	if(params._gid) {
		return g_callToolUrl.replace(/(?<=[&?]gid=)\d+/g, params._gid) + '&toolID=' + g_thisToolId;
	}
	return g_runToolUrl;
};

/**
 * 获取项目资源请求根路径
 */
export const getResourceUrl = () => {
	return g_resourceUrl;
};

/**
 * 获取工具运行参数
 */
export const getRunToolParam = () => {
	return g_rtParam;
};

/**
 * 获取当前用户的AccessToken
 */
export const getAccessToken = () => {
	return g_accessToken;
};

/**
 * 获取当前的客户端类型
 */
export const getClientType = () => {
	return g_clientType;
};

/* 数据处理基础方法 */
import Utils from 'common/utils';
import fuzzysort from 'plugin/fuzzysort';

/**
 * 根据对象某个key查询获取指定数据集合中符合条件的数据
 * @param {Array} objs 查询的数据集合
 * @param {String} searchKey 查询的数据中字段名称
 * @param {Number|String} searchValue 查询的值或其片段
 * @param {Boolean} strict 是否是严格模式, true表示必须值完全一致才能作为结果, false表示包含值才能作为结果, 不填表示完全模糊匹配
 * @return {Object List} 符合条件的数据列表, 如果找不到返回空列表
 */
export const search = (objs, searchKey, searchValue, strict) => {
	if (! Utils.isArray(objs) && ! Utils.isObject(objs[0])) {
		throw new Error('非对象列表无法搜索');
	}
	if (!searchKey || !searchValue) {
		return [];
	}
	var option = {
		key: searchKey,
		allowTypo: false,
		threshold: -999,
	};
	var searchResults = fuzzysort.go(searchValue, objs, option);
	var results = [];
	for (var i = 0; i < searchResults.length; i++) {
		var searchResult = searchResults[i].obj;
		var objValue = searchResult[searchKey];
		if (strict === true && objValue == searchValue) {
			results.push(searchResult);
		} else if (strict === false && objValue.toString().indexOf(searchValue) != -1) {
			results.push(searchResult);
		} else if (strict === undefined) {
			results.push(searchResult);
		}
	}
	return results;
};

import axios from 'axios';
import qs from 'qs';

/**
 * 远程Ajax请求
 * @param {Object} option 远程请求参数
 */
export const ajax = async (option) => {
	let response;
	if(option.type && option.type.toUpperCase() == 'POST') {
		let data = formatPOSTAjaxParams(option);
		response = await axios.post(option.url, data, {
			headers: option.headers,
			responseType: formatResponseType(option),
		}).catch(err => {
			if (typeof option.error == 'function') {
				option.error(err.response, err);
			}
		});
	} else {
		response = await axios.request({
			url: option.url,
			params: option.data,
			method: option.type,
			headers: option.headers,
			responseType: formatResponseType(option),
			paramsSerializer: (params) => {
				return qs.stringify(params, { arrayFormat: 'brackets' });
			}
		}).catch((err) => {
			if (typeof option.error == 'function') {
				option.error(err.response, err);
			}
		});
	}
	if(! response) {
		return;
	}
	const result = await formatResponseData(response, option);
	if(option.responseFormatter) {
		return option.responseFormatter(result);
	}
	return result;
};

/**
 * ajax 内部使用: 处理包括文件的远程Ajax请求参数
 */
const formatPOSTAjaxParams = (option) => {
	if(! option.data) {
		return;
	}
	const ajaxParams = option.data;
	const headers = option.headers = option.headers || {};
	const formData = new FormData();
	for(let key in ajaxParams) {
		if(! ajaxParams.hasOwnProperty(key)) {
			continue;
		}
		if(Utils.isInstance(ajaxParams[key], File)) {
			headers['Content-Type'] = 'multipart/form-data';
		}
		formData.append(key, ajaxParams[key]);
	}
	if(headers['Content-Type'] != 'multipart/form-data') {
		headers['Content-Type'] = 'application/x-www-form-urlencoded'
		return qs.stringify(ajaxParams);
	}
	return formData;
};

/**
 * ajax 内部使用: 格式化远程Ajax响应结果类型
 */
const formatResponseType = (option) => {
	if(option.responseType == 'file') {
		return 'blob';
	}
	return 'json';
};

/**
 * ajax 内部使用: 格式化远程Ajax响应结果
 */
const formatResponseData = (response, option) => {
	return new Promise((resolve) => {
		switch(option.responseType) {
			case 'file':
				const file = getResponseFile(response);
				resolve(new window.File([file.blob], file.name, {type: file.type}));
			default:
				resolve(response.data);
		}
	});
};

/**
 * ajax 内部使用: 获取ajax响应的文件信息
 */
const getResponseFile = (response) => {
	if(! response.headers || ! response.headers['content-disposition']) {
		return _.toString(_.now());
	}
	const fileMatched = response.headers['content-disposition'].match(/(?<=(filename=)).+(;|$)/g);
	if(! fileMatched || ! fileMatched.length) {
		return _.toString(_.now());
	}
	const fileName = fileMatched[0];
	const dotIndex = _.lastIndexOf(fileName, '.');
	const extension = dotIndex == -1 ? '' : fileName.substr(dotIndex, fileName.length);
	return {
		name: fileName,
		type: _.toLower(extension.replace('.', '')),
		extension: extension,
		blob: response.data,
	};
};

/* 日志的工具方法 */
/**
 * 输出调试日志
 * @param {Object} msg 信息
 */
export const log = (msg) => {
	console.log(msg);
};
/**
 * 输出信息日志
 * @param {String} msg 信息
 */
export const info = (msg) => {
	console.info(msg);
};
/**
 * 输出警告日志
 * @param {String} msg 警告的消息
 */
export const warn = (msg) => {
	console.warn(msg);
};
/**
 * 输出错误日志
 * @param {String} msg 错误消息
 */
export const error = (msg) => {
	console.error(msg);
};

/* 提示用的工具方法 */
import Vue from 'vue';
import { Toast,Notify } from 'vant';
Vue.use(Toast);
Vue.use(Notify);
import 'muse-ui-message/dist/muse-ui-message.css';
import Message from 'muse-ui-message';
Vue.use(Message, {
	successIcon: ':iconfont icondui',                    // 成功图标
	infoIcon: ':iconfont iconinfo1',                               // 信息图标
	warningIcon: ':iconfont iconwarn',                   // 提醒图标
	errorIcon: ':iconfont iconerror',                           // 错误图标
	iconSize: 64,                                   // 图标大小
	maxWidth: '80%',                                // 对话框最大宽度
	okLabel: '确定',                                 // 对话框确定按钮文字
	cancelLabel: '取消',                             // 对话框取消按钮文字
	transition: 'scale'
});

/**
 * 提示信息(主要)
 */
export const toast = (message, type = 'text', options) => {
	return Toast(Object.assign({
		type: type,
		message: message,
		forbidClick: true,
	}, options));
};

/**
 * 通知信息(次要)
 */
export const notify = (message, type = 'warning', options) => {
	return Notify(Object.assign({
		type: type,
		message: message,
		duration: 2000,
	}, options));
};

/**
 * 弹出提示框
 */
export const alert = (message, title, callback, options) => {
	Message(Object.assign({
		mode: 'alert', 
		title: title, 
		content: message,
	}, options)).then(callback);
};

/**
 * 弹出多个确认的提示框
 */
export const confirm = (message, title, callback, options) => {
	Message(Object.assign({
		mode: 'confirm', 
		title: title, 
		content: message,
	}, options)).then(callback);
};

/**
 * 弹出输入内容的提示框
 */
export const prompt = (message, title, callback, options) => {
	Message(Object.assign({
		mode: 'prompt', 
		title: title, 
		content: message,
	}, options)).then(callback);
};

/**
 * 清除提示框
 */
export const clearMessager = () => {
	Toast.clear(true);
	Notify.clear();
	Message.close();
};

import BaseService from 'service/base_service';
const baseService = new BaseService();
/**
 * 获取一些基础配置信息和作为第一个连接尝试
 */
export const getConfigs = async (callbacks) => {
	const config = await baseService.queryTemplate({
		singleResult: true,
	}, callbacks, {
		ajaxParams: {
			action: 'getConfigs',
		},
		errorTag: 'getConfigs',
		errorMsg: '获取基础配置信息失败',
	});
	if (! config) {
		throw new Error('获取基础配置信息失败');
	}
	return config;
};
/* 界面处理 */
/**
 * 获取DOM元素的Style
 */
export const getElementComputedStyle = (el, attr) => {
	if(! el) {
		return null;
	}
	let style;
	if(el.currentStyle) {
		style = el.currentStyle[attr];
	} else {
		style = getComputedStyle(el, false)[attr];
	}
	if(style.indexOf('px') != -1) {
		return parseInt(style.match(/\d+/)[0]);
	}
	return style;
};

/**
 * 获取DOM元素的盒子信息
 */
export const getElementRect = (el) => {
	if(! el) {
		return null;
	}
	if(el === window || el === document) {
		return {
			top: 0,
			bottom: window.innerHeight,
			left: 0,
			right: window.innerWidth,
		};
	}
	if(! el.getClientRects) {
		return null;
	}
	return el.getClientRects()[0];
};

/**
 * 获取DOM元素相对滚动容器的相对位置信息
 */
export const getElementScrollOffset = (dom) => {
	if(! dom || ! dom.offsetParent) {
		return;
	}
	const rectDom = getElementRect(dom);
	const rectParent = getElementRect(dom.offsetParent);
	if(! rectDom || ! rectParent) {
		return;
	}
	return {
		top: rectDom.top - rectParent.top,
		left: rectDom.left - rectParent.left,
	};
};

/**
 * 为元素绑定事件
 */
export const bindEvent = (dom, eventName, callback, ...args) => {
	if (dom.addEventListener) {
		dom.addEventListener(eventName, callback, ...args);
		return;
	}
	if(dom.attachEvent) {
		dom.attachEvent('on' + eventName, callback, ...args);
		return;
	}
};

/**
* 判断节点是否具备事件
*/
export const hasEvent = (node, eventName) => {
	return false;
};

/**
* 触发事件
*/
export const triggerEvent = (dom, eventName) => {
	if(Utils.isFunc(dom.fireEvent)) {
		if(! eventName.startsWith('on')) {
			eventName = 'on' + eventName;
		}
		dom.fireEvent(eventName.toLowerCase());
		return;
	}
	const event = document.createEvent('HTMLEvents');
	event.initEvent(eventName, false, true);
	dom.dispatchEvent(event);
};

/**
* 停止事件冒泡
* @param {Event Object} event 事件
*/
export const stopBubble = (event) => {
	event = event || window.event;
	event.cancelBubble && (event.cancelBubble = true);
	event.stopPropagation && event.stopPropagation();
	event.returnValue && (event.returnValue = false);
	event.preventDefault && event.preventDefault();
};

/**
 * 获取元素的全局相对位置
 */
export const globalPositionOf = (dom) => {
	let rect = getElementRect(dom);
	let scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
	let scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
	let IEOffset = !!document.all ? 2 : 0;
	return {
		left: rect.left - IEOffset + scrollLeft,
		top: rect.top - IEOffset + scrollTop,
	};
};

/**
 * 判断元素是否有css类
 */
export const hasClass = (dom, className) => {
	return dom.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
};

/**
 * 为元素添加css类
 */
export const addClass = (dom, className) => {
	if (! hasClass(ele, className)) {
		dom.className += ' ' + className;
	}
};

/**
 * 删除元素的css类
 */
export const removeClass = (dom, className)  => {
	if (hasClass(dom, className)) {
		let reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
		dom.className = dom.className.replace(reg, ' ');
	}
};

/**
 * 获取元素的样式
 */
export const style = (dom, prop) => {
    return typeof getComputedStyle !== 'undefined'
        ? getComputedStyle(dom, null).getPropertyValue(prop) 
        : dom.style[prop];
};

/**
 * 设置元素的样式
 */
export const setStyle = (dom, selector, prop, value) => {
	if(! selector) {
		dom.style[prop] = value;
		return;
	}
	const selectDoms = dom.querySelectorAll(selector);
	if(! selectDoms || ! selectDoms.length) {
		return;
	}
	for(let selectDom of selectDoms) {
		selectDom.style[prop] = value;
	}
};

/**
 * 获取元素的滚动容器
 */
export const scrollParent = (dom) => {
    if(! (dom instanceof HTMLElement)) {
        return window;
    }
    let parent = dom;
    while (parent) {
        if (parent === document.body 
            || parent === document.documentElement) {
            break;
        }
        if (! parent.parentNode) {
            break;
        }
        if (/(scroll|auto)/.test(_overflow(parent))) {
            return parent;
        }
        parent = parent.parentNode;
    }
    return window;
};

/**
 * scrollParent 内部使用: 获取指定元素的滚动样式
 */
const _overflow = (dom) =>  {
    return style(dom, 'overflow') 
        + style(dom, 'overflow-y') 
        + style(dom, 'overflow-x');
};

import { Config } from 'common/constants';
import _ from 'lodash';

/**
 * 是否是图片文件
 */
export const isImgFile = (file) => {
	if(! file || ! file.type || ! file.size) {
		return false;
	}
	if(file.size > Config.MAX_IMG_SIZE) {
		return false;
	}
	return Config.ACCEPT_IMG_TYPES.indexOf(_.toLower(file.type)) != -1;
};

/**
 * 把图片文件转为图片URL
 */
export const toImgUrl = (file) => {
	if(! isImgFile(file)) {
		return '';
	}
	return new Promise((resolve, reject) => {
		resolve(window.URL.createObjectURL(file));
	});
};

/**
 * 处理是否有上一页
 */
export const hasLastPage = (navigator, history) => {
	// 尝试回退到上一页
	if (navigator.userAgent.indexOf('MSIE') != -1 &&
		navigator.userAgent.indexOf('Opera') == -1) {
		// IE      
		if (history.length > 0) {
			return true;
		}
	}
	if (navigator.userAgent.indexOf('Firefox') != -1 ||
		navigator.userAgent.indexOf('Opera') != -1 ||
		navigator.userAgent.indexOf('Safari') != -1 ||
		navigator.userAgent.indexOf('Chrome') != -1 ||
		navigator.userAgent.indexOf('WebKit') != -1) {
		//非IE浏览器
		if (history.length > 1) {
			return true;
		}
	}
	return history.length > 1;
};

/**
 * 处理浏览器返回
 */
export const pageBack = () => {
	if(hasLastPage(window.navigator, window.history)) {
		window.history.go(-1);
		return;
	}
	// 向iframe外部发送需要关闭iframe的消息(如果是)
	notifyParentFrame('pageclose');
	// 如果没有上一页, 则关闭标签页
	if(g_clientType < 200) {
		window.close();
		return;
	}
	// 如果是APP调用api
	require('plugin/API').quitToolPageAPI();
};

/**
 * 向父级Frame发送消息
 */
export const notifyParentFrame = (data) => {
	if(window.parent && window.parent.postMessage) {
		window.parent.postMessage(data, '*');
	}
};

/**
 * 处理分享到微信
 */
export const shareToWx = async (config) => {
	if(isCurrentClient('desktop') || config.forceQrCode) { /* PC */
		if(! config.dom) {
			config.dom = genterateDefaultQrCodeDom();
		}
		const QRCode = require('qrcodejs2');
		const base64 = new (require('plugin/Base64').default)();
		let wxUrl = generateWxShareUrl({
			shareType: 'href',
			url: encodeURIComponent(base64.encode(config.url)),
			title: encodeURIComponent(base64.encode(config.title)),
			desc: encodeURIComponent(base64.encode(config.content)),
		});
		if(wxUrl.length > 50) {
			const uuid = Utils.generateTemporyId();
			const result = await submitWebShareForwardData(uuid, {
				url: config.url,
				title: config.title,
				desc: config.content,
			});
			if(! result) {
				return;
			}
			wxUrl = generateWxShareUrl({
				shareType: 'href',
				exchange: uuid,
			});
		}
		new QRCode(config.dom, {
			text: wxUrl,
			width: config.width || 320,
			height: config.height || 320,
			colorDark: config.color || '#333333', //二维码颜色
			colorLight: config.bgColor || '#ffffff', //二维码背景色
			correctLevel: QRCode.CorrectLevel.H //容错率，L/M/H
		});
		return;
	}
	if(isCurrentClient('mobile')) { /* APP */
		require('plugin/API').callAppAPI('shareToWX', {
			url: config.url,
			title: config.title,
			content: config.content,
		});
		return;
	}
	/* wx */
	window.open(generateWxShareUrl({
		shareType: 'href',
		url: encodeURIComponent(config.url),
		title: config.title,
		desc: config.content,
	}));
};

/**
 * shareToWx 内部使用: 生成默认的全局的二维码DOM
 */
const genterateDefaultQrCodeDom = () => {
	const dom = document.querySelector('.qrcode-fixed-container>.qrcode');
	if(dom) {
		dom.parentElement.style.display = 'flex';
		if(dom.querySelector('img')) {
			dom.removeChild(dom.querySelector('img'));
		}
		if(dom.querySelector('canvas')) {
			dom.removeChild(dom.querySelector('canvas'));
		}
		return dom;
	}
	// 容器
	const containerDom = document.createElement('div');
	const classAttr1 = document.createAttribute('class');
	classAttr1.value = 'qrcode-fixed-container';
	containerDom.setAttributeNode(classAttr1);
	// 二维码
	const qrCodeDom = document.createElement('div');
	const classAttr2 = document.createAttribute('class');
	classAttr2.value = 'qrcode';
	qrCodeDom.setAttributeNode(classAttr2);
	containerDom.appendChild(qrCodeDom);
	// 关闭按钮
	const closeBtnDom = document.createElement('div');
	const classAttr3 = document.createAttribute('class');
	classAttr3.value = 'closebtn';
	closeBtnDom.setAttributeNode(classAttr3);
	qrCodeDom.appendChild(closeBtnDom);
	// 关闭事件
	closeBtnDom.addEventListener('click', () => {
		containerDom.style.display = 'none';
	});
	// 追加到body下
	document.querySelector('body').appendChild(containerDom);
	return qrCodeDom;
}

/**
 * shareToWx 内部使用: 生成微信分享请求URL
 */
const generateWxShareUrl = (params) => {
	if(! window.g_wxUrl) {
		return 'https://wx.wetoband.com/gotoShare?' + Utils.toQueryStr(params);
	}
	return window.g_wxUrl + '/gotoShare?' + Utils.toQueryStr(params);
};

/**
 * shareToWx 内部使用: 生成web分享数据转发的请求地址
 */
const generateWebShareForwardUrl = (uuid) => {
	if(! window.g_webUrl) {
		return 'https://www.wetoband.com/web/qrCode/share/' + uuid; 
	}
	return window.g_webUrl + '/qrCode/share/' + uuid;
};

/**
 * shareToWx 内部使用: 提交分享数据到web的转发控制器
 */
const submitWebShareForwardData = (uuid, data) => {
	return baseService.createTemplate(null, null, {
		url: generateWebShareForwardUrl(uuid),
		ajaxParams: {
			shareData: JSON.stringify(data),
		},
		singleResult: true,
		errorTag: 'submitWebShareForwardData',
		errorMsg: '分享失败',
	});
};

/**
 * 判断当前客户端
 */
export const isCurrentClient = (type) => {
	if(type == 'wx' && navigator.userAgent.match(/(microservice)/i)) {
		return true;
	}
	if(type == 'mobile' && navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)) {
		return true;
	}
	if(type == 'desktop') {
		return true;
	}
	return false;
};

/**
 * 打开url
 */
export const openUrl = (url, replace) => {
	if(replace) {
		window.location.replace(url);
		return;
	}
	if(isCurrentClient('pc')) {
		window.open(url);
		return;
	}
	window.location.href = url;
};

/**
 * 是否是同一个部署
 */
export const isSameDeploy = (gid1, gid2) => {
	if(! gid1 || ! gid2) {
		return false;
	}
	return parseInt(gid1) % Math.pow(10, 8) - gid1
		== parseInt(gid2) % Math.pow(10, 8) - gid2;
};

/**
 * 全屏
 */
export const requestFullScreen = () => {
	//W3C
	const el = document.documentElement;
	if (el.requestFullscreen) {
		el.requestFullscreen();
		return;
	}
	//FireFox
	if (el.mozRequestFullScreen) {
		el.mozRequestFullScreen();
		return;
	}
	//Chrome等
	if (el.webkitRequestFullScreen) {
		el.webkitRequestFullScreen();
		return;
	}
	//IE11
	if (el.msRequestFullscreen) {
		el.body.msRequestFullscreen();
		return;
	}
};

/**
 * 退出全屏
 */
export const exitFullscreen = () => {
	if (document.exitFullscreen) {
		document.exitFullscreen();
		return;
	}
	if (document.msExitFullscreen) {
		document.msExitFullscreen();
		return;
	}
	if (document.mozCancelFullScreen) {
		document.mozCancelFullScreen();
		return;
	}
	if (document.webkitCancelFullScreen) {
		document.webkitCancelFullScreen();
		return;
	}
}
