import { Injectable } from '../index';

import componentBase from './component_base';

export default class ComponectInjectable extends Injectable {

    name() {
        return 'component';
    };

    proxy() {
        const componentObj = this.context().target();
        componentObj.mixins = [componentBase];
        return componentObj;
    };
};