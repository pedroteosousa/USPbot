const lowdb = require('lowdb');
const low = lowdb('db.json')

module.exports.db = low

low.defaults({users: []}).write()

module.exports.user = (function () {
    var User = {}

    User.create = function (id) {
        console.log('Creating user ' + id)
        low.get('users')
        .push({ id: id, ignore: {'MAC' : false, 'MAT' : false, 'MAE' : false} })
        .write()

        return low
            .get('users')
            .find({id : id})
    }

    User.get = function (id) {
        var user = low
        .get('users')
        .find({id : id})
        if (user.isUndefined().value())
            return module.exports.user.create(id)
        return user
    }
    
    return User
})();
