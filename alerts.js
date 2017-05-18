const schedule = require('node-schedule')
const bot = require('./bot')
const db = require('./db')

const day = 24*60*60*1000

alerts = []

function alert(event, time) {
	console.log(event.title + " em " + time)
	db.db
    .get('users')
    .reject(function(user) {
    	return user.ignore[event.course]
    })
    .map('id')
    .value()
    .forEach(function (id) {
    	var message = '[' + event.title + '] em ' + time + '.';
    	bot.bot.sendMessage(id, message, {
        	parse_mode: 'Markdown',
    	});
  	});
}

module.exports.update = (
	function (events) {
		alerts.forEach((alert) => {
			if (alert) alert.cancel()
		})
		alerts.length = 0
		events.forEach((ev) => {
			alerts.push(schedule.scheduleJob(new Date(ev.begin.getTime() - 7*day), () => {alert(ev, 'uma semana')}))
			alerts.push(schedule.scheduleJob(new Date(ev.begin.getTime() - 4*day), () => {alert(ev, 'quatro dias')}))
			alerts.push(schedule.scheduleJob(new Date(ev.begin.getTime() - 1*day), () => {alert(ev, 'um dia')}))
		})
	}
)