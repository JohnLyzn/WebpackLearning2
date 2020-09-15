import Vue from 'vue';
import {
    BIND_CURRENT,
} from './mutation_types.js';

export default {
    [BIND_CURRENT](state, current) {
        if(! current) {
            return;
        }
        if(current.userID) {
            Vue.set(state.CURRENT, 'userId', current.userID);
        }
        if(current.userName) {
            Vue.set(state.CURRENT, 'userName', current.userName);
        }
        if(current.organizationId) {
            Vue.set(state.CURRENT, 'organizationId', current.organizationId);
        }
        if(current.departmentId) {
            Vue.set(state.CURRENT, 'departmentId', current.departmentId);
        }
        if(current.bandId) {
            Vue.set(state.CURRENT, 'bandId', current.bandId);
        }
        if(current.loading) {
            Vue.set(state.CURRENT, 'loading', current.loading);
        }
    },
    [BIND_DEVICE](state, current) {
        if(! current) {
            return;
        }
        if(current.isMobile) {
            Vue.set(state.CURRENT, 'isMobile', current.isMobile);
        }
    },
};

const pushObj = (rows, rowMap, obj) => {
    const oldObj = rowMap[obj.id];
    if(! oldObj || rows.indexOf(oldObj) == -1) {
        rows.push(obj);
        Vue.set(rowMap, obj.id, obj);
        return;
    }
    const oldIndex = rows.indexOf(oldObj);
    if(oldIndex != -1) {
        Vue.set(rows, oldIndex, obj);
    } else {
        rows.push(obj);
    }
    Vue.set(rowMap, obj.id, obj);
};

const deleteObj = (rows, rowMap, id) => {
    const oldObj = rowMap[id];
    if(! oldObj) {
        return;
    }
    const index = rows.indexOf(oldObj);
    if(index == -1) {
        return;
    }
    Vue.delete(rows, index);
};