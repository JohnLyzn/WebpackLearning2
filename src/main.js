import '@babel/polyfill';
import FastClick from 'fastclick';
import Vue from 'vue';
import VueRouter from 'vue-router';
import { mapMutations } from 'vuex'

import { getRunToolParam,getClientType,getConfigs } from 'common/env';
import { Config } from 'common/constants';
import routes from 'router/router';
import store from './store';

import { wrapVue } from './inject';

// 添加FastClick处理
if ('addEventListener' in document) {
    document.addEventListener('DOMContentLoaded', function() {
        FastClick.attach(document.body);
    }, false);
}
// 注册SPA的Vue路由
Vue.use(VueRouter);

/* 根据平台选择类型 */

/* 创建路由 */
const router = new VueRouter({
	routes,
	mode: Config.ROUTER_MODE,
	strict: process.env.NODE_ENV !== 'production',
	scrollBehavior(to, from, savedPosition) {
	    if (savedPosition) {
		    return savedPosition
		} else {
			if (from.meta.keepAlive) {
				from.meta.savedPosition = document.body.scrollTop;
			}
		    return { x: 0, y: to.meta.savedPosition || 0 }
		}
	}
});
/* 初始化注入模块 */
wrapVue(Vue);
/* 创建根组件 */
new Vue({
	router,
	store,
	methods: {
		...mapMutations(['BIND_CURRENT', 'BIND_DEVICE']),
	},
	mounted() {
		window.g_treUrl = null;
		window.g_webUrl = null;
		window.g_wxUrl = null;
		window.g_refVisitToolID = null;
		window.g_currentUserId = null;
		window.g_currentUserName = null;
		window.g_serverTime = null;
		/* 解析工具运行参数 */
		const runToolParam = getRunToolParam() || '';
		if(/^\{.*\}$/.test(runToolParam)) {
			const runToolParamJson = JSON.parse(runToolParam);
		} else if(/^\d+$/.test(runToolParam)) {

		}
		/* 路由控制 */
		this.$router.push({ path: '/home'});//跳转到该路由
		// this.$router.go(-1);//后退
		/* 获取基础信息 */
		getConfigs({
			onSuccess: (config) => {
				window.g_treUrl = config.treUrl;
				window.g_webUrl = config.webUrl;
				window.g_wxUrl = config.wxUrl;
				window.g_refVisitToolID = config.refVisitToolID;
				window.g_currentUserId = config.userID;
				window.g_currentUserName = config.userName;
				this.BIND_CURRENT(config);
			},
		});
	},
}).$mount('#app');
