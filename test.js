var eiochanges = require('./index')
  , cleanup = require('cleanup')
  , assert = require('assert')
  , ok = require('okdone')
  , eioemitter = require('eioemitter')
  , engine = require('engine.io')
  , client = require('engine.io-client')
  ;

var d = cleanup(function (error) {
  if (error) process.exit(1)
  ok.done()
  process.exit()
})

var s = engine.listen(8080, function () {
  var c = eiochanges(client('ws://localhost:8080'))
  var ee = eioemitter(c)
  ee.on('ready', function () {
    var x = c.store('test', {'one': '1'})
    x.on('change', function (change) {
      if (change.rev === '1') throw new Error('Got rev 1')
      if (change.rev === '2') {
        setTimeout(function () {
          x.change(change)
          ee.emit('finish')
        }, 10)
      }
    })
  })

})

s.on('connection', function (c) {
  eiochanges(c)
  var ee = eioemitter(c)
  ee.on('finish', function () {
    d.cleanup()
  })

  c.stores.on('store', function (store) {
    assert.equal(store.name, 'test')
    store.change({id:'one', rev:'1'})
    store.change({id:'one', rev:'2'})
    store.on('change', function () {
      throw new Error('Got change on other side after it was already sent.')
    })
  })

  ee.emit('ready')
})
