import Vue from 'vue'
import Vuex from 'vuex'
import mutations from './mutations'

Vue.use(Vuex)

const state = {
    CURRENT: {
        organizationId: '',
        userId: '',
        userName: '',

        loading: false,
    },
};

export default new Vuex.Store({
	state,
	mutations,
});
