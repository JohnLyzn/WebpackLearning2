export default class Event {

    constructor(eventSource, typeName, callback, setting) {
        this._source = eventSource;
        this._callback = callback;
        this._setting = setting;
        this._type = typeName;
        this._active = true;
    };

    type() {
        return this._type;
    };

    source() {
        return this._source;
    };

    active() {
        return this._active;
    };

    global() {
        return this._setting && this._setting.global;
    };

    enable() {
        this._active = true;
    };

    disable() {
        this._active = false;
    };

    hit(eventFrame) {
        return false;
    };

    perform(eventObj) {
        return this._callback.call(null, eventObj);
    };
};