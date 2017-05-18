const EventEmitter = require('events');
const ical = require('ical')
const alerts = require('./alerts');

var calendars = {
    'MAC' : 'https://calendar.google.com/calendar/ical/l4er2qvpec2u04e0op5hio35no%40group.calendar.google.com/public/basic.ics',
    'MAT' : 'https://calendar.google.com/calendar/ical/provasusp%40gmail.com/public/basic.ics',
    'MAE' : 'https://calendar.google.com/calendar/ical/r1hhm7g849vdk18qskl0n7fg8o%40group.calendar.google.com/public/basic.ics'
}

var size = Object.keys(calendars).length

function fetch(events, course) {
    const emitter = new EventEmitter();
    ical.fromURL(calendars[course],{},(err, data) => {
        for (var key in data) {
            if (!data.hasOwnProperty(key))
                continue;
            var ev = data[key];
            if ((new Date(ev.start)).getTime() < Date.now())
                continue;
            var event = {
                course : course,
                title : ev.summary,
                location : ev.location,
                begin : new Date(ev.start)
            }
            events.push(event)
        }
        emitter.emit('end')
    })
    return emitter
}

module.exports = {calendars : calendars}

function ended(events) {
    size--;
    if (size == 0) {
        alerts.update(events)
        size = Object.keys(calendars).length
    }
}

module.exports.update = (
    function (events) {
        events.length = 0
        for (var course in calendars) {
            fetch(events, course).on('end', () => {ended(events)})
        }
    }
)