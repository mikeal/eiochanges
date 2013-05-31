var eiojson = require('eiojson')
  , util = require('util')
  , events = require('events')
  ;

function Store (name, revs, socket) {
  var self = this
  this.name = name
  this.revs = revs
  this.socket = socket
  socket.json({name:this.name, revs:revs, extension:'eiochanges'})
}
util.inherits(Store, events.EventEmitter)
Store.prototype.change = function (change) {
  if (this.revs[change.id] !== change.rev) this.socket.json({name:this.name, change:change, extension:'eiochanges'})
  this.revs[change.id] = change.rev
}
Store.prototype.onChange = function (change) {
  this.emit('change', change)
  this.revs[change.id] = change.rev
}

function binder (socket) {
  if (!socket.json) eiojson(socket)
  if (socket.store) return socket
  socket.stores = new events.EventEmitter()
  socket.stores._stores = {}
  socket.stores.on('store', function (store) {socket.stores._stores[store.name] = store})
  socket.store = function (name, revs) {
    if (socket.stores._stores[name]) return socket.stores._stores[name]
    var _store = new Store(name, revs, socket)
    socket.stores.emit('store', _store)
    return _store
  }

  socket.on('json', function (obj) {
    if (obj.extension !== 'eiochanges') return
    if (obj.revs) return socket.store(obj.name, obj.revs)
    if (obj.change) return socket.store(obj.name).onChange(obj.change)
  })

  return socket
}

module.exports = binder
