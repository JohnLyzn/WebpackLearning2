
import _ from 'lodash';
import Utils from 'common/utils';

import Event from './event';

const TICK_DURATION_SEC = 1; /* 此值请设定大于等于1s保证大部分同步逻辑能完成 */

export default class TimerEventBus {

    constructor(setting, callbacks) {
        this._timer = null;
        this._sources = [];
        this._sourceEventMaps = [];
        this._globalEvents = [];
        this._events = [];
        this._activings = [];
        this._start();
    };

    register(target) {
        return new EventSource(this, target);
    };

    listen(eventSource, event) {
        if(this._events.indexOf(event) == -1) {
            this._events.push(event)
        }
        if(event.global()
            && this._globalEvents.indexOf(event) == -1) {
            this._globalEvents.push(event);
        }
        const index = this._sources.indexOf(eventSource);
        if(index == -1) {
            this._sources.push(eventSource);
            this._sourceEventMaps.push(this._addListeningEvent({}, event));
            return true;
        }
        this._addListeningEvent(this._sourceEventMaps[index], event);
    };

    trigger(eventSource, eventName, options) {
        this._activings.push({
            name: eventName,
            source: eventSource,
            options: options,
        });
    };

    _start() {
        if(this._timer) {
            return;
        }
        this._timer = setInterval(() => {
            this._tick();
        }, TICK_DURATION_SEC * 1000);
    };

    _tick() {
        const actingEvents = this._sortAsActingEvents();
        for(let actingEvent of actingEvents) {
            const eventObj = this._buildEventObj(actingEvent.event,
                 actingEvent.name, actingEvent.options);
            actingEvent.event.perform(eventObj);
        }
    };

    _sortAsActingEvents() {
        const frame = new EventFrame();
        for(let activing of this._activings) {
            const index = this._sources.indexOf(activing.source);
            if(index == -1) {
                continue;
            }
            const eventsMap = this._sourceEventMaps[index];
            const matchEvents = _.flatMap(eventsMap, (events) => events);
            for(let matchEvent of matchEvents) {
                if(matchEvent.active() && matchEvent.hit(frame)) {
                    frame.push(matchEvent, activing.name, activing.options);
                }
            }
        }
        return frame.events();
    };

    _addListeningEvent(eventMap, event) {
        if(! eventMap[event.type()]) {
            eventMap[event.type()] = [event];
            return eventMap;
        }
        eventMap[event.type()].push(event);
        return eventMap;
    };

    _buildEventObj(event, eventName, options) {
        return {
            name: eventName,
            type: event.type(),
            options: options,
            target: event.source().target(),
            timestamp: _.now(),
        };
    };
};

export class EventSource {
    
    constructor(bus, target) {
        this._bus = bus;
        this._target = target;
    };

    target() {
        return this._target;
    };

    publish(eventName, options) {
        this._bus.trigger(this, eventName, options);
    };

    subscribe(eventTypeStr, callback, options) {
        const eventTypeName = _.toLower(eventTypeStr);
        const eventType = require('./type/' + _.toLower(eventTypeStr)).default;
        if(! eventType || ! Utils.isInherit(eventType, Event)) {
            throw new Error(`事件类型${eventTypeStr}不存在`);
        }
        const event = new eventType(this, eventTypeName, callback, options);
        this._bus.listen(this, event);
    };
};

class EventFrame {

    constructor() {
        this._events = [];
    };

    push(event, eventName, eventOptions) {
        this._events.push({
            event: event,
            name: eventName,
            options: eventOptions,
        });
    };

    insert() {

    };

    remove(event) {

    };
    
    removeBefore(event) {

    };

    length() {
        return this._events.length;
    };

    events() {
        return this._events;
    };
};
