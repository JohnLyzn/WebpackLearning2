import Event from '../event';

export default class AlwaysEvent extends Event {

    hit(eventFrame) {
        return false;
    };
};