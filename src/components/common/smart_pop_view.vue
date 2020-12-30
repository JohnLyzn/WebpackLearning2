<template>
    <mu-popover class="smart-pop-view"
        :class="{
            'smart-pop-view--follow': isFollow,
            'smart-pop-view--replace': isReplace,
            'smart-pop-view--center': isCenter,
        }"
        :open.sync="opening"
        v-bind="$attrs"
        :placement="position"
        :trigger="triggerInner"
        :z-depth="isFollow?1:undefined">
        <div v-show="title"
            class="smart-pop-view__header">
            {{title}}
        </div>
        <div class="smart-pop-view__body">
            <slot name="default"></slot>
        </div>
    </mu-popover>
</template>

<script>
    import _ from 'lodash';

    export default {
        name: 'smart-pop-view',
        props: {
            open: {
                type: Boolean,
                default: false,
            },
            title: {
                type: String,
                default: '',
            },
            placement: {
                type: String,
                default: 'CENTER',
            },
            position: {
                type: String,
                default: 'bottom-start',
            },
            trigger: {
                type: Object,
                default: '',
            },
            focusing: {
                type: Object,
                default: '',
            },
        },
        data() {
            return {
                opening: false,
                triggerInner: '',
                placementInner: '',
            };
        },
        computed: {
            isCenter() {
                return this.placementInner === 'CENTER';
            },
            isReplace() {
                return this.placementInner === 'REPLACE';
            },
            isFollow() {
                return this.placementInner === 'FOLLOW';
            },
        },
        watch: {
            'open'(newVal) {
                this.$nextTick(() => {
                    if(this.opening === newVal) {
                        return;
                    }
                    this.opening = newVal;
                });
            },
            'opening'(newVal) {
                this.$emit('update:open', newVal);
            },
            'placement'(newVal) {
                if(! newVal) {
                    return;
                }
                this.placementInner = newVal;
                this.moveToContainer(this.trigger);
            },
            'trigger'(newVal) {
                if(! newVal) {
                    return;
                }
                this.moveToContainer(newVal);
            },
        },
        methods: {
            openView() {
                if(this.opening) {
                    return;
                }
                this.opening = true;
                this.$emit('open');
            },
            closeView() {
                if(! this.opening) {
                    return;
                }
                this.opening = false;
                this.$emit('close');
            },
            moveToContainer(trigger) {
                if(! trigger) {
                    return;
                }
                this.triggerInner = '';
                if(this.isCenter) {
                    document.body.appendChild(this.$el);
                    return;
                }
                if(this.isReplace) {
                    trigger.parentElement.appendChild(this.$el);
                    return;
                }
                if(this.isFollow) {
                    this.triggerInner = trigger;
                    trigger.parentElement.appendChild(this.$el);
                    return;
                }
            },
        },
    }
</script>

<style lang="scss">
    @import 'style/mixin';

    .smart-pop-view {
        min-width: px2rem(200px);
        min-height: px2rem(120px);
        border-radius: px2rem(8px);
        overflow: hidden;
        .van-popup__close-icon {
            top: px2rem(4px);
            left: px2rem(8px);
        }
        &.smart-pop-view--replace {
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
        }
        &.smart-pop-view--center {
            top: 50% !important;
            left: 50% !important;
            transform: translate3d(-50%, -50%, 0) !important;
        }
        &.smart-pop-view--follow {
            // width: px2rem(260px);
            height: px2rem(180px);
            box-shadow: px2rem(1px) px2rem(1px) px2rem(5px) #ddd;
            border: px2rem(1px) solid #ddd;
            .smart-pop-view__body {
                height: px2rem(180px);
                overflow: hidden;
            }
        }
    }
    .smart-pop-view__header {
        width: 100%;
        height: px2rem(32px);
        line-height: px2rem(28px);
        text-align: center;
    }
    .smart-pop-view__body {
        width: 100%;
        height: auto;
    }
</style>