import _ from 'lodash';

import { ScriptExecution } from '../index';

export class OpenViewExecution extends ScriptExecution {

    name() {
        return 'openView';
    };

    execute(scope, output) {
        const type = _.toLower(scope.arg(0, 'String')); // replace,pop,side
        output.set('view', ['replace', 'pop', 'side']
            .indexOf(type) == -1 ? 'replace' : type);
    };
};

export class LineExecution extends ScriptExecution {

    name() {
        return 'line';
    };

    execute(scope, output) {
        const type = _.toLower(scope.arg(0, 'String')); // info,input,
        const content = scope.arg(1, 'String');
        const label = scope.arg(2, 'String');
        const setting = scope.arg(3, 'Object');
        output.add('lines', {
            type: ['info', 'input'].indexOf(type) == -1 ? 'label' : type,
            label: label,
            content: content,
            setting: setting,
        });
    };
};