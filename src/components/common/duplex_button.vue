<template>
    <div class="duplex-button"
        :class="{'duplex-button--plain':isPlain}">
        <van-button class="duplex-button__left"
            v-bind="$attrs"
            :icon="isIcon"
            :plain="isPlain"
            :ripple="false"
            :color="color"
            :size="size"
            v-on="$listeners">
            <slot></slot>
        </van-button>
        <van-button class="duplex-button__right"
            ref="rightBtn"
            icon
            :plain="isPlain"
            :ripple="false"
            :color="color"
            :size="size"
            @click="openMenu()">
            <mu-icon :value="':iconfont '+indicatorIcon"></mu-icon>
        </van-button>
        <mu-popover class="duplex-button__popover"
            :open.sync="MENU.opening" 
            :trigger="MENU.trigger"
            :placement="menuPlacement">
            <slot name="menu"
                :options="options">
                <mu-list v-if="menuItems.length"
                    dense>
                    <template v-for="menuItem in menuItems">
                        <mu-list-item button
                            :key="menuItem.id"
                            @click="clickMenuItem(menuItem)">
                            {{menuItem.label}}
                        </mu-list-item>
                        <mu-divider :key="menuItem.id"></mu-divider>
                    </template>
                </mu-list>
            </slot>
        </mu-popover>
    </div>
</template>

<script>
    import _ from 'lodash';

    const ERROR_MENU_ITEM = {
        id: -1,
        label: '（配置错误）',
        name: '_ERROR',
    };

    export default {
        name: 'duplex-button',
        props: {
            icon: {
                type: Boolean,
                default: false,
            },
            plain: {
                type: Boolean,
                default: false,
            },
            flat: {
                type: Boolean,
                default: false,
            },
            size: {
                type: String,
                default: 'normal',
            },
            color: {
                type: String,
                default: 'primary',
            },
            menuOptions: {
                type: Array,
                default: '',
            },
            optionLabel: {
                type: String,
                default: 'label',
            },
            optionKey: {
                type: String,
                default: 'name',
            },
            menuOpen: {
                type: Boolean,
                default: false,
            },
            menuPlacement: {
                type: Boolean,
                default: 'bottom',
            },
        },
        data() {
            return {
                MENU: {
                    opening: false,
                    trigger: this.$refs.rightBtn,
                },
            };
        },
        computed: {
            isPlain() {
                return this.plain ? true : false;
            },
            isIcon() {
                return this.icon ? true : false;
            },
            indicatorIcon() {
                return this.menuPlacement.indexOf('top') == -1 ? 'iconarrowdown' : 'iconarrowup';
            },
            menuItems() {
                return _.map(this.menuOptions, (option) => {
                    return this._toMenuItem(option);
                });
            },
        },
        watch: {
            'menuOpen'(newVal) {
                if(newVal) {
                    this.openMenu();
                    return;
                }
                this.closeMenu();
            },
            'MENU.opening'(newVal) {
                this.$nextTick(() => {
                    if(this.menuOpen === newVal) {
                        return;
                    }
                    this.$emit('update:menuOpen', newVal);
                });
            },
        },
        methods: {
            openMenu() {
                this.MENU.opening = true;
                this.MENU.trigger = this.$refs.rightBtn;
                this.$emit('menu-open', this.$refs.rightBtn);
            },
            _toMenuItem() {
                if(_.isPlainObject(option)) {
                    return {
                        id: _.uniqueId(),
                        label: option[this.optionLabel] || ERROR_MENU_ITEM.label,
                        name: option[this.optionName] || ERROR_MENU_ITEM.name,
                    };
                }
                if(_.isArray(option)) {
                    return {
                        id: _.uniqueId(),
                        label: option[1] || ERROR_MENU_ITEM.label,
                        name: option[0] || ERROR_MENU_ITEM.name,
                    };
                }
                if(! _.isString(option)) {
                    return ERROR_MENU_ITEM;
                }
                if(option.indexOf(':') != -1) {
                    const pieces = _.split(option);
                    return {
                        id: _.uniqueId(),
                        label: pieces[0],
                        name: pieces[1],
                    };
                }
                return {
                    id: _.uniqueId(),
                    label: option,
                    name: option,
                };
            },
            clickMenuItem(menuItem) {
                this.$emit('menu-click', menuItem.name);
            },
            closeMenu() {
                this.MENU.opening = false;
                this.$emit('menu-close', this.$refs.rightBtn);
            },
        },
        mounted() {

        },
    }
</script>

<style lang="scss">
    @import 'style/mixin';

    .duplex-button {
        width: auto;
        display: flex;
        align-items: center;
        .van-button {
            width: auto;
            min-width: auto;
            max-width: px2rem(120px); 
            margin: 0;
            padding: 0;
            box-shadow: none;
            font-size: px2rem(13px);
        }
        .duplex-button__left {
            overflow: hidden;
            min-width: px2rem(52px);
            padding: 0 px2rem(12px);
            border-right: 0;
            @include border-radius(2px 0 0 2px);
            .van-button__text {
                overflow: hidden;
                text-overflow: ellipsis;
                word-break: keep-all;
            }
        }
        .duplex-button__right {
            overflow: hidden;
            width: px2rem(24px);
            @include border-radius(0 2px 2px 0);
            .mu-icon {
                font-size: px2rem(14px);
            }
        }
        @at-root .duplex-button__popover {
            border-radius: px2rem(8px);
            padding: px2rem(8px) 0;
        }
    }
</style>