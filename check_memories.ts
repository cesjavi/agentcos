import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function checkMemories() {
  const snap = await getDocs(collection(db, 'memories'));
  snap.forEach(doc => {
    console.log(`ID: ${doc.id}`);
    console.log(`Content: ${doc.data().content}`);
    console.log(`Tags: ${JSON.stringify(doc.data().tags)}`);
    console.log('---');
  });
}

checkMemories();
