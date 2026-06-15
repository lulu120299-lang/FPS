// Même projet Firebase que eps-suivi, données isolées sous le noeud "fps-manager"
// Écrit de façon défensive : si Firebase ne charge pas (réseau, bloqueur, etc.),
// ROOT devient un objet "factice" qui ne plante pas le reste de l'app
// (dessin, terrains, blocs...) mais qui ne pourra simplement pas sauvegarder/charger.

let ROOT;

try {
  const firebaseConfig = {
    databaseURL: "https://eps-suivi-debfa-default-rtdb.europe-west1.firebasedatabase.app"
  };

  if (typeof firebase === 'undefined') {
    throw new Error('SDK Firebase non chargé (gstatic.com inaccessible ?)');
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.database();
  ROOT = db.ref('fps-manager');
} catch (err) {
  console.error('Firebase indisponible :', err);
  const fail = (cb) => { if (typeof cb === 'function') cb(new Error('Firebase indisponible')); return null; };
  const stub = {
    once: (event, cb) => { if (cb) cb({ val: () => null }); return Promise.resolve({ val: () => null }); },
    on: (event, cb) => { if (cb) cb({ val: () => null }); },
    set: (val, cb) => fail(cb),
    update: (val, cb) => fail(cb),
    child: () => stub
  };
  ROOT = stub;
}
