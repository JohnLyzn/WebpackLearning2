import { mapState, mapMutations } from 'vuex';

import _ from 'lodash';
import Moment from 'moment';

import { 
    openUrl,
    isCurrentClient,
    toast,
} from 'common/env';

import Utils from 'common/utils';

export default {
    data() {
        return {
            $$context: '',
        };
    },
    computed: {
        ...mapState([
            'CURRENT'
        ]),
    },
    watch: {
        '$$contextName'() {
            this._$$init();
        },
    },
    methods: {
        ...mapMutations([
            'BIND_CURRENT'
        ]),
        $$formatTime(sendTimeOrStr) {
            const moment = Moment(sendTimeOrStr);
            let date = moment.toDate();
            let locale = moment.format('YYYY-MM-DD HH:mm');
            let localeDate = moment.format('YYYY-MM-DD');
            let since = moment.fromNow();
            if(since == '几秒前') {
                since = '刚刚';
            } else if(since.indexOf('分钟前') != -1) {
                const number = parseInt(since);
                if(number < 10) {
                    since = '几分钟前';
                } else if(number > 30 && number < 60) {
                    since = '半小时前';
                }
            }
            return {
                date: date,
                time: date.getTime(),
                locale: locale,
                localeDate: localeDate,
                since: since,
            };
        },
        $$getTimeRange(sendTimeOrStr, type, format = 'YYYY-MM-DD HH:mm:ss') {
            const moment = sendTimeOrStr ? Moment(sendTimeOrStr) : Moment();
            const start = moment.startOf(type);
            const end = moment.endOf(type);
            return {
                start: format ? start.format(format) : start,
                end: format ? end.format(format) : end,
                startTime: start.toDate().getTime(),
                startTime: end.toDate().getTime(),
            };
        },
        $$commonHandleResult(obj, command, results) {
            if(! obj || ! command) {
                return;
            }
            results = results || [];
            if(! obj.rows || command == 'reset') {
                if(obj.rowMap) {
                    for(let result of results) {
                        obj.rowMap[result.id] = result;
                    }
                }
                obj.rows = results;
                return;
            }
            for(let result of results) {
                if(! obj.rowMap) {
                    obj.rows.push(result);
                    continue;
                }
                const oldOne = obj.rowMap[result.id];
                const index = obj.rows.indexOf(oldOne);
                obj.rowMap[result.id] = result;
                if(! obj.rows) {
                    obj.rows = [];
                }
                if(index != -1) {
                    obj.rows[index] = result;
                    continue;
                }
                obj.rows.push(result);
            }
        },
        $$getCache(key, cacheType) {
            if(_.isPlainObject(obj) && ! cacheName) {
                return;
            }
            const cacheManager = this.$$context.get(':cache');
            if(! cacheManager) {
                return;
            }
            const cahce = cacheManager.cacheOf(cacheType);
            if(! cahce) {
                return;
            }
            return cahce.get(key);
        },
        $$setCache(obj, cacheType) {
            const cacheManager = this.$$context.get(':cache');
            if(! cacheManager) {
                return;
            }
            const cahce = cacheManager.cacheOf(cacheType || obj.prototype);
            if(! cahce) {
                return;
            }
            cahce.cache(obj.id, obj);
        },
        $$retryTask(taskId) {
            const task = this.$$context.task(taskId);
            if(! task) {
                return;
            }
            task.retry();
        },
        $$notifyParentEvent(event, data) {
            notifyParentFrame(_.merge({
                mst_event_name: event,
            }, data));
        },
        $$goto(href, query, replace) {
            if(_.startsWith(href, 'http')) {
                openUrl(href, replace);
                return;
            }
            this.$router[replace?'replace':'push']({ path: href, query: query});
        },
        $$runSystemTool(toolID, param) {
            if(_.isObject(param)) {
                param = JSON.stringify(param);
            }
            if(isCurrentClient('wx')) {
                window.open(`${g_callToolUrl}&toolID=${toolID}&param=${param}`,  '_top');
            } else if(isCurrentClient('desktop')) {
                window.open(`${g_callToolUrl}&toolID=${toolID}&param=${param}`, '_blank');
            } else if(isCurrentClient('mobile')) {
                require('plugin/API').callAppAPI('gotoRunSystemTool', Object.assign({
                    toolID : toolID,
                    param: param,
                }));
            }
        },
        $$startLoading() {
            this.BIND_CURRENT({ loading: true });
        },
        $$endLoading() {
            this.BIND_CURRENT({ loading: false });
        },
        _$$init() {
            if(! this.$$contextName) {
                return;
            }
            this.$$context = this.$inject.to(this, this.$$contextName);
        },
    },
    mounted() {
        this._$$init();
    },
};