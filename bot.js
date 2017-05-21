const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs')
const fetcher = require('./fetcher')
const db = require('./db')
const dateFormat = require('dateformat')

const day = 24*60*60*1000

const token = fs.readFileSync('token.txt', 'utf8')

const bot = new TelegramBot(token, {polling: true})

const upcoming_days = 30
const sizeLimit = 8

module.exports.bot = bot

var upcoming = []

function update() {
  	fetcher.update(upcoming)
	setTimeout(function() {update()}, 60*60*1000)
}
update()

function createMessageList(list) {
  var message = ''
  var size = 0
  list.forEach((event) => {
    size++
    if (size > sizeLimit) return
    const t = Math.ceil((event.begin.getTime()-Date.now())/60000)
    message += event.title + ' em ' + (num(t/(60*24),'d ')+num((t/60)%24,'h ')+(t%60).toString()+'m  ('+dateFormat(new Date(event.begin.getTime() - 3*60*60*1000), "dd/mm HH:MM")+')\n\n')
  })
  if (size > sizeLimit) { 
    message += "E mais " + (list.length - sizeLimit).toString() + " resultado(s)...\nTalvez deixar a pesquisa mais específica?"
  }
  return message
}

const num = (x, pos) => {
	x = Math.floor(x)
	if (x == 0) return "";
	return x + pos;
}

bot.onText(/^\/search(@\w+)*/m, (msg) => {
    upcoming.sort( (a, b) => { return a.begin - b.begin })
    var list = []
    if (msg.text.split(' ').length < 2) {
        bot.sendMessage(msg.chat.id, "Nenhum argumento especificado.\nTente '\\search mat'")
    }
    else {
        var queries = msg.text.split(' ')
        upcoming.forEach((event) => {
            var eventKeyWords = event.title + " " + event.description
            var matches = 0
            for (var i = 1; i < queries.length; i++) {
                if (event.begin.getTime() <= Date.now())
                    return
                if (event.course.toLowerCase() == queries[i].toLowerCase())
                    matches++
                else if (eventKeyWords.match(new RegExp(queries[i], 'i')) != null)
                    matches++
            }
            if (matches == queries.length-1) list.push(event)
        })
        var message = createMessageList(list)
        if (message.length != 0) bot.sendMessage(msg.chat.id, message)
        else bot.sendMessage(msg.chat.id, "Nenhum evento com os argumentos especificados.")
    }
})

bot.onText(/^\/upcoming(@\w+)*/m, (msg) => {
	var user = db.user.get(msg.chat.id)
	upcoming.sort( (a, b) => { return a.begin - b.begin })
    var list = []
  	if (msg.text.split(' ').length < 2) {
        upcoming.forEach((event) => {
			if (event.begin.getTime() <= Date.now())
				return
	       	if (user.get('ignore').has(event.course).value() == false) {
	         	user.set('ignore.'+event.course, true).write()
	        	return
	        }
	   		if (user.get('ignore.'+event.course).value() == true)
	   			return
            list.push(event)
        })
        var message = createMessageList(list)
        if (message.length != 0) bot.sendMessage(msg.chat.id, message)
        else bot.sendMessage(msg.chat.id, "Nenhum evento encontrado.")
  	}
  	else {
        var queries = msg.text.split(' ')
		upcoming.forEach((event) => {
            var eventKeyWords = event.title + " " + event.description
            for (var i = 1; i < queries.length; i++) {
    			if (event.begin.getTime() <= Date.now())
    				return
                if (event.course.toLowerCase() == queries[i].toLowerCase())
                    list.push(event)
                else if (eventKeyWords.match(new RegExp(queries[i], 'i')) != null)
                    list.push(event)
            }
		})
        var message = createMessageList(list)
		if (message.length != 0) bot.sendMessage(msg.chat.id, message)
		else bot.sendMessage(msg.chat.id, "Nenhum evento com os argumentos especificados.")
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
           "/upcoming - Lista os eventos dos departamentos habilitados ou com certas keywords\n" +
           "/search - Lista os eventos que possuem todas as keywords especificadas\n" +
           "/update - Atualiza a lista de eventos (Já é feito automaticamente de hora em hora).\n" +
           "/show - Lista todos os departamentos implementados.\n" +
           "/enable departamento - Ativa notificações e listagem de eventos para um determinado departamento.\n" +
           "/disable departamento - Desativa notificações e listagem de eventos para um determinado departamento.\n" +
           "/help - Inception.");
})

