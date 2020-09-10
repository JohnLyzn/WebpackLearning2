import _ from 'lodash';

import { ScriptExecution } from '../index';

export class RunToolExecution extends ScriptExecution {

    name() {
        return 'runTool';
    };

    execute(scope, output) {
        const toolId = scope.arg(0, 'String');
        const bandId = scope.arg(1, 'String');
        const param = scope.arg(2, 'String');
        const runToolType = scope.arg(3, 'String');

        let runToolUrl = g_callToolUrl;
        if(runToolType) {
            runToolUrl = runToolUrl.replace(/runToolWithToolShopToolID/g, runToolType);
        }
        runToolUrl += '&toolID=' + toolId
        if(bandId) {
            if(runToolUrl.indexOf('System') == -1) {
                runToolUrl += '&bandID=' + bandId;
            }
            if(runToolUrl.indexOf('gid=') != -1) {
                runToolUrl.replace(/(?<=gid=)\d+/g, bandId);
            } else {
                runToolUrl += '&gid' + bandId;
            }
        }
        if(_.startsWith(param, '&')) {
            runToolUrl += param;
        } else if(param) {
            runToolUrl += '&param=' + encodeURI(param);
        }
        output.set('requestUrl', runToolUrl);
        return runToolUrl;
    };
};
