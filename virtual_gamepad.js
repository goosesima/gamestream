// Generated by CoffeeScript 1.10.0

/*
Created by MIROOF on 04/03/2015
Virtual gamepad class
 */

(function() {
  var fs, ioctl, log, uinput, uinputStructs, virtual_gamepad;

  fs = require('fs');

  ioctl = require('ioctl');

  uinput = require('./uinput');

  uinputStructs = require('./uinput_structs');

  var log = function(level, message) {
    console.log(message);
  }

  virtual_gamepad = (function() {
    function virtual_gamepad() {}

    virtual_gamepad.prototype.connect = function(callback, error, retry) {
      if (retry == null) {
        retry = 0;
      }
      return fs.open('/dev/uinput', 'w+', (function(_this) {
        return function(err, fd) {
          var uidev, uidev_buffer;
          if (err) {
            log('error', "Error on opening /dev/uinput:\n" + JSON.stringify(err));
            return error(err);
          } else {
            _this.fd = fd;
            ioctl(_this.fd, uinput.UI_SET_EVBIT, uinput.EV_KEY);
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, uinput.BTN_A);
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, uinput.BTN_B);
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, uinput.BTN_X);
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, uinput.BTN_Y);
            // 0x220, 0x221, 0x222, 0x223 - up down left right
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, 0x220);
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, 0x221);
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, 0x222);
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, 0x223);
            // ioctl(_this.fd, uinput.UI_SET_KEYBIT, uinput.BTN_TL);
            // ioctl(_this.fd, uinput.UI_SET_KEYBIT, uinput.BTN_TR);
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, uinput.BTN_START);
            ioctl(_this.fd, uinput.UI_SET_KEYBIT, uinput.BTN_SELECT);
            // ioctl(_this.fd, uinput.UI_SET_EVBIT, uinput.EV_ABS);
            // ioctl(_this.fd, uinput.UI_SET_ABSBIT, uinput.ABS_X);
            // ioctl(_this.fd, uinput.UI_SET_ABSBIT, uinput.ABS_Y);
            uidev = new uinputStructs.uinput_user_dev;
            uidev_buffer = uidev.ref();
            uidev_buffer.fill(0);
            uidev.name = Array.from("Virtual gamepad");
            uidev.id.bustype = uinput.BUS_USB;
            uidev.id.vendor = 0x3;
            uidev.id.product = 0x3;
            uidev.id.version = 2;
            uidev.absmax[uinput.ABS_X] = 255;
            uidev.absmin[uinput.ABS_X] = 0;
            uidev.absfuzz[uinput.ABS_X] = 0;
            uidev.absflat[uinput.ABS_X] = 15;
            uidev.absmax[uinput.ABS_Y] = 255;
            uidev.absmin[uinput.ABS_Y] = 0;
            uidev.absfuzz[uinput.ABS_Y] = 0;
            uidev.absflat[uinput.ABS_Y] = 15;
            return fs.write(_this.fd, uidev_buffer, 0, uidev_buffer.length, null, function(err) {
              var error1;
              if (err) {
                log('error', "Error on init gamepad write:\n" + JSON.stringify(err));
                return error(err);
              } else {
                try {
                  ioctl(_this.fd, uinput.UI_DEV_CREATE);
                  return callback();
                } catch (error1) {
                  err = error1;
                  log('error', "Error on gamepad dev creation:\n" + JSON.stringify(err));
                  fs.closeSync(_this.fd);
                  _this.fd = void 0;
                  if (retry < 5) {
                    log('info', "Retry to create gamepad");
                    return _this.connect(callback, error, retry + 1);
                  } else {
                    log('error', "Gave up on creating device");
                    return error(err);
                  }
                }
              }
            });
          }
        };
      })(this));
    };

    virtual_gamepad.prototype.disconnect = function(callback) {
      if (this.fd) {
        ioctl(this.fd, uinput.UI_DEV_DESTROY);
        fs.closeSync(this.fd);
        this.fd = void 0;
        return callback();
      }
    };

    virtual_gamepad.prototype.sendEvent = function(event, error) {
      var err, error1, error2, ev, ev_buffer, ev_end, ev_end_buffer;
      if (this.fd) {
        ev = new uinputStructs.input_event;
        ev.type = event.type;
        ev.code = event.code;
        ev.value = event.value;
        ev.time.tv_sec = Math.round(Date.now() / 1000);
        ev.time.tv_usec = Math.round(Date.now() % 1000 * 1000);
        ev_buffer = ev.ref();
        ev_end = new uinputStructs.input_event;
        ev_end.type = 0;
        ev_end.code = 0;
        ev_end.value = 0;
        ev_end.time.tv_sec = Math.round(Date.now() / 1000);
        ev_end.time.tv_usec = Math.round(Date.now() % 1000 * 1000);
        ev_end_buffer = ev_end.ref();
        try {
          fs.writeSync(this.fd, ev_buffer, 0, ev_buffer.length, null);
        } catch (error1) {
          err = error1;
          log('error', "Error on writing ev_buffer");
          throw err;
        }
        try {
          return fs.writeSync(this.fd, ev_end_buffer, 0, ev_end_buffer.length, null);
        } catch (error2) {
          err = error2;
          log('error', "Error on writing ev_end_buffer");
          throw err;
        }
      }
    };

    return virtual_gamepad;

  })();

  module.exports = virtual_gamepad;

}).call(this);
