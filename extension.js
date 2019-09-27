const St = imports.gi.St;
const Main = imports.ui.main;
const Soup = imports.gi.Soup;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const PanelMenu = imports.ui.panelMenu;

const API_STATUS = 'https://iceportal.de/api1/rs/status';

let _httpSession;
const ICEPortalIndicator = new Lang.Class({
  Name: 'ICEPortal',
  Extends: PanelMenu.Button,

  _init: function () {
    this.parent(0.0, "ICE Portal indicator", false);
    this.buttonText = new St.Label({
      text: _("[ICE Portal connecting…]"),
      y_align: Clutter.ActorAlign.CENTER
    });
    this.actor.add_actor(this.buttonText);
    this._refresh();
  },

  _refresh: function () {
    this._loadData(this._refreshUI);
    this._removeTimeout();
    this._timeout = Mainloop.timeout_add_seconds(10, Lang.bind(this, this._refresh));
    return true;
  },

  _loadData: function () {
    //_httpSession = new Soup.Session({"user-agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:69.0) Gecko/20100101 Firefox/69.0"});
    _httpSession = new Soup.Session({"user-agent": "DB ICE Portal GNOME Shell extension"});

    let message = Soup.form_request_new_from_hash('GET', API_STATUS, {});
    _httpSession.queue_message(message, Lang.bind(this, function (_httpSession, message) {
          if (message.status_code != 200) {
            global.log("ICE Portal " + message.status_code + " " + message.response_body.data);
            return;
          }

          let json = JSON.parse(message.response_body.data);

          // If there is an actual GPS signal, the gpsStatus is "VALID"
          if (json['gpsStatus'] == "VALID") {
            this._refreshUI(json['speed'].toString() + " km/h");
          }
        }
      )
    );
  },

  _refreshUI: function (txt) {
    this.buttonText.set_text(txt);
  },

  _removeTimeout: function () {
    if (this._timeout) {
      Mainloop.source_remove(this._timeout);
      this._timeout = null;
    }
  },

  stop: function () {
    if (_httpSession !== undefined)
      _httpSession.abort();
    _httpSession = undefined;

    if (this._timeout)
      Mainloop.source_remove(this._timeout);
    this._timeout = undefined;

    this.menu.removeAll();
  }
});

let iceMenu;

function init() {
}

function enable() {
	iceMenu = new ICEPortalIndicator;
	Main.panel.addToStatusArea('iceportal-indicator', iceMenu);
}

function disable() {
	iceMenu.stop();
	iceMenu.destroy();
}
