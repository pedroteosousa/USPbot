const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs')
const fetcher = require('./fetcher')
const db = require('./db')
const dateFormat = require('dateformat')

const day = 24*60*60*1000

const token = fs.readFileSync('token.txt', 'utf8')

const bot = new TelegramBot(token, {polling: true})

const upcoming_days = 60

module.exports.bot = bot

var upcoming = []

function update() {
  	fetcher.update(upcoming)
	setTimeout(function() {update()}, 60*60*1000)
}
update()

const num = (x, pos) => {
	x = Math.floor(x)
	if (x == 0) return "";
	return x + pos;
}

bot.onText(/^\/upcoming(@\w+)*/m, (msg) => {
	var user = db.user.get(msg.chat.id)
	upcoming.sort( (a, b) => { return a.begin - b.begin })
  	if (msg.text.split(' ').length < 2) {
		var message = ''
		upcoming.forEach((event) => {
			if (event.begin.getTime() <= Date.now())
				return
			if (event.begin.getTime() > Date.now() + upcoming_days*day)
	        	return
	       	if (user.get('ignore').has(event.course).value() == false) {
	         	user.set('ignore.'+event.course, true).write()
	        	return
	        }
	   		if (user.get('ignore.'+event.course).value() == true)
	   			return
	        const t = Math.ceil((event.begin.getTime()-Date.now())/60000)
	        message += event.title + ' em ' + (num(t/(60*24),'d ')+num((t/60)%24,'h ')+(t%60).toString()+'m  ('+dateFormat(new Date(event.begin.getTime() - 3*60*60*1000), "dd/mm HH:MM")+')\n\n')
		})
		if (message.length != 0) bot.sendMessage(msg.chat.id, message)
		else bot.sendMessage(msg.chat.id, "Nenhum evento nos próximos " + upcoming_days + " dias.")
  	}
  	else {
  		if (!(msg.text.split(' ')[1] in fetcher.calendars)) {
  			bot.sendMessage(msg.chat.id, "Departamento não encontrado")
  			return
  		}
  		var message = ''
		upcoming.forEach((event) => {
			if (event.begin.getTime() <= Date.now())
				return
			if (event.begin.getTime() > Date.now() + upcoming_days*day)
	        	return
	       	if (event.course != msg.text.split(' ')[1])
	       		return
	        const t = Math.ceil((event.begin.getTime()-Date.now())/60000)
	        message += event.title + ' em ' + (num(t/(60*24),'d ')+num((t/60)%24,'h ')+(t%60).toString()+'m  ('+dateFormat(new Date(event.begin.getTime() - 3*60*60*1000), "dd/mm HH:MM")+')\n\n')
		})
		if (message.length != 0) bot.sendMessage(msg.chat.id, message)
		else bot.sendMessage(msg.chat.id, "Nenhum evento nos próximos " + upcoming_days + " dias.")
  	}
})

bot.onText(/^\/show(@\w+)*$/, (msg) => {
	var user = db.user.get(msg.chat.id).value()
	var message = 'use /enable ou /disable para ativar ou desativar departamentos.\n\n'
	for (var course in fetcher.calendars) {
		message += course
		if (user.ignore[course] == undefined || user.ignore[course] == true) {
			message += ' [desativado]\n'
		}
		else message += ' [ativado]\n'
	}
	if (message.length != 0) bot.sendMessage(msg.chat.id, message);
})

bot.onText(/^\/disable(@\w+)*/m, (msg) => {
    var user = db.user.get(msg.chat.id)
  	var response = ""
  	if (msg.text.split(' ').length < 2) {
    	response = "Nenhum departamento especificado."
  	}
  	else {
  		if (!(msg.text.split(' ')[1] in fetcher.calendars)) {
  			bot.sendMessage(msg.chat.id, "Departamento não encontrado")
  			return
  		}
        var course = msg.text.split(' ')[1]
        if (user.get('ignore').has(course).value() == false) {
         	user.set('ignore.'+course, true).write()
        	response = course + " já está desativado."
        }
        else if (user.get('ignore.'+course).value() == false) {
          	user.set('ignore.'+course, true).write()
        	response = "Agora " + course + " está desativado."
        }
        else {
        	response = course + " já está desativado."
        }
    }
    bot.sendMessage(msg.chat.id, response)
})

bot.onText(/^\/enable(@\w+)*/m, (msg) => {
    var user = db.user.get(msg.chat.id)
  	var response = ""
  	if (msg.text.split(' ').length < 2) {
    	response = "Nenhum departamento especificado."
  	}
  	else {
  		if (!(msg.text.split(' ')[1] in fetcher.calendars)) {
  			bot.sendMessage(msg.chat.id, "Departamento não encontrado")
  			return
  		}
        var course = msg.text.split(' ')[1]
        if (user.get('ignore').has(course).value() == false) {
         	user.set('ignore.'+course, false).write()
        	response = "Agora " + course + " está ativado."
        }
        else if (user.get('ignore.'+course).value() == true) {
          	user.set('ignore.'+course, false).write()
        	response = "Agora " + course + " está ativado."
        }
        else {
        	response = course + " já está ativado."
        }
    }
    bot.sendMessage(msg.chat.id, response)
})

bot.onText(/^\/update(@\w+)*$/, (msg) => {
	fetcher.update(upcoming)
	bot.sendMessage(msg.chat.id, "Atualizando a lista de eventos...")
})

bot.onText(/^\/help(@\w+)*$/, (msg) => {
	bot.sendMessage(msg.chat.id,
           "Comandos implementados: \n\n" +
           "/upcoming - Lista os eventos dos departamentos habilitados que acontecerão nos próximos " + upcoming_days +" dias.\n" +
           "/update - Atualiza a lista de eventos (Já é feito automaticamente de hora em hora).\n" +
           "/show - Lista todos os departamentos implementados.\n" +
           "/enable departamento - Ativa notificações e listagem de eventos para um determinado departamento.\n" +
           "/disable departamento - Desativa notificações e listagem de eventos para um determinado departamento.\n" +
           "/help - Inception.");
})

