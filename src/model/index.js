import Utils from 'common/utils';
import { Config } from 'common/constants';

export default class Model {
    constructor(row, isFromCache) {
        Utils.copyProperties(row, this, Config.CACHE_COPY_OPTIONS);
		if(isFromCache) {
			return this;
        }
        this.format(row, isFromCache);
    }
}