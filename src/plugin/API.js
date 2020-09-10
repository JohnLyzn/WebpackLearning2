//try {
//	document.domain = 'wetoband.com';
//} catch (e) {
//	console.log(e);
//}
var appAPI = {
	fire:function(webview, eventName, param){
		var action = 'var APIReadyEvent = new CustomEvent("' + eventName + '", {detail:' + JSON.stringify(param) + '});';
		action += 'window.dispatchEvent(APIReadyEvent);';
		webview.evalJS(action);
	}	
};

if(window.top.plus){
	window.plus = window.top.plus;
	var APIReadyEvent = new Event('APIReady', {});
	document.dispatchEvent(APIReadyEvent);
}else if(window.parent.plus){
	window.plus = window.parent.plus;
	var APIReadyEvent = new Event('APIReady', {});
	document.dispatchEvent(APIReadyEvent);	
}else{
	if (window.plus) {
		var APIReadyEvent = new Event('APIReady', {});
		document.dispatchEvent(APIReadyEvent);
	} else {
		document.addEventListener("plusready", function() {
			var APIReadyEvent = new Event('APIReady', {});
			document.dispatchEvent(APIReadyEvent);
		}, false);
	}
}

/**
 * 调用app上的方法
 * @param {Object} name app上的事件名称
 * @param {Object} args 传给app上的方法的参数
 * @param {Object} callBackEventName 执行完app上的方法后通知此工具的事件的名称， 可为空
 * @param {Object} fireWebviewID 要通知的webview的id，可为空，为空时默认通知的是index
 */
export function callAppAPI(name, args, callBackEventName, fireWebviewID) {
	if(!window.plus){
		alert("无法获取Plus");
		return;
	}
	if(window.plus.wtbAppAPIPlugin){
		try{
			window.plus.wtbAppAPIPlugin.callApi(name,args);
		}catch(e){
			alert(e);
		}
	}else{
		var webView = null;
		if(fireWebviewID != undefined && fireWebviewID != null){
			webView = plus.webview.getWebviewById(fireWebviewID);
		}else{
			webView = plus.webview.getWebviewById('index');
		}
		if(webView == null || webView == undefined){
			webView = plus.webview.getLaunchWebview();
		}
		var currentWebviewID = plus.webview.currentWebview().id;
		appAPI.fire(webView,'api:callAPI',{
			name: name, 
			args: args, 
			callBackEventName: callBackEventName, 
			toolWebviewID: currentWebviewID
		});
	}
};

export function quitToolPageAPI() {
	var toolPageview = plus.webview.currentWebview().parent();
	toolPageview.canBack(function(e){
		if (e.canBack) {
			toolPageview.back();
		} else{
			if (toolPageview == null || toolPageview == undefined) {
				plus.webview.currentWebview().close();
			} else {
				plus.webview.currentWebview().parent().close();
			}
		}
	});
}
