import BaseService from 'service/base_service';

import User from 'model/user';

export default class UserService extends BaseService {

    /**
     * 获取某个用户信息
     */
    getUserById(params, callbacks) {
        return this.queryTemplate(params, callbacks, {
            ajaxParams: {
                action: 'getUserByID',
                userID: params.userId,
                fromGid: params.gid || params.userId,
            },
            objType: User,
            objId: params.userId,
            errorTag: 'getUserById',
            errorMsg: '获取用户信息失败',
        });
    };

    /**
     * 获取当前用户的对象
     */
    getMyObj(params, callbacks) {
        return this.queryTemplate(params, callbacks, {
            ajaxParams: {
                action: 'getMyObj',
                objID: params.objId,
            },
            singleResult: true,
            model: {
                idKey: 'objID',
                nameKey: 'name',
            },
            errorTag: 'getMyObj',
            errorMsg: '获取我的对象信息失败',
        });
    };
};