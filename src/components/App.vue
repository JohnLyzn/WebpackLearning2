<template>
	<div class="main-container"
		data-content-max
		v-resize="adjustBasicSize">
		<div class="main-body-wrapper">
			<transition name="router-fade" mode="out-in">
				<keep-alive>
					<router-view v-if="$route.meta.keepAlive"></router-view>
				</keep-alive>
			</transition>
			<transition name="router-fade" mode="out-in">
				<router-view v-if="!$route.meta.keepAlive"></router-view>
			</transition>
		</div>
	</div>
</template>
<script>
	import Vue from 'vue';
	import { mapMutations } from 'vuex';
	import { pageBack } from 'common/env';
	import { installVantUI, installMoment } from 'common/shim';

	import 'style/reset';
	import 'style/common';

	// import theme from 'muse-ui/lib/theme';
	// theme.add('teal', {
	// 	primary: '#FF8900',
	// 	info: '#FF8900',
	// }, 'light');
	// theme.use('teal');

	import 'muse-ui/lib/styles/base.less';
	import {
		AppBar,
		Avatar,
		Badge,
		Button,
		BottomSheet,
		Breadcrumbs,
		Checkbox,
		DateInput,
		Dialog,
		Divider,
		Drawer,
		ExpansionPanel,
		Menu,
		Grid,
		Helpers,
		Icon,
		List,
		LoadMore,
		Paper,
		Popover,
		Progress,
		SubHeader,
		TextField,
		Tooltip,
	} from 'muse-ui';

	Vue.use(AppBar);
	Vue.use(Avatar);
	Vue.use(Badge);
	Vue.use(Button);
	Vue.use(BottomSheet);
	Vue.use(Breadcrumbs);
	Vue.use(Checkbox);
	Vue.use(DateInput);
	Vue.use(Dialog);
	Vue.use(Divider);
	Vue.use(Drawer);
	Vue.use(ExpansionPanel);
	Vue.use(Menu);
	Vue.use(Grid);
	Vue.use(Helpers);
	Vue.use(Icon);
	Vue.use(List);
	Vue.use(LoadMore);
	Vue.use(Paper);
	Vue.use(Popover);
	Vue.use(Progress);
	Vue.use(SubHeader);
	Vue.use(TextField);
	Vue.use(Tooltip);
	import 'muse-ui/lib/styles/theme.less';

	import 'muse-ui-loading/dist/muse-ui-loading.css';
	import Loading from 'muse-ui-loading';
	Vue.use(Loading);

	// import 'muse-ui-progress/dist/muse-ui-progress.css';
	// import NProgress from 'muse-ui-progress';
	// Vue.use(NProgress);

	import 'style/muse-ui-variables';

	import '@vant/touch-emulator';
	installVantUI(Vue, [
		'Cell', 'CellGroup', 'Button', 'Search', 'Form', 'Field', 'Tag',
		'Grid', 'GridItem', 'Swipe', 'SwipeItem', 'Tab', 'Tabs', 'PullRefresh',
		'Sticky', 'Empty', 'Skeleton', 'Loading', 'Circle', 'Progress', 'Image',
		'DropdownMenu', 'DropdownItem', 'Collapse', 'CollapseItem', 'NoticeBar',
		'NavBar', 'TreeSelect', 'RadioGroup', 'Radio', 'IndexBar', 'IndexAnchor',
		'ImagePreview', 'Lazyload', 'Popup',
	]);
	import 'vant/lib/index.less';
	import 'vant/lib/icon/local.css';
	import 'style/vant-ui-variables';

	import 'style/iconfont/iconfont.css';
	import 'style/icon-font-variables';
	
	import VueBack from 'plugin/VueBack';
	Vue.use(VueBack);

	import moment from 'moment';
	installMoment(moment);

  	export default {
    	data() {
            return {

            };
		},
		methods: {
			...mapMutations([
				'BIND_CURRENT'
			]),
			back() {
				pageBack();
			},
			/* 配合mixin中的rem+vw布局处理使用 */
			adjustBasicSize() {
				// 获取基准值
				const html = document.querySelector('html');
				const content = JSON.parse(window.getComputedStyle(html).getPropertyValue('content')); 
				if(! content) {
					return;
				}
				const config = JSON.parse(content);
				const designWidth = parseFloat(config.design);
				const maxWidth = parseFloat(config.max);
				// 超出最大值的情况下不做处理
				if(window.innerWidth > maxWidth) {
					html.style.fontSize = '';
					return;
				}
				// 计算设计稿宽度相对当前窗口宽度的比例
				// font-size按该比例缩放即可达到设计稿大小
				const radio = designWidth / window.innerWidth;
				// 记录初始生成的font-size, 后面都用它来计算动态值
				if(! html.$basicFontSizeVW) {
					const fontSize = window.getComputedStyle(html).getPropertyValue('font-size');
					html.$basicFontSizeVW = window.innerWidth / parseFloat(fontSize); 
				}
				// 一定要vw单位才能动态变化
				html.style.fontSize = html.$basicFontSizeVW * radio + 'vw';
			},
		},
		created() {
			this.$inject.initWith(this);
			this.$$context = this.$inject.to(this, 'APP_ENTRANCE');
		},
  	}
</script>
<style lang="scss">
	@import 'style/mixin';

	.router-fade-enter-active, .router-fade-leave-active {
	  	transition: opacity .3s;
	}
	.router-fade-enter, .router-fade-leave-active {
	  	opacity: 0;
	}
	.main-container {
		@include root-font-size();
		width: 100%;
		max-width: 100vw;
		min-height: 100vh;
		position: relative;
		margin: 0 auto;
		background: $bgc_main;
		font-size: px2rem($fs_main);
		font-family: $font_family;
		.main-header {
			width: 100%;
			max-width: 100vw;
			height: px2rem(64px);
			&.fixed {
				position: fixed;
			}
			cite {
				font-size: px2rem(14px);
			}
		}
		.main-body-wrapper {
			width: 100%;
			max-width: 100vw;
			.main-body {
				width: 100%;
				max-width: 100vw;
				position: relative;
				&.full-height {
					height: 100%;
					min-height: 100vh;
				}
			}
		}
		.main-header.fixed~.main-body,
		.main-header.fixed~.container {
			padding-top: px2rem(72px) !important;
		}
	}
</style>
