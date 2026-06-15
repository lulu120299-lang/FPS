// Même projet Firebase que eps-suivi, données isolées sous le noeud "fps-manager"
const firebaseConfig = {
  databaseURL: "https://eps-suivi-debfa-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const ROOT = db.ref('fps-manager');
