import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyB8x4jO56mL_AF2qnlmatTL7Y2cdj24028',
  authDomain: 'caixinha-casal.firebaseapp.com',
  projectId: 'caixinha-casal',
  storageBucket: 'caixinha-casal.firebasestorage.app',
  messagingSenderId: '1083587518314',
  appId: '1:1083587518314:web:8344058a7b3dc6fd668f13',
  measurementId: 'G-GXTGC793HK',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
