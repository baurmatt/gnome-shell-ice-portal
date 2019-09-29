const { St } = imports.gi;
const Main = imports.ui.main;
const { Soup } = imports.gi;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const { Clutter } = imports.gi;
const PanelMenu = imports.ui.panelMenu;

const API_BASE = 'https://iceportal.de/api1/rs';

let session;
const ICEPortalIndicator = new Lang.Class({
  Name: 'ICEPortal',
  Extends: PanelMenu.Button,

  _init() {
    this.parent(0.0, 'ICE Portal indicator', false);
    this.buttonText = new St.Label({
      text: _('[ICE Portal connecting…]'),
      y_align: Clutter.ActorAlign.CENTER,
    });
    this.actor.add_actor(this.buttonText);
    this.refresh();
  },

  refresh() {
    this.loadData(this.refreshUI);
    this.removeTimeout();
    this.timeout = Mainloop.timeout_add_seconds(3, Lang.bind(this, this.refresh));
    return true;
  },

  loadData() {
    session = new Soup.Session({ 'user-agent': 'DB ICE Portal GNOME Shell extension' });

    const requestStatus = new Promise((resolve, reject) => {
      const request = Soup.form_request_new_from_hash('GET', `${API_BASE}/status`, {});

      session.queue_message(request, Lang.bind(this, (_, message) => {
        if (message.status_code != 200) {
          global.log(`ICE Portal ${message.status_code} ${message.response_body.data}`);
          reject(message);
        }
        resolve(JSON.parse(message.response_body.data));
      }));
    });

    const requestTrip = new Promise((resolve, reject) => {
      const request = Soup.form_request_new_from_hash('GET', `${API_BASE}/tripInfo/trip`, {});

      session.queue_message(request, Lang.bind(this, (_, message) => {
        if (message.status_code != 200) {
          global.log(`ICE Portal ${message.status_code} ${message.response_body.data}`);
          reject(message);
        }
        resolve(JSON.parse(message.response_body.data));
      }));
    });

    Promise.all([requestStatus, requestTrip]).then(([resultStatus, resultTrip]) => {
      // If there is an actual GPS signal, the gpsStatus is "VALID"
      if (resultStatus.gpsStatus != 'VALID') {
        return;
      }

      wagonClass = (resultStatus.wagonClass == 'SECOND' ? '2nd' : '1st');

      const text = `${resultTrip.trip.trainType} ${resultTrip.trip.vzn} ->  | ${resultStatus.speed} km/h`;


      this.refreshUI(text);
    });
  },

  refreshUI(txt) {
    this.buttonText.set_text(txt);
  },

  removeTimeout() {
    if (this.timeout) {
      Mainloop.source_remove(this.timeout);
      this.timeout = null;
    }
  },

  stop() {
    if (session !== undefined) session.abort();
    session = undefined;

    if (this.timeout) Mainloop.source_remove(this.timeout);
    this.timeout = undefined;

    this.menu.removeAll();
  },
});

let iceMenu;
function init() {
}

function enable() {
  iceMenu = new ICEPortalIndicator();
  Main.panel.addToStatusArea('iceportal-indicator', iceMenu);
}

function disable() {
  iceMenu.stop();
  iceMenu.destroy();
}
