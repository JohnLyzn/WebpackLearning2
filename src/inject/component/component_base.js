import { mapState, mapMutations } from 'vuex';

import _ from 'lodash';
import Moment from 'moment';

import { 
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
        $$formatSendTime(sendTimeOrStr) {
            const sendTime = parseInt(sendTimeOrStr);
            if(! _.isNumber(sendTime)) {
                return;
            }
            const moment = Moment(sendTime);
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
                time: sendTime,
                locale: locale,
                localeDate: localeDate,
                since: since,
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
                if(index != -1) {
                    obj.rows[index] = result;
                    continue;
                }
                obj.rows.push(result);
            }
        },
        $$retryTask(taskId) {
            const task = this.$$context.task(taskId);
            if(! task) {
                return;
            }
            task.retry();
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