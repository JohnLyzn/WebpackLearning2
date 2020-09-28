<template>
    <div class="editable-label"
        v-click-outside="doneInput">
        <div v-show="!INPUT.enable"
            class="editable-label__content">
            <slot>
                {{value}}
                <slot name="append"></slot>
            </slot>
            <span class="editable-label__edit-btn">
                <mu-icon value=":iconfont iconedit"></mu-icon>
            </span>
        </div>
        <div v-if="INPUT.enable"
            class="editable-label__input">
            <van-field v-model="INPUT.content" />
        </div>
    </div>
</template>

<script>

    export default {
        name: 'editable-label',
        props: {
            value: {
                type: String,
                default: '',
            },
            placeholder: {
                type: String,
                default: '',
            },
        },
        data() {
            return {
                INPUT: {
                    enable: false,
                    content: '',
                },
            };
        },
        methods: {
            startInput() {
                this.INPUT.enable = true;
            },
            doneInput() {
                this.INPUT.enable = false;
            },
        },
    }
</script>

<style lang="scss">
     @import 'style/mixin';

    .editable-label {
        width: 100%;
        height: 100%;
        display: block;
    }
    .editable-label__content {
        
        
    }
    .editable-label__edit-btn {
        position: relative;
        margin-left: px2rem(8px);
        .mu-icon {
            top: 0;
            left: 0;
            position: absolute;
            cursor: pointer;
        }
    }
</style>