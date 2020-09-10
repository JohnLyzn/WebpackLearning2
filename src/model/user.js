import Model from './index';

export default class User extends Model {
	
    format(row, isFromCache) {
		this.id = row.userID.toString();
		this.name = row.userName;
    }
}
User.typeName = 'User';
User.displayName = '用户';