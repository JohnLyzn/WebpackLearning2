import Vue from 'vue'
import Vuex from 'vuex'
import mutations from './mutations'

Vue.use(Vuex)

const state = {
    CURRENT: {
        organizationId: '',
        departmentId: '',
        bandId: '',
        userId: '',
        userName: '',

        loading: false,
    },
    DEVICE: {
        isMobile: false,
    },
};

export default new Vuex.Store({
	state,
	mutations,
});
