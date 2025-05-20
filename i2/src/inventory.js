import { db } from './firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export async function addInventoryItem({ productName, quantity, buyPrice, sellPrice, userId }) {
  // Check for duplicate by productName (case-insensitive) for this user
  const q = query(
    collection(db, 'inventory'),
    where('userId', '==', userId),
    where('productName', '==', productName.trim().toLowerCase())
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error('Product with this name already exists for this user.');
  }
  // Add new item
  await addDoc(collection(db, 'inventory'), {
    userId,
    productName: productName.trim().toLowerCase(),
    quantity: Number(quantity),
    buyPrice: Number(buyPrice),
    sellPrice: Number(sellPrice),
    createdAt: new Date().toISOString(),
  });
}
