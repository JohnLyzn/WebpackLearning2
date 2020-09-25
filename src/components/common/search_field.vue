<template>
    <form class="search-field"
        :class="{
            'search-field--medium': medium,
            'search-field--small': small,
        }"
        action="/">
        <van-search v-model="searchValue"
            v-bind="$attrs"
            ref="input"
            show-action
            placeholder="请输入搜索关键词"
            @search="search"
            @cancel="reset">
            <template #action>
                <mu-button flat
                    small 
                    @click="search">
                    搜索
                </mu-button>
            </template>
        </van-search>
    </form>
</template>
<script>
    export default {
        name: 'search-field',
        props: {
            value: {
                type: String,
                default: '',
            },
            medium: {
                type: Boolean,
                default: false,
            },
            small: {
                type: Boolean,
                default: false,
            },
        },
        data() { 
            return {
                lastSearchValue: '',
                searchValue: '',
                isSearching: false,
                isFocused: false,
                timer: '',
            };
        },
        watch: {
            'searchValue'(newValue, oldValue) {
                /* 由非空转空时自动触发一次搜索, 同时重置搜索 */
                if(! this.isSameAsLastSearch && ! newValue && oldValue) {
                    this._endSearching();
                    this.$nextTick(() => {
                        this.$emit('input', '');
                        this.search();
                    });
                    return;
                }
                if(this.timer) {
                    clearTimeout(this.timer);
                }
                this.timer = setTimeout(() => {
                    this.$emit('input', newValue);
                }, 500);
            },
            'value'(newValue, oldValue) {
                this.searchValue = newValue;
            }
        },
        computed: {
            isSameAsLastSearch() {
                return this.lastSearchValue == this.searchValue;
            },
        },
        methods: {
            _startSearching() {
                this.isSearching = true;
            },
            _endSearching() {
                this.isSearching = false;
            },
            search() {
                if(! this.searchValue && this.isSameAsLastSearch) {
                    return;
                }
                this.lastSearchValue = this.searchValue;
                this._startSearching();
                this.$emit('search', this._endSearching.bind(this), this.searchValue);
            },
            getSearchValue() {
                return this.searchValue;
            },
            reset() {
                this.searchValue = '';
            },
        },
        mounted() {
            this.searchValue = this.value;
        }
    } 
</script>
<style lang="scss">
    @import 'style/mixin';

    .search-field {
        width: 100%;
        height: px2rem(48px);
        min-height: px2rem(48px);
        line-height: px2rem(48px);
        border-radius: px2rem(4px);
        overflow: hidden;
        .van-search {
            padding: px2rem(7px) 0 px2rem(7px) px2rem(8px);
        }
        .van-search__action {
           font-size: px2rem(14px);
        }
        .van-cell__value {
            width: 100%;
        }
        .mu-flat-button {
            min-width: px2rem(32px);
        }
        &.search-field--medium {
            height: px2rem(36px);
            min-height: px2rem(36px);
            padding: 0;
            line-height: px2rem(36px);
            .van-search,
            .van-field__control {
                padding: 0;
                font-size: px2rem(12px);
            }
            .van-cell {
                height: px2rem(30px);
                padding: 0;
                font-size: px2rem(14px);
            }
            .van-search__action {
                padding: 0 px2rem(4px);
                font-size: px2rem(14px);
            }
            .mu-flat-button {
                font-size: px2rem(14px);
            }
        }
        &.search-field--small {
            height: px2rem(32px);
            min-height: px2rem(32px);
            padding: 0;
            line-height: px2rem(32px);
            .van-search,
            .van-field__control {
                padding: 0;
                font-size: px2rem(12px);
            }
            .van-cell {
                height: px2rem(24px);
                padding: 0;
                font-size: px2rem(10px);
            }
            .van-search__action {
                padding: 0 px2rem(2px);
                font-size: px2rem(10px);
            }
            .mu-flat-button {
                font-size: px2rem(10px);
            }
        }
    }
</style>
