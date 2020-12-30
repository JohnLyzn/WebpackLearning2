<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
    <div class="adaptable-avatar"
        :class="{
            'adaptable-avatar--square':square,
            'adaptable-avatar--full':full,
        }">
        <mu-avatar ref="avatar"
            :color="bgColorComputed"
            :text-color="textColorComputed"
            :size="size">
            <slot>
                <!--<span v-if="text"
                    :style="{'font-weight':textFontWeightComputed}">
                    {{text}}
                </span>-->
                <van-image v-if="url"
                    lazy-load
                    fit="contain"
                    :src="url">
                    <template v-slot:error>
                        <span :style="{'font-weight':textFontWeightComputed,
                                        'color': textColorComputed }">
                            {{text ? text.substr(0,1) : '空'}}
                        </span>
                    </template>
                </van-image>
                <mu-icon v-else-if="icon"
                    :value="icon"
                    :color="iconColorComputed"
                    :size="iconSizeComputed">
                </mu-icon>
            </slot>
        </mu-avatar>
    </div>
</template>

<script>
    import Utils from 'common/utils';
    import RandomColor from 'plugin/RandomColor';

    const RANDOM_COLOR = new RandomColor(Math.random());

    export default {
        name: 'adaptable-avatar',
        props: {
            square: {
                type: Boolean,
                default: false,
            },
            full: {
                type: Boolean,
                default: false,
            },
            size: {
                type: Number,
                default: 36,
            },
            color: {
                type: String,
                default: '',
            },
            url: {
                type: String,
                default: '',
            },
            icon: {
                type: String,
                default: ':iconfont iconuser',
            },
            iconSize: {
                type: Number,
                default: 0,
            },
            iconColor: {
                type: String,
                default: 'white',
            },
            text: {
                type: String,
                default: '',
            },
            textSize: {
                type: Number,
                default: 0,
            },
            textColor: {
                type: String,
                default: 'white',
            },
        },
        data() {
            return {

            };
        },
        computed: {
            textSizeComputed() {
                if(this.textSize) {
                    return this.textSize;
                }
                return this.size / 2;
            },
            iconSizeComputed() {
                if(this.iconSize) {
                    return this.iconSize;
                }
                return this.size * 0.6;
            },
            bgColorComputed() {
                if(this.color && this.color !== 'random') {
                    return this.color;
                }
                return RANDOM_COLOR.get();
            },
            iconColorComputed() {
                if(this.iconColor && this.iconColor !== 'random') {
                    return this.iconColor;
                }
                return RANDOM_COLOR.get();
            },
            textColorComputed() {
                if(this.textColor && this.textColor !== 'random') {
                    return this.textColor;
                }
                return RANDOM_COLOR.get();
            },
            textFontWeightComputed() {
                if(! this.text || this.text.length < 4) {
                    return 'initial';
                }
                return 'bold';
            },
        },
        watch: {
            'icon'(newVal) {
                if(! newVal) {
                    return;
                }
                this._setSize();
            },
            'text'(newVal) {
                if(! newVal) {
                    return;
                }
                this._setSize();
            },
        },
        methods: {
            _setSize() {
                if(! window.getComputedStyle
                    || ! this.$refs.avatar) {
                    return;
                }
                // 通过在css文件设置的content属性得到一个px转rem的基准值(10px的)
                const content = JSON.parse(window.getComputedStyle(this.$el).getPropertyValue('content'));
                if(! content) {
                    return;
                }
                // 解析出css中的content属性, 它是rem布局计算10px得到的值
                const number = parseFloat(content);
                const unit = content.replace(/[\"\.\d]+/g, '');
                // 设置头像元素的宽高行号字号以替换原来的固定值
                const avatarStyle = this.$refs.avatar.$el.style;
                const computedAvatarSize = (number * this.size / 10) + unit;
                avatarStyle.width = computedAvatarSize;
                avatarStyle.height = computedAvatarSize;
                avatarStyle.lineHeight = '1.5';
                if(this.text) {
                    const fontSize = (number * this.$el.clientWidth / this.text.length / 10) + unit;
                    avatarStyle.fontSize = fontSize;
                    return
                }
                avatarStyle.fontSize = (number * this.textSizeComputed / 10) + unit;
                // 如果有, 设置图标元素的宽高行号字号以替换原来的固定值
                const iconDom = this.$refs.avatar.$el.querySelector('.mu-icon');
                if(! iconDom) {
                    return;
                }
                const iconStyle = iconDom.style;
                const computedIconSize = (number * this.iconSizeComputed / 10) + unit;
                iconStyle.width = computedIconSize;
                iconStyle.height = computedIconSize;
                iconStyle.lineHeight = computedIconSize;
                iconStyle.fontSize = computedIconSize;
            },
        },
        mounted() {
            this.$nextTick(() => {
                this._setSize();
            });
        },
    }
</script>

<style lang="scss">
    @import 'style/mixin';

    .adaptable-avatar {
        width: auto;
        height: auto;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        content: '#{px2rem(10px)}';
        .mu-avatar {
            overflow: hidden;
        }
        .van-image {
            width: 100%;
            height: 100%;
            img {
                border-radius: initial;
            }

            .van-image__error{
                background-color: transparent;

                span{
                    font-weight: 600 !important;
                    font-size: px2rem(24);
                }
            }
        }
        &.adaptable-avatar--square {
            overflow: hidden;
            .mu-avatar {
                border-radius: initial;
            }
        }
        &.adaptable-avatar--full {
            width: 100%;
            height: 100%;
            padding: px2rem(8px);
            .mu-avatar {
                width: 100% !important;
                height: 100% !important;
                background: none !important;
                border-radius: initial;
                img {
                    border-radius: initial;
                }
            }
        }
    }
</style>
