<template>
    <div class="tab-list">
        <div class="tab-list__tab">
            <div class="tab-list__tab-item tab-list__tab-item--default"
                :class="{
                    'tab-list__tab-item--active':!activeTabItem
                }"
                @click="pickTabItem()">
                <span class="tab-list__group-tab">
                    所有
                </span>
            </div>
            <div v-for="tab in displayingTabs"
                class="tab-list__tab-item"
                :class="{
                    'tab-list__tab-item--active':activeTabItem===tab
                }"
                :key="tab.id"
                :style="{'background':tab.color}"
                @click="pickTabItem(tab)">
                <span class="tab-list__group-tab">
                    {{tab.name}}
                </span>
            </div>
        </div>
        <div class="tab-list__list">
            <div v-show="!LIST.rows.length"
                class="tab-list__list-empty">
                {{emptyTip}}
            </div>
            <div v-for="item in displayingList"
                v-show="!activeTabItem||activeTabItem.id==item.belongTabId"
                class="tab-list__list-item"
                :class="{
                    'tab-list__list-item--simple':isSimple,
                    'tab-list__list-item--active':activeListItem===item,
                    'tab-list__list-item--hover':!isSimple&&item===expandingListItem
                }"
                :key="item.id"
                @mouseenter="expandingListItem=item"
                @mouseleave="expandingListItem=''"
                @click="pickListItem(item)">
                <mu-flex align-items="center"
                    justify-content="between">
                    <span v-show="!activeTabItem"
                        class="tab-list__group-indicator"
                        :style="{'background':getTabItem(item).color}">
                    </span>
                    <mu-flex fill
                        align-items="center">
                        <slot name="item">
                            <span class="tab-list__group-label"
                                :class="{
                                    'van-ellipsis':item!==expandingListItem,
                                }">
                                {{item.name}}
                            </span>
                        </slot>
                    </mu-flex>
                    <mu-button v-if="isCloseable&&!isSimple"
                        v-show="item===expandingListItem"
                        icon
                        small
                        @click.stop="closeListItem(item)">
                        <mu-icon value=":iconfont iconclose">
                        </mu-icon>
                    </mu-button>
                </mu-flex>
            </div>
        </div>
    </div>
</template>

<script>
    import Utils from 'common/utils';

    export default {
        name: 'tab-list',
        props: {
            value: {
                type: Object,
                default: '',
            },
            emptyTip: {
                type: String,
                default: '暂无内容',
            },
            list: {
                type: Array,
                default: '',
            },
            tabBy: {
                type: String,
                default: '',
            },
            tabSrcList: {
                type: Array,
                default: '',
            },
            simple: {
                type: Boolean,
                default: false,
            },
            closeable: {
                type: Boolean,
                default: false,
            },
        },
        data() {
            return {
                activeTabItem: '',
                activeListItem: '',
                expandingListItem: '',
                LIST: {
                    rows: '',
                    rowMap: {},
                },
                TAB: {
                    parentMap: {},
                    rowMap: {},
                },
            };
        },
        computed: {
            isSimple() {
                return this.simple ? true : false;
            },
            isCloseable() {
                return this.closeable ? true : false;
            },
            displayingTabs() {
                let result = [];
                for(let listItem of this.LIST.rows) {
                    const tab = this.getTabItem(listItem);
                    if(! tab || result.indexOf(tab) != -1) {
                        continue;
                    }
                    result.push(tab);
                }
                return result;
            },
            displayingList() {
                if(! this.activeTabItem) {
                    return this.LIST.rows;
                }
                const result = [];
                for(let listItem of this.LIST.rows) {
                    if(listItem.belongTabId == this.activeTabItem.id) {
                        result.push(listItem);
                    }
                }
                return result;
            },
        },
        watch: {
            'list'(newVal) {
                this.mergeListItems(newVal);
            },
            'tabSrcList'(newVal) {
                this.mergeTabItems(newVal);
            },
            'value'(newVal) {
                if(! newVal) {
                    this.activeListItem = '';
                    return;
                }
                const listItem = this.LIST.rowMap[newVal.id];
                if(! listItem) {
                    return;
                }
                this.activeListItem = listItem;
            },
        },
        methods: {
            _toTabBy(listItem) {
                if(! this.tabBy) {
                    return listItem;
                }
                if(Utils.isFunc(this.tabBy)) {
                    return this.tabBy(listItem);
                }
                if(Utils.isString(this.tabBy)) {
                    return listItem[this.tabBy] || '';
                }
                return listItem;
            },
            _toItem(item, mapping) {
                if(! item) {
                    return '';
                }
                if(item._isTabListItem) {
                    return item;
                }
                const id = this._getId(item);
                if(mapping && mapping[id]) {
                    return mapping[id];
                }
                return {
                    _isTabListItem: true,
                    id: id,
                    name: this._getName(item, mapping),
                    src: item,
                };
            },
            _getId(item) {
                if(! item) {
                    return Utils.generateTemporyId();
                }
                if(! Utils.isObject(item)) {
                    return item.toString();
                }
                if(item.id) {
                    return item.id;
                }
                return Utils.generateTemporyId();
            },
            _getName(item, mapping) {
                if(! item) {
                    return '';
                }
                if(Utils.isObject(item)) {
                    return item.name;
                }
                return mapping ? mapping[item.toString()] : item.toString();
            },
            _getColor(item) {
                const letters = Math.abs(Utils.hashCode(item.name)) + '';
                let color = '#';
                for (let i = 0; i < 6; i ++) {
                    color += letters[i > letters.length ? 5 : i];
                }
                return color;
            },
            mergeTabItems(items) {
                if(! items || ! items.length) {
                    return;
                }
                for(let item of items) {
                    const processedItem = this._toItem(item);
                    if(! processedItem) {
                        continue;
                    }
                    this.TAB.rowMap[processedItem.id] = processedItem;
                }
            },
            mergeListItems(items) {
                if(! items || ! items.length) {
                    return;
                }
                this.LIST.rows = [];
                for(let item of items) {
                    const processedItem = this._toItem(item, this.LIST.rowMap);
                    if(! processedItem) {
                        continue;
                    }
                    this.LIST.rows.push(processedItem);
                    this.LIST.rowMap[processedItem.id] = processedItem;
                }
            },
            getTabItem(listItem) {
                const tabItemSrc = this._toTabBy(listItem.src);
                if(! tabItemSrc) {
                    return '';
                }
                const tabId = this._getId(tabItemSrc);
                const existed = this.TAB.rowMap[tabId];
                if(existed) {
                    listItem.belongTabId = existed.id;
                    return existed;
                }
                const tabItem = this._toItem(tabItemSrc);
                if(! tabItem) {
                    return '';
                }
                tabItem.color = this._getColor(tabItem);
                listItem.belongTabId = tabItem.id;
                this.TAB.rowMap[tabId] = tabItem; 
                return tabItem;
            },
            pickTabItem(item) {
                this.activeTabItem = item || '';
            },
            pickListItem(item) {
                this.activeListItem = item || '';
                this.$emit('input', item.src);
                this.$emit('pick', item.src);
            },
            closeListItem(item) {
                if(! this.isCloseable) {
                    return;
                }
                // 从源数组中删除元素
                const index1 = this.list.indexOf(item.src);
                if(index1 == -1) {
                    return;
                }
                this.list.splice(index1, 1);
                this.$emit('update:list', this.list);
                // 删除显示数组中的项
                const index2 = this.LIST.rows.indexOf(item);
                this.LIST.rows.splice(index2, 1);
                // 取消正在查看
                this.expandingListItem = '';
                // 通知外部对象关闭
                this.$emit('close', item.src, ! this.LIST.rows.length);
            },
        },
        mounted() {
            this.mergeListItems(this.list);
            this.mergeTabItems(this.tabSrcList);
        },
    };
</script>

<style lang="scss">
    @import 'style/mixin';

    .tab-list {
        display: flex;
        width: 100%;
        height: 100%;
        overflow: hidden;
        .tab-list__tab {
            flex-shrink: 0;
            max-height: 100%;
            overflow: auto;
            &::-webkit-scrollbar {  
                width: 0;  
            }  
        }
        .tab-list__tab-item {
            width: px2rem(24px);
            padding: px2rem(4px);
            margin-bottom: px2rem(16px);
            border-radius: px2rem(2px) px2rem(2px) 0 0;
            opacity: .4;
            cursor: pointer;
            position: relative;
            font-size: px2rem(12px);
            text-align: center;
            &:hover {
                opacity: 1;
            }
            &:after {
                width: 100%;
                height: px2rem(16px);
                background: inherit;
                position: absolute;
                left: 0;
                bottom: px2rem(-16px);
                content: '';
                clip-path: polygon(100% 0, 100% 100%, 0% 80%, 0 0);
                -webkit-clip-path: polygon(100% 0, 100% 100%, 0% 0%, 0 0);
            }
            &.tab-list__tab-item--default {
                background: $theme;
            }
            &.tab-list__tab-item--active {
                opacity: 1;
            }
        }
        .tab-list__group-tab {
            width: 100%;
            overflow: hidden;
        }
        .tab-list__list {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow: auto;
            &::-webkit-scrollbar {  
                width: px2rem(4px);  
            }
        }
        .tab-list__list-empty {
            padding: px2rem(8px);
            text-align: center;
        }
        .tab-list__list-item {
            width: 100%;
            height: px2rem(48px);
            margin: px2rem(4px) 0;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            font-size: px2rem(14px);
            position: relative;
            flex-shrink: 0;
            .flex-row {
                width: 100%;
                height: 100%;
                flex: 1 1 auto;
                overflow: hidden;
            }
            &.tab-list__list-item--simple {

            }
            &:hover,
            &.tab-list__list-item--active {
                background: rgba(white, .3);
            }
            &.tab-list__list-item--hover {
                height: auto;
                min-height: px2rem(48px);
                padding-right: px2rem(6px);
                display: flex;
                flex-direction: column;
                .mu-button {
                    width: px2rem(12px);
                    height: px2rem(12px);
                    position: absolute;
                    right: 0;
                }
                .mu-icon {
                    font-size: px2rem(12px);
                }
            }
        }
        .tab-list__group-label {
            width: 100%;
            overflow: hidden;
            display: inline-block;
            padding: 0 px2rem(4px) 0 px2rem(8px);
            line-height: px2rem(24px);
        }
        .tab-list__group-indicator {
            width: px2rem(4px);
            height: 100%;
        }
    }
</style>