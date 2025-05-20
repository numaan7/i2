import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper, Box, Container, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Typography, Stack } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import './App.css';
import { signInWithGoogle, saveUserToFirestore } from './firebase';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { addInventoryItem } from './inventory';
import { getDocs, collection, query, where, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase'; // Import db from firebase.js
import Autocomplete from '@mui/material/Autocomplete';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart, Bar } from 'recharts';
import dayjs from 'dayjs';
<<<<<<< HEAD
=======
import Popover from '@mui/material/Popover';
import InfoIcon from '@mui/icons-material/Info';
>>>>>>> 388b6d2 (deploy)

function getSalesDataByRange(invoices, range) {
  const now = dayjs();
  let start;
  if (range === 'today') {
    start = now.startOf('day');
  } else if (range === 'week') {
    start = now.startOf('week');
  } else if (range === 'month') {
    start = now.startOf('month');
  } else if (range === 'year') {
    start = now.startOf('year');
  } else {
    start = dayjs('2000-01-01'); // all time
  }
  // Group by day
  const salesMap = {};
  invoices.forEach(inv => {
    if (!inv.date) return;
    const date = dayjs(inv.date);
    if (date.isBefore(start)) return;
    const key = date.format('YYYY-MM-DD');
    salesMap[key] = (salesMap[key] || 0) + (Number(inv.totalAmount) || 0);
  });
  // Fill missing days
  let days = [];
  let cursor = start;
  while (cursor.isBefore(now.add(1, 'day'))) {
    const key = cursor.format('YYYY-MM-DD');
    days.push({ date: key, total: salesMap[key] || 0 });
    cursor = cursor.add(1, 'day');
  }
  return days;
}



// Helper for profit/loss data
function getProfitLossDataByRange(invoices, inventory, range) {
  const now = dayjs();
  let start;
  if (range === 'today') {
    start = now.startOf('day');
  } else if (range === 'week') {
    start = now.startOf('week');
  } else if (range === 'month') {
    start = now.startOf('month');
  } else if (range === 'year') {
    start = now.startOf('year');
  } else {
    start = dayjs('2000-01-01'); // all time
  }
  // Group by day
  const profitMap = {};
  const lossMap = {};
  invoices.forEach(inv => {
    if (!inv.date) return;
    const date = dayjs(inv.date);
    if (date.isBefore(start)) return;
    const key = date.format('YYYY-MM-DD');
    let profit = 0;
    let loss = 0;
    if (Array.isArray(inv.items)) {
      inv.items.forEach(item => {
        let buyPrice = 0;
        if (item.id && inventory.length > 0) {
          const invItem = inventory.find(i => i.id === item.id);
          if (invItem) buyPrice = Number(invItem.buyPrice) || 0;
        }
        const itemProfit = (Number(item.sellPrice) - buyPrice) * Number(item.quantity);
        if (itemProfit >= 0) {
          profit += itemProfit;
        } else {
          loss += Math.abs(itemProfit);
        }
      });
    }
    // Adjust for GST and discount
    const subtotal = Array.isArray(inv.items) ? inv.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0) : 0;
    const gst = inv.gst ? (subtotal * inv.gst / 100) : 0;
    const discount = inv.discount || 0;
    // Profit is after GST and discount
    profit = profit + gst - discount;
    profitMap[key] = (profitMap[key] || 0) + profit;
    lossMap[key] = (lossMap[key] || 0) + loss;
  });
  // Fill missing days
  let days = [];
  let cursor = start;
  while (cursor.isBefore(now.add(1, 'day'))) {
    const key = cursor.format('YYYY-MM-DD');
    days.push({ date: key, profit: profitMap[key] || 0, loss: lossMap[key] || 0 });
    cursor = cursor.add(1, 'day');
  }
  return days;
}

function App() {
  const [value, setValue] = React.useState(0); // 0: Sign In, 1: Sign Up
  const [open, setOpen] = React.useState(false);
  const [extraData, setExtraData] = React.useState({ phone: '', businessName: '' });
  const [loading, setLoading] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [handleSelectInvoiceRow, setHandleSelectInvoiceRow] = React.useState(null);
  const [inventoryForm, setInventoryForm] = React.useState({
    productName: '',
    quantity: '',
    buyPrice: '',
    sellPrice: ''
  });
  const [inventoryError, setInventoryError] = React.useState('');
  const [inventorySuccess, setInventorySuccess] = React.useState('');
  const [inventoryList, setInventoryList] = React.useState([]);
  const [editId, setEditId] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ productName: '', quantity: '', buyPrice: '', sellPrice: '' });
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [sortField, setSortField] = React.useState('slno');
  const [sortOrder, setSortOrder] = React.useState('asc'); // 'asc' or 'desc'
  const [searchTerm, setSearchTerm] = React.useState('');
  const [invoiceModalOpen, setInvoiceModalOpen] = React.useState(false);
  const [invoiceForm, setInvoiceForm] = React.useState({
    invoiceId: '',
    date: '',
    customerName: '',
    customerPhone: '',
    customerDetails: '',
    items: [],
    totalAmount: 0,
    gst: 0,
    discount: 0,
    paid: 0,
    due: 0
  });
  const [invoiceError, setInvoiceError] = React.useState('');
  const [invoiceSuccess, setInvoiceSuccess] = React.useState('');
  const [invoiceIdError, setInvoiceIdError] = React.useState('');
  const [itemSearch, setItemSearch] = React.useState('');
  const [itemOptions, setItemOptions] = React.useState([]);
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [invoiceList, setInvoiceList] = React.useState([]);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = React.useState("");
  const [invoiceSortField, setInvoiceSortField] = React.useState("slno");
  const [invoiceSortOrder, setInvoiceSortOrder] = React.useState("asc");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = React.useState([]);
  const [invoiceViewOpen, setInvoiceViewOpen] = React.useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = React.useState(null);
  const [confirmPaymentOpen, setConfirmPaymentOpen] = React.useState(false);
  const [pendingPayment, setPendingPayment] = React.useState(null);
  const [salesRange, setSalesRange] = React.useState('week');
  
  const [profitLossRange, setProfitLossRange] = React.useState('week');

  // Profile state
  const [profileBusinessName, setProfileBusinessName] = React.useState('');
  const [profilePhone, setProfilePhone] = React.useState('');
  const [profileError, setProfileError] = React.useState('');
  const [profileSuccess, setProfileSuccess] = React.useState('');

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState(null);
  const [deleteInvoiceConfirmOpen, setDeleteInvoiceConfirmOpen] = React.useState(false);
  const [deleteInvoiceTargetId, setDeleteInvoiceTargetId] = React.useState(null);

<<<<<<< HEAD
=======
  // PWA install popover state
  const [pwaAnchorEl, setPwaAnchorEl] = React.useState(null);
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);

>>>>>>> 388b6d2 (deploy)
  React.useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch inventory items for the current user
  React.useEffect(() => {
    const fetchInventory = async () => {
      if (user && (value === 0 || value === 1)) {
        const q = query(collection(db, 'inventory'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((doc, idx) => ({ id: doc.id, slno: idx + 1, ...doc.data() }));
        setInventoryList(items);
      } else if (value !== 0 && value !== 1) {
        setInventoryList([]);
      }
    };
    fetchInventory();
  }, [user, value, inventorySuccess]);

  // Fetch invoices for the current user
  React.useEffect(() => {
    const fetchInvoices = async () => {
      if (user && (value === 0 || value === 2)) {
        const q = query(collection(db, 'invoices'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const invoices = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setInvoiceList(invoices);
      } else if (value !== 0 && value !== 2) {
        setInvoiceList([]);
      }
    };
    fetchInvoices();
  }, [user, value, invoiceSuccess]);

  // Centered Sign In
  const handleSignIn = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      await saveUserToFirestore(user);
      setIsSignedIn(true);
      alert('Signed in successfully!');
    } catch (e) {
      alert('Authentication failed.');
    }
    setLoading(false);
  };

  // Centered Sign Up
  const handleSignUp = async () => {
    setOpen(true);
  };

  const handleSignupSubmit = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      await saveUserToFirestore(user, extraData);
      setOpen(false);
      alert('Signed up successfully!');
    } catch (e) {
      alert('Authentication failed.');
    }
    setLoading(false);
  };

  const handleInventoryChange = (e) => {
    setInventoryForm({ ...inventoryForm, [e.target.name]: e.target.value });
    setInventoryError('');
    setInventorySuccess('');
  };

  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    setInventoryError('');
    setInventorySuccess('');
    const { productName, quantity, buyPrice, sellPrice } = inventoryForm;
    if (!productName || !quantity || !buyPrice || !sellPrice) {
      setInventoryError('All fields are required.');
      return;
    }
    if (
      !Number.isInteger(Number(quantity)) || Number(quantity) < 1 ||
      !Number.isInteger(Number(buyPrice)) || Number(buyPrice) < 1 ||
      !Number.isInteger(Number(sellPrice)) || Number(sellPrice) < 1
    ) {
      setInventoryError('Quantity, Buy Price, and Sell Price must be positive integers (1 or greater).');
      return;
    }
    if (!user) {
      setInventoryError('User not found. Please sign in again.');
      return;
    }
    try {
      await addInventoryItem({ ...inventoryForm, userId: user.uid });
      setInventorySuccess('Item added successfully!');
      setInventoryForm({ productName: '', quantity: '', buyPrice: '', sellPrice: '' });
    } catch (err) {
      setInventoryError(err.message);
    }
  };

  // Edit handlers
  const handleEditClick = (item) => {
    setEditId(item.id);
    setEditForm({
      productName: item.productName,
      quantity: item.quantity,
      buyPrice: item.buyPrice,
      sellPrice: item.sellPrice
    });
  };
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  const handleEditSave = async (id) => {
    if (!editForm.productName || !editForm.quantity || !editForm.buyPrice || !editForm.sellPrice) {
      setInventoryError('All fields are required.');
      return;
    }
    if (
      !Number.isInteger(Number(editForm.quantity)) || Number(editForm.quantity) < 1 ||
      !Number.isInteger(Number(editForm.buyPrice)) || Number(editForm.buyPrice) < 1 ||
      !Number.isInteger(Number(editForm.sellPrice)) || Number(editForm.sellPrice) < 1
    ) {
      setInventoryError('Quantity, Buy Price, and Sell Price must be positive integers (1 or greater).');
      return;
    }
    // Check for duplicate product name for this user (excluding the current item)
    const q = query(
      collection(db, 'inventory'),
      where('userId', '==', user.uid),
      where('productName', '==', editForm.productName.trim().toLowerCase())
    );
    const snapshot = await getDocs(q);
    const duplicate = snapshot.docs.find(docSnap => docSnap.id !== id);
    if (duplicate) {
      setInventoryError('Product with this name already exists for this user.');
      return;
    }
    try {
      await updateDoc(doc(db, 'inventory', id), {
        productName: editForm.productName.trim().toLowerCase(),
        quantity: Number(editForm.quantity),
        buyPrice: Number(editForm.buyPrice),
        sellPrice: Number(editForm.sellPrice)
      });
      setEditId(null);
      setInventorySuccess('Item updated successfully!');
    } catch (err) {
      setInventoryError('Failed to update item.');
    }
  };
  const handleEditCancel = () => {
    setEditId(null);
    setInventoryError('');
  };

  // Multiple delete
  const handleSelectRow = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleDeleteSelected = async () => {
    try {
      await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'inventory', id))));
      setInventorySuccess('Selected items deleted!');
      setSelectedIds([]);
    } catch {
      setInventoryError('Failed to delete selected items.');
    }
  };

  // Multiple delete for invoices
  const handleDeleteSelectedInvoices = async () => {
    try {
      await Promise.all(selectedInvoiceIds.map(id => deleteDoc(doc(db, 'invoices', id))));
      setInvoiceSuccess('Selected invoices deleted!');
      setSelectedInvoiceIds([]);
    } catch {
      setInvoiceError('Failed to delete selected invoices.');
    }
  };

  // Sort inventoryList before rendering
  const sortedInventoryList = React.useMemo(() => {
    const withTotals = inventoryList.map(item => ({
      ...item,
      totalBuyPrice: Number(item.buyPrice) * Number(item.quantity),
      totalSellPrice: Number(item.sellPrice) * Number(item.quantity)
    }));
    const sorted = [...withTotals].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [inventoryList, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleExportCSV = () => {
    if (inventoryList.length === 0) {
      setInventoryError('No items to export.');
      return;
    }
    const filtered = sortedInventoryList.filter(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    const csvRows = [
      ['Sl. No', 'Name', 'Quantity', 'Buy Price', 'Sell Price', 'Total Buy Price', 'Total Sell Price'],
      ...filtered.map(item => [
      item.slno,
      item.productName,
      item.quantity,
      item.buyPrice,
      item.sellPrice,
      Number(item.buyPrice) * Number(item.quantity),
      Number(item.sellPrice) * Number(item.quantity)
      ])
    ];
    const csvContent = csvRows.map(row => row.map(String).map(v => '"' + v.replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate unique sequential invoice ID (INVYYYYMMDD0000) using invoice model
  const generateInvoiceId = React.useCallback(async () => {
    if (!user) return '';
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const prefix = `INV${y}${m}${d}`;
    // Query Firestore for all invoice IDs for this user for today
    const q = query(collection(db, 'invoices'), where('userId', '==', user.uid), where('invoiceId', '>=', prefix), where('invoiceId', '<', prefix + '9999'));
    const snapshot = await getDocs(q);
    // Find the max sequence number for today
    let maxNum = 0;
    snapshot.forEach(docSnap => {
      const invoice = docSnap.data();
      if (invoice && invoice.invoiceId && invoice.invoiceId.startsWith(prefix)) {
        const num = parseInt(invoice.invoiceId.slice(-4));
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return prefix + String(maxNum + 1).padStart(4, '0');
  }, [user]);

  const checkInvoiceIdUnique = async (invoiceId) => {
    if (!user || !invoiceId) return false;
    // Use Firestore query to check for invoiceId directly, not by index
    const q = query(collection(db, 'invoices'), where('userId', '==', user.uid), where('invoiceId', '==', invoiceId));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const handleOpenInvoiceModal = async () => {
    setInvoiceIdError('');
    setInvoiceError('');
    setInvoiceSuccess('');
    const newId = await generateInvoiceId();
    setInvoiceForm({
      ...invoiceForm,
      invoiceId: newId,
      date: new Date().toISOString().slice(0, 10),
      customerName: '',
      customerPhone: '',
      customerDetails: '',
      items: [],
      totalAmount: 0,
      gst: 18, // Default GST to 18%
      discount: 0,
      paid: 0,
      due: 0
    })
    setInvoiceModalOpen(true);
  };

  const handleInvoiceIdChange = async (e) => {
    const newId = e.target.value;
    setInvoiceForm({ ...invoiceForm, invoiceId: newId });
    if (!newId) {
      setInvoiceIdError('Invoice ID is required.');
      return;
    }
    if (!/^INV\d{8}\d{4}$/.test(newId)) {
      setInvoiceIdError('Format: INVYYYYMMDD0000');
      return;
    }
    // Check uniqueness by querying Firestore for invoiceId, not by index
    const isUnique = await checkInvoiceIdUnique(newId);
    setInvoiceIdError(isUnique ? '' : 'Invoice ID already exists. Please choose another.');
  };

  const handleInvoiceChange = (e) => {
    setInvoiceForm({ ...invoiceForm, [e.target.name]: e.target.value });
    setInvoiceError('');
    setInvoiceSuccess('');
  };

  // Invoice model and save logic
  const saveInvoice = async (invoice) => {
    if (!user) throw new Error('User not found');
    // --- Recalculate totalAmount before saving ---
    const subtotal = invoice.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.sellPrice)), 0);
    const gstAmount = subtotal * (Number(invoice.gst) / 100);
    const discountAmount = subtotal * (Number(invoice.discount) / 100);
    const totalAmount = subtotal + gstAmount - discountAmount;
    const dueAmount = totalAmount - Number(invoice.paid);
    // Invoice model - include all fields from the form, but use recalculated totalAmount
    const invoiceData = {
      userId: user.uid,
      invoiceId: invoice.invoiceId,
      date: invoice.date,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerDetails: invoice.customerDetails,
      items: invoice.items,
      totalAmount: totalAmount,
      gst: invoice.gst, // include GST
      discount: invoice.discount, // include discount
      paid: invoice.paid, // include paid
      due: dueAmount, // include due
      createdAt: new Date().toISOString(),
    };
    // Store invoice in Firestore with invoiceId as document ID
    await setDoc(doc(db, 'invoices', invoice.invoiceId), invoiceData);

    // Reduce inventory quantities for each item in the invoice (if not isOther or isService)
    for (const item of invoice.items) {
      if (!item.isOther && !item.isService && item.id) {
        const itemRef = doc(db, 'inventory', item.id);
        // Get current quantity
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          const currentQty = itemSnap.data().quantity || 0;
          const newQty = Math.max(0, currentQty - Number(item.quantity));
          await updateDoc(itemRef, { quantity: newQty });
        }
      }
    }
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    setInvoiceError('');
    setInvoiceSuccess('');
    const { invoiceId, date, customerName, items, totalAmount } = invoiceForm;
    if (!invoiceId || !date || !customerName || items.length === 0 || totalAmount <= 0) {
      setInvoiceError('All fields are required and at least one item must be added.');
      return;
    }
    try {
      await saveInvoice(invoiceForm);
      setInvoiceSuccess('Invoice created successfully!');
      setInvoiceModalOpen(false);
    } catch (err) {
      setInvoiceError('Failed to create invoice.');
    }
  };

  // Fetch inventory for AJAX search in invoice modal
  React.useEffect(() => {
    if (!invoiceModalOpen || !user) return;
    const fetchOptions = async () => {
      const q = query(collection(db, 'inventory'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      setItemOptions(snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().productName,
        quantity: doc.data().quantity,
        sellPrice: doc.data().sellPrice
      })));
    };
    fetchOptions();
  }, [invoiceModalOpen, user]);

  const handleAddItemToInvoice = (item) => {
    if (!item || item.quantity === 0) return;
    setInvoiceForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: item.id,
          name: item.name,
          quantity: 1,
          maxQuantity: item.quantity,
          sellPrice: item.sellPrice
        }
      ]
    }));
    setSelectedItem(null);
  };

  // --- Invoice Modal Item Edit/Remove Controls ---
  const handleInvoiceItemChange = (idx, field, value) => {
    setInvoiceForm(prev => {
      const items = [...prev.items];
      if (field === 'quantity') {
        // Clamp quantity between 1 and maxQuantity
        let qty = Math.max(1, Math.min(Number(value), items[idx].maxQuantity));
        items[idx].quantity = qty;
      } else if (field === 'sellPrice') {
        items[idx].sellPrice = Math.max(0, Number(value));
      }
      // Recalculate totalAmount
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.sellPrice)), 0);
      return { ...prev, items, totalAmount };
    });
  };

  const handleRemoveInvoiceItem = (idx) => {
    setInvoiceForm(prev => {
      const items = prev.items.filter((_, i) => i !== idx);
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.sellPrice)), 0);
      return { ...prev, items, totalAmount };
    });
  };

  // Update totalAmount if items change (e.g., when adding an item)
  React.useEffect(() => {
    if (!invoiceModalOpen) return;
    setInvoiceForm(prev => {
      const totalAmount = prev.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.sellPrice)), 0);
      return { ...prev, totalAmount };
    });
    // eslint-disable-next-line
  }, [invoiceForm.items.length, invoiceModalOpen]);

  // --- Invoice List Search/Sort State and Logic ---
  const handleInvoiceSort = (field) => {
    if (invoiceSortField === field) {
      setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setInvoiceSortField(field);
      setInvoiceSortOrder('asc');
    }
  };

  const sortedFilteredInvoiceList = React.useMemo(() => {
    let filtered = invoiceList.filter(inv => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        (inv.invoiceId && inv.invoiceId.toLowerCase().includes(term)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(term)) ||
        (inv.customerPhone && inv.customerPhone.toLowerCase().includes(term))
      );
    });
    let sorted = [...filtered];
    sorted.sort((a, b) => {
      let aVal, bVal;
      switch (invoiceSortField) {
        case 'invoiceId':
          aVal = a.invoiceId || '';
          bVal = b.invoiceId || '';
          break;
        case 'customerName':
          aVal = a.customerName || '';
          bVal = b.customerName || '';
          break;
        case 'date':
          aVal = a.date || '';
          bVal = b.date || '';
          break;
        case 'total': {
          const aSubtotal = a.items ? a.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0) : 0;
          const aGst = a.gst ? (aSubtotal * a.gst / 100) : 0;
          const aDiscount = a.discount || 0;
          aVal = Math.max(0, aSubtotal + aGst - aDiscount);
          const bSubtotal = b.items ? b.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0) : 0;
          const bGst = b.gst ? (bSubtotal * b.gst / 100) : 0;
          const bDiscount = b.discount || 0;
          bVal = Math.max(0, bSubtotal + bGst - bDiscount);
          break;
        }
        case 'paid':
          aVal = a.paid || 0;
          bVal = b.paid || 0;
          break;
        case 'due': {
          const aSubtotal = a.items ? a.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0) : 0;
          const aGst = a.gst ? (aSubtotal * a.gst / 100) : 0;
          const aDiscount = a.discount || 0;
          const aPaid = a.paid || 0;
          aVal = Math.max(0, aSubtotal + aGst - aDiscount - aPaid);
          const bSubtotal = b.items ? b.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0) : 0;
          const bGst = b.gst ? (bSubtotal * b.gst / 100) : 0;
          const bDiscount = b.discount || 0;
          const bPaid = b.paid || 0;
          bVal = Math.max(0, bSubtotal + bGst - bDiscount - bPaid);
          break;
        }
        default:
          aVal = a.invoiceId || '';
          bVal = b.invoiceId || '';
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return invoiceSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return invoiceSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
    return sorted;
  }, [invoiceList, searchTerm, invoiceSortField, invoiceSortOrder]);

  // --- Invoice List Export CSV Handler ---
  const handleExportInvoicesCSV = () => {
    if (sortedFilteredInvoiceList.length === 0) {
      setInvoiceError('No invoices to export.');
      return;
    }
    const csvRows = [
      ['Sl. No', 'Invoice ID', 'Customer Name', 'Date', 'Total', 'Paid', 'Due'],
      ...sortedFilteredInvoiceList.map((inv, idx) => {
        const subtotal = inv.items ? inv.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0) : 0;
        const gst = inv.gst ? (subtotal * inv.gst / 100) : 0;
        const discount = inv.discount || 0;
        const total = Math.max(0, subtotal + gst - discount);
        const paid = inv.paid || 0;
        const due = Math.max(0, total - paid);
        return [
          idx + 1,
          inv.invoiceId,
          inv.customerName,
          inv.date,
          total.toFixed(2),
          paid.toFixed(2),
          due.toFixed(2)
        ];
      })
    ];
    const csvContent = csvRows.map(row => row.map(String).map(v => '"' + v.replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Dashboard Total Cards Data ---
  const totalStockUnits = inventoryList.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalBuyPrice = inventoryList.reduce((sum, item) => sum + Number(item.buyPrice) * Number(item.quantity), 0);
  const productCount = inventoryList.length;
  const outOfStockCount = inventoryList.filter(item => Number(item.quantity) === 0).length;
  const totalInvoices = invoiceList.length;
  const totalInvoiceAmount = invoiceList.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const totalDueInvoices = invoiceList.filter(inv => Number(inv.due) > 0).length;
  const totalDueAmount = invoiceList.reduce((sum, inv) => sum + (Number(inv.due) || 0), 0);
  const salesData = React.useMemo(() => getSalesDataByRange(invoiceList, salesRange), [invoiceList, salesRange]);
  
  const profitLossData = React.useMemo(() => getProfitLossDataByRange(invoiceList, inventoryList, profitLossRange), [invoiceList, inventoryList, profitLossRange]);

  // Fetch and show saved business name and phone from DB on tab open
  React.useEffect(() => {
<<<<<<< HEAD
    if (value === 3 && user) {
=======
    if (user) {
>>>>>>> 388b6d2 (deploy)
      const fetchProfile = async () => {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.businessName) setProfileBusinessName(data.businessName);
          if (data.phone) setProfilePhone(data.phone);
        }
      };
      fetchProfile();
    }
    // eslint-disable-next-line
  }, [value, user]);

<<<<<<< HEAD
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
=======
  // Only show on supported browsers
  React.useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaAnchorEl(document.body); // Show popover
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Hide popover if already installed (for most browsers)
  React.useEffect(() => {
    function handleAppInstalled() {
      setPwaAnchorEl(null);
    }
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* PWA Install Popover */}
      <Popover
        open={Boolean(pwaAnchorEl && deferredPrompt)}
        anchorEl={pwaAnchorEl}
        onClose={() => setPwaAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { p: 2, maxWidth: 320 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <InfoIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>Install this app</Typography>
        </Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          For a better experience, install this app to your device's home screen.
        </Typography>
        <Button
          variant="contained"
          onClick={async () => {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              const choiceResult = await deferredPrompt.userChoice;
              if (choiceResult.outcome === 'accepted') {
                setPwaAnchorEl(null);
              }
              setDeferredPrompt(null);
            }
          }}
        >
          Install
        </Button>
      </Popover>
>>>>>>> 388b6d2 (deploy)
      <Container sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!isSignedIn ? (
          <Box sx={{ width: '100%', maxWidth: 400, p: 3, bgcolor: 'white', borderRadius: 2, boxShadow: 2 }}>
            <Stack spacing={3} alignItems="center">
              <Typography variant="h5" fontWeight={600} align="center">
                Welcome! Please Sign In or Sign Up
              </Typography>
              <Button
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={handleSignIn}
                fullWidth
                disabled={loading}
                sx={{ py: 1.5, fontSize: 16 }}
              >
                Sign In & Sign Up
              </Button>
              
            </Stack>
          </Box>
        ) : value === 1 ? (
          <Box sx={{ width: '100%', maxWidth: 600, p: { xs: 2, sm: 4 }, bgcolor: 'white', borderRadius: 2, boxShadow: 2, m: { xs: 1, sm: 3 } }}>
            <Typography variant="h5" fontWeight={600} align="center" sx={{ mb: 2 }}>Add Inventory Item</Typography>
            <form onSubmit={handleInventorySubmit}>
              <TextField
                margin="dense"
                label="Product Name"
                name="productName"
                fullWidth
                value={inventoryForm.productName}
                onChange={handleInventoryChange}
                required
              />
              <TextField
                margin="dense"
                label="Quantity"
                name="quantity"
                type="number"
                fullWidth
                value={inventoryForm.quantity}
                onChange={handleInventoryChange}
                required
                inputProps={{ min: 1, step: 1 }}
                helperText="Must be a positive integer"
              />
              <TextField
                margin="dense"
                label="Buy Price"
                name="buyPrice"
                type="number"
                fullWidth
                value={inventoryForm.buyPrice}
                onChange={handleInventoryChange}
                required
                inputProps={{ min: 1, step: 1 }}
                helperText="Must be a positive integer"
              />
              <TextField
                margin="dense"
                label="Sell Price"
                name="sellPrice"
                type="number"
                fullWidth
                value={inventoryForm.sellPrice}
                onChange={handleInventoryChange}
                required
                inputProps={{ min: 1, step: 1 }}
                helperText="Must be a positive integer"
              />
              {inventoryError && <Typography color="error" sx={{ mt: 1 }}>{inventoryError}</Typography>}
              {inventorySuccess && <Typography color="primary" sx={{ mt: 1 }}>{inventorySuccess}</Typography>}
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Save Item</Button>
            </form>
            {/* Inventory List Table */}
            <Box sx={{ mt: 4, overflowX: 'auto', mb: 4, width: '100%' }}>
              <Typography variant="h6" fontWeight={500} align="center" sx={{ mb: 1 }}>Inventory Items</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <TextField
                  size="small"
                  label="Search by Name"
                  variant="outlined"
                  sx={{ maxWidth: 250 }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined" onClick={handleExportCSV} sx={{ minWidth: 140 }}>
                    Export CSV
                  </Button>
                  {selectedIds.length > 0 && (
                    <Button color="error" variant="contained" size="small" onClick={handleDeleteSelected}>
                      Delete Selected
                    </Button>
                  )}
                </Box>
              </Box>
              <Box component="table" sx={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', background: '#fafbfc', borderRadius: 1, overflow: 'auto', boxShadow: 1 }}>
                <Box component="thead">
                  <Box component="tr" sx={{ bgcolor: '#f0f0f0' }}>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15 }}>
                      <input type="checkbox" checked={selectedIds.length === inventoryList.length && inventoryList.length > 0} onChange={e => setSelectedIds(e.target.checked ? inventoryList.map(i => i.id) : [])} />
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleSort('slno')}>
                      Sl. No {sortField === 'slno' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleSort('productName')}>
                      Name {sortField === 'productName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleSort('quantity')}>
                      Quantity {sortField === 'quantity' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleSort('buyPrice')}>
                      Buy Price {sortField === 'buyPrice' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleSort('sellPrice')}>
                      Sell Price {sortField === 'sellPrice' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleSort('totalBuyPrice')}>
                      Total Buy Price {sortField === 'totalBuyPrice' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleSort('totalSellPrice')}>
                      Total Sell Price {sortField === 'totalSellPrice' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15 }}>Edit</Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15 }}>Delete</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {sortedInventoryList.filter(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                    <Box component="tr">
                      <Box component="td" colSpan={9} sx={{ textAlign: 'center', p: 2, color: '#888' }}>
                        No items found.
                      </Box>
                    </Box>
                  ) : (
                    sortedInventoryList.filter(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                      <Box component="tr" key={item.id} sx={{ '&:nth-of-type(even)': { bgcolor: '#f9f9f9' } }}>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectRow(item.id)} />
                        </Box>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>{item.slno}</Box>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, textTransform: 'capitalize' }}>
                          {editId === item.id ? (
                            <TextField name="productName" value={editForm.productName} onChange={handleEditChange} size="small" />
                          ) : (
                            item.productName
                          )}
                        </Box>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                          {editId === item.id ? (
                            <TextField name="quantity" value={editForm.quantity} onChange={handleEditChange} size="small" type="number" inputProps={{ min: 1, step: 1 }} />
                          ) : (
                            item.quantity
                          )}
                        </Box>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                          {editId === item.id ? (
                            <TextField name="buyPrice" value={editForm.buyPrice} onChange={handleEditChange} size="small" type="number" inputProps={{ min: 1, step: 1 }} />
                          ) : (
                            item.buyPrice
                          )}
                        </Box>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                          {editId === item.id ? (
                            <TextField name="sellPrice" value={editForm.sellPrice} onChange={handleEditChange} size="small" type="number" inputProps={{ min: 1, step: 1 }} />
                          ) : (
                            item.sellPrice
                          )}
                        </Box>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                          {Number(item.buyPrice) * Number(item.quantity)}
                        </Box>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                          {Number(item.sellPrice) * Number(item.quantity)}
                        </Box>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                          {editId === item.id ? (
                            <>
                              <Button size="small" color="primary" variant="contained" sx={{ mr: 1 }} onClick={() => handleEditSave(item.id)}>Save</Button>
                              <Button size="small" color="inherit" variant="outlined" onClick={handleEditCancel}>Cancel</Button>
                            </>
                          ) : (
                            <Button size="small" variant="outlined" onClick={() => handleEditClick(item)}>Edit</Button>
                          )}
                        </Box>
                        <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                          <Button color="error" variant="contained" size="small" onClick={() => { setDeleteTargetId(item.id); setDeleteConfirmOpen(true); }}>
                            Delete
                          </Button>
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </Box>
            <Box sx={{ height: 32 }} /> {/* Extra bottom margin for inventory tab */}
          </Box>
        ) : value === 2 ? (
          <Box sx={{ width: '100%', maxWidth: 900, p: { xs: 2, sm: 4 }, bgcolor: 'white', borderRadius: 2, boxShadow: 2, m: { xs: 1, sm: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" fontWeight={600}>Invoices</Typography>
              <Button variant="contained" color="primary" onClick={handleOpenInvoiceModal}>
                + Create Invoice
              </Button>
            </Box>
            {/* Invoice List Table */}
            <Box sx={{ mt: 2, mb: 4, overflowX: 'auto', width: '100%' }}>
              <Typography variant="h6" fontWeight={500} align="center" sx={{ mb: 1 }}>Invoice List</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <TextField
                  size="small"
                  label="Search by Invoice ID, Customer Name, or Phone"
                  variant="outlined"
                  sx={{ maxWidth: 350 }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined" onClick={handleExportInvoicesCSV} sx={{ minWidth: 140 }}>
                    Export CSV
                  </Button>
                  {selectedInvoiceIds.length > 0 && (
                    <Button color="error" variant="contained" size="small" onClick={handleDeleteSelectedInvoices}>
                      Delete Selected
                    </Button>
                  )}
                </Box>
              </Box>
              <Box component="table" sx={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', background: '#fafbfc', borderRadius: 1, overflow: 'auto', boxShadow: 1 }}>
                <Box component="thead">
                  <Box component="tr" sx={{ bgcolor: '#f0f0f0' }}>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15 }}>
                      <input type="checkbox" checked={selectedInvoiceIds.length === sortedFilteredInvoiceList.length && sortedFilteredInvoiceList.length > 0} onChange={e => setSelectedInvoiceIds(e.target.checked ? sortedFilteredInvoiceList.map(i => i.invoiceId) : [])} />
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleInvoiceSort('slno')}>
                      Sl. No {invoiceSortField === 'slno' ? (invoiceSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleInvoiceSort('invoiceId')}>
                      Invoice ID {invoiceSortField === 'invoiceId' ? (invoiceSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleInvoiceSort('customerName')}>
                      Customer Name {invoiceSortField === 'customerName' ? (invoiceSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleInvoiceSort('date')}>
                      Date {invoiceSortField === 'date' ? (invoiceSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleInvoiceSort('total')}>
                      Total {invoiceSortField === 'total' ? (invoiceSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleInvoiceSort('paid')}>
                      Paid {invoiceSortField === 'paid' ? (invoiceSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                    <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => handleInvoiceSort('due')}>
                      Due {invoiceSortField === 'due' ? (invoiceSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {sortedFilteredInvoiceList.length > 0 ? (
                    sortedFilteredInvoiceList.map((inv, idx) => {
                      const subtotal = inv.items ? inv.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0) : 0;
                      const gst = inv.gst ? (subtotal * inv.gst / 100) : 0;
                      const discount = inv.discount || 0;
                      const total = Math.max(0, subtotal + gst - discount);
                      const paid = inv.paid || 0;
                      const due = Math.max(0, total - paid);
                      return (
                        <Box component="tr" key={inv.id || inv.invoiceId} sx={{ '&:nth-of-type(even)': { bgcolor: '#f9f9f9' } }}>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                            <input type="checkbox" disabled={true} checked={selectedInvoiceIds.includes(inv.invoiceId)} onChange={() => handleSelectInvoiceRow(inv.invoiceId)} />
                          </Box>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>{idx + 1}</Box>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>{inv.invoiceId}</Box>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>{inv.customerName}</Box>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>{inv.date}</Box>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>₹{total.toFixed(2)}</Box>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>₹{paid.toFixed(2)}</Box>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>₹{due.toFixed(2)}</Box>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                            <Button size="small" variant="outlined" onClick={() => {
                              setSelectedInvoiceForView(inv);
                              setInvoiceViewOpen(true);
                            }}>
                              View
                            </Button>
                            {due > 0 && (
                              <Button size="small" color="success" variant="contained" sx={{ m: 2 }} onClick={() => {
                                setPendingPayment({
                                  invoiceId: inv.id || inv.invoiceId,
                                  prevPaid: paid,
                                  addVal: 0,
                                  subtotal,
                                  gst,
                                  discount
                                });
                                setConfirmPaymentOpen(true);
                              }}>
                                Update Payment
                              </Button>
                            )}
                          </Box>
                          <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1.5 }}>
                            <Button color="error" variant="contained" size="small" onClick={() => { setDeleteInvoiceTargetId(inv.invoiceId); setDeleteInvoiceConfirmOpen(true); }}>
                              Delete
                            </Button>
                          </Box>
                        </Box>
                      );
                    })
                  ) : (
                    <Box component="tr">
                      <Box component="td" colSpan={7} sx={{ textAlign: 'center', p: 2, color: '#888' }}>
                        No invoices found.
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
            {/* End Invoice List Table */}
            {invoiceModalOpen && (
              <Dialog open={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogContent>
                  <TextField
                    margin="dense"
                    label="Invoice ID"
                    name="invoiceId"
                    fullWidth
                    value={invoiceForm.invoiceId}
                    onChange={handleInvoiceIdChange}
                    error={!!invoiceIdError}
                    helperText={invoiceIdError || 'Format: INVYYYYMMDD0000'}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="dense"
                    label="Date"
                    name="date"
                    type="date"
                    fullWidth
                    value={invoiceForm.date}
                    onChange={handleInvoiceChange}
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="dense"
                    label="Customer Name"
                    name="customerName"
                    fullWidth
                    value={invoiceForm.customerName}
                    onChange={handleInvoiceChange}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="dense"
                    label="Customer Phone"
                    name="customerPhone"
                    fullWidth
                    value={invoiceForm.customerPhone}
                    onChange={handleInvoiceChange}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="dense"
                    label="Customer Details (optional)"
                    name="customerDetails"
                    fullWidth
                    value={invoiceForm.customerDetails}
                    onChange={handleInvoiceChange}
                    sx={{ mb: 2 }}
                  />
                  <Autocomplete
                    options={itemOptions.filter(opt => !invoiceForm.items.some(i => i.id === opt.id))}
                    getOptionLabel={option => `${option.name} (Qty: ${option.quantity})`}
                    filterOptions={(options, state) => options.filter(opt => opt.name && opt.name.toLowerCase().includes(state.inputValue.toLowerCase()))}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={selectedItem}
                    onChange={(e, value) => handleAddItemToInvoice(value)}
                    renderInput={params => (
                      <TextField {...params} label="Add Item from Inventory" margin="dense" sx={{ mb: 2 }} />
                    )}
                    getOptionDisabled={option => option.quantity === 0}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                    onClick={() => {
                      setInvoiceForm(prev => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          {
                            id: `other-${Date.now()}`,
                            isOther: true,
                            name: '',
                            quantity: 1,
                            sellPrice: 1,
                            maxQuantity: 999999 // Arbitrary large number for UI
                          }
                        ]
                      }));
                    }}
                  >
                    + Add Other Item
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2, ml: 1 }}
                    onClick={() => {
                      setInvoiceForm(prev => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          {
                            id: `service-${Date.now()}`,
                            isService: true,
                            name: '',
                            quantity: 1, // Always 1 for service
                            sellPrice: 1,
                            maxQuantity: 1
                          }
                        ]
                      }));
                    }}
                  >
                    + Add Service
                  </Button>
                  {invoiceForm.items.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Selected Items:</Typography>
                      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', mb: 1, bgcolor: '#f8f8f8', borderRadius: 1, overflow: 'hidden' }}>
                        <Box component="thead">
                          <Box component="tr">
                            <Box component="th" sx={{ p: 1, fontWeight: 600 }}>Name</Box>
                            <Box component="th" sx={{ p: 1, fontWeight: 600 }}>Quantity</Box>
                            <Box component="th" sx={{ p: 1, fontWeight: 600 }}>Price</Box>
                            <Box component="th" sx={{ p: 1, fontWeight: 600 }}>Total</Box>
                            <Box component="th" sx={{ p: 1, fontWeight: 600 }}></Box>
                          </Box>
                        </Box>
                        <Box component="tbody">
                          {invoiceForm.items.map((item, idx) => {
                            const quantityError = item.quantity < 1 || item.quantity > (item.maxQuantity || 999999);
                            const priceError = item.sellPrice < 1;
                            const nameError = (item.isOther || item.isService) && !item.name.trim();
                            return (
                              <Box component="tr" key={item.id}>
                                <Box component="td" sx={{ p: 1, minWidth: 120 }}>
                                  {(item.isOther || item.isService) ? (
                                    <TextField
                                      size="small"
                                      value={item.name}
                                      error={nameError}
                                      helperText={nameError ? 'Required' : ''}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setInvoiceForm(prev => {
                                          const items = [...prev.items];
                                          items[idx] = { ...items[idx], name: val };
                                          return { ...prev, items };
                                        });
                                      }}
                                      placeholder={item.isService ? "Service Name" : "Other Product Name"}
                                    />
                                  ) : (
                                    item.name
                                  )}
                                </Box>
                                <Box component="td" sx={{ p: 1, minWidth: 90 }}>
                                  {item.isService ? (
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={1}
                                      inputProps={{ readOnly: true }}
                                      sx={{ width: 70 }}
                                    />
                                  ) : (
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={item.quantity}
                                      inputProps={{ min: 1, max: item.maxQuantity || 999999, step: 1 }}
                                      error={quantityError}
                                      helperText={quantityError ? `1-${item.maxQuantity || 999999}` : ''}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        setInvoiceForm(prev => {
                                          const items = [...prev.items];
                                          items[idx] = { ...items[idx], quantity: val };
                                          return { ...prev, items };
                                        });
                                      }}
                                      sx={{ width: 70 }}
                                    />
                                  )}
                                </Box>
                                <Box component="td" sx={{ p: 1, minWidth: 90 }}>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={item.sellPrice}
                                    inputProps={{ min: 1, step: 1 }}
                                    error={priceError}
                                    helperText={priceError ? 'Min 1' : ''}
                                    onChange={e => {
                                      const val = Number(e.target.value);
                                      setInvoiceForm(prev => {
                                        const items = [...prev.items];
                                        items[idx] = { ...items[idx], sellPrice: val };
                                        return { ...prev, items };
                                      });
                                    }}
                                    sx={{ width: 90 }}
                                  />
                                </Box>
                                <Box component="td" sx={{ p: 1 }}>
                                  {item.quantity * item.sellPrice}
                                </Box>
                                <Box component="td" sx={{ p: 1 }}>
                                  <Button size="small" color="error" onClick={() => {
                                    setInvoiceForm(prev => ({
                                      ...prev,
                                      items: prev.items.filter((_, i) => i !== idx)
                                    }));
                                  }}>Remove</Button>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </Box>
                  )}
                  <TextField
                    margin="dense"
                    label="GST (%)"
                    name="gst"
                    type="number"
                    fullWidth
                    value={invoiceForm.gst || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setInvoiceForm(prev => ({ ...prev, gst: val }));
                    }}
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="dense"
                    label="Discount (₹)"
                    name="discount"
                    type="number"
                    fullWidth
                    value={invoiceForm.discount || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setInvoiceForm(prev => ({ ...prev, discount: val }));
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="dense"
                    label="Paid (₹)"
                    name="paid"
                    type="number"
                    fullWidth
                    value={invoiceForm.paid || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      // Calculate total for max limit
                      const subtotal = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                      const gst = invoiceForm.gst ? (subtotal * invoiceForm.gst / 100) : 0;
                      const discount = invoiceForm.discount || 0;
                      const total = Math.max(0, subtotal + gst - discount);
                      setInvoiceForm(prev => ({ ...prev, paid: Math.min(val, total) }));
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="dense"
                    label="Due (₹)"
                    name="due"
                    type="number"
                    fullWidth
                    value={(() => {
                      const total = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                      const gst = invoiceForm.gst ? (total * invoiceForm.gst / 100) : 0;
                      const discount = invoiceForm.discount || 0;
                      const paid = invoiceForm.paid || 0;
                      return Math.max(0, total + gst - discount - paid).toFixed(2);
                    })()}
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="dense"
                    label="Total Amount"
                    name="totalAmount"
                    type="number"
                    fullWidth
                    value={(() => {
                      const total = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                      const gst = invoiceForm.gst ? (total * invoiceForm.gst / 100) : 0;
                      const discount = invoiceForm.discount || 0;
                      return Math.max(0, total + gst - discount).toFixed(2);
                    })()}
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 2 }}
                  />
                  {invoiceError && <Typography color="error" sx={{ mt: 1 }}>{invoiceError}</Typography>}
                  {invoiceSuccess && <Typography color="primary" sx={{ mt: 1 }}>{invoiceSuccess}</Typography>}
                  {/* Invoice Preview Section */}
                  <Box sx={{ mt: 4, p: 2, bgcolor: '#f9f9f9', borderRadius: 2, boxShadow: 1 }}>
                    <Typography variant="h6" fontWeight={600} align="center" sx={{ mb: 2 }}>Invoice Preview</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        {/* User/Business Details */}
<<<<<<< HEAD
                        <Typography variant="subtitle2">Business: <b>{extraData.businessName || "Business"}</b></Typography>
                        
                        <Typography variant="subtitle2">Phone: <b>{user?.phoneNumber || extraData.phone || '-'}</b></Typography>
=======
                        <Typography variant="subtitle2">Business: <b>{user?.businessName || "Business"}</b></Typography>
                        
                        <Typography variant="subtitle2">Phone: <b>{user?.phone || extraData.phone || '-'}</b></Typography>
>>>>>>> 388b6d2 (deploy)
                        <Typography variant="subtitle2">Email: <b>{user?.email || '-'}</b></Typography>
                        {/* Invoice/Customer Details */}
                        <Typography variant="subtitle2">Invoice ID: <b>{invoiceForm.invoiceId}</b></Typography>
                        <Typography variant="subtitle2">Date: <b>{invoiceForm.date}</b></Typography>
                        <Typography variant="subtitle2">Customer: <b>{invoiceForm.customerName}</b></Typography>
                        <Typography variant="subtitle2">Customer Phone: <b>{invoiceForm.customerPhone}</b></Typography>
                        {invoiceForm.customerDetails && <Typography variant="subtitle2">Details: <b>{invoiceForm.customerDetails}</b></Typography>}
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="subtitle2">GST: <b>{invoiceForm.gst || 0}%</b></Typography>
                        <Typography variant="subtitle2">Discount: <b>₹{invoiceForm.discount || 0}</b></Typography>
                        <Typography variant="subtitle2">Paid: <b>₹{invoiceForm.paid || 0}</b></Typography>
                        <Typography variant="subtitle2">Due: <b>₹{(() => {
                          const total = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                          const gst = invoiceForm.gst ? (total * invoiceForm.gst / 100) : 0;
                          const discount = invoiceForm.discount || 0;
                          const paid = invoiceForm.paid || 0;
                          return Math.max(0, total + gst - discount - paid).toFixed(2);
                        })()}</b></Typography>
                      </Box>
                    </Box>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', mt: 2, mb: 2 }}>
                      <Box component="thead">
                        <Box component="tr">
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight: 600 }}>#</Box>
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight:  600 }}>Item/Service</Box>
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight: 600 }}>Qty</Box>
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight: 600 }}>Price</Box>
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight: 600 }}>Total</Box>
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {invoiceForm.items.map((item, idx) => (
                          <Box component="tr" key={item.id}>
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>{idx + 1}</Box>
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>{item.name}</Box>
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>{item.quantity}</Box>
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>₹{item.sellPrice}</Box>
<<<<<<< HEAD
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>₹{item.quantity * item.sellPrice}</Box>
=======
                            <Box component="td" sx={{ border:  1, borderColor: '#e0e0e0', p: 1 }}>₹{item.quantity * item.sellPrice}</Box>
>>>>>>> 388b6d2 (deploy)
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, mt: 2 }}>
                      <Box>
                        <Typography variant="subtitle2">Subtotal: <b>₹{invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0).toFixed(2)}</b></Typography>
                        <Typography variant="subtitle2">GST: <b>₹{(() => {
                          const subtotal = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                          return invoiceForm.gst ? (subtotal * invoiceForm.gst / 100).toFixed(2) : '0.00';
                        })()}</b></Typography>
                        <Typography variant="subtitle2">Discount: <b>₹{invoiceForm.discount || 0}</b></Typography>
                        <Typography variant="subtitle2">Total: <b>₹{(() => {
                          const subtotal = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                          const gst = invoiceForm.gst ? (subtotal * invoiceForm.gst / 100) : 0;
                          const discount = invoiceForm.discount || 0;
                          return Math.max(0, subtotal + gst - discount).toFixed(2);
                        })()}</b></Typography>
                        <Typography variant="subtitle2">Paid: <b>₹{invoiceForm.paid || 0}</b></Typography>
                        <Typography variant="subtitle2">Due: <b>₹{(() => {
                          const subtotal = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                          const gst = invoiceForm.gst ? (subtotal * invoiceForm.gst / 100) : 0;
                          const discount = invoiceForm.discount || 0;
                          const paid = invoiceForm.paid || 0;
                          return Math.max(0, subtotal + gst - discount - paid).toFixed(2);
                        })()}</b></Typography>
                      </Box>
                    </Box>
                  </Box>
<<<<<<< HEAD
                                   {/* End Invoice Preview */}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setInvoiceModalOpen(false)} color="inherit">
                    Cancel
                  </Button>
                  <Button onClick={handleInvoiceSubmit} variant="contained" color="primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Invoice'}
                  </Button>
                </DialogActions>
              </Dialog>
            )}
            {/* Invoice View Dialog */}
            {invoiceViewOpen && selectedInvoiceForView && (
              <Dialog open={invoiceViewOpen} onClose={() => setInvoiceViewOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Invoice Receipt</DialogTitle>
                <DialogContent>
                  {/* Receipt/Invoice Format - similar to preview */}
                  <Box id="invoice-receipt-print" sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius:  2, boxShadow: 1 }}>
                    <Typography variant="h6" fontWeight={600} align="center" sx={{ mb: 2 }}>Invoice</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2">Business: <b>{extraData.businessName || "Business"}</b></Typography>
                        <Typography variant="subtitle2">Phone: <b>{user?.phoneNumber || extraData.phone || '-'}</b></Typography>
=======
                                
                                          </DialogContent>
                                          <DialogActions>
                                            <Button onClick={() => setInvoiceModalOpen(false)} color="inherit">
                                            Cancel
                                            </Button>
                                            <Button onClick={handleInvoiceSubmit} variant="contained" color="primary" disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Invoice'}
                                            </Button>
                                          </DialogActions>
                                          </Dialog>
                                        )}
                                        
                                        {invoiceViewOpen && selectedInvoiceForView && (
                                          <Dialog open={invoiceViewOpen} onClose={() => setInvoiceViewOpen(false)} maxWidth="md" fullWidth>
                                          <DialogTitle>Invoice Receipt</DialogTitle>
                                          <DialogContent>
                                            <Box id="invoice-receipt-print" sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 2, boxShadow: 1 }}></Box>
                  <Box id="invoice-receipt-print" sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 2, boxShadow: 1 }}>
                    <Typography variant="h6" fontWeight={600} align="center" sx={{ mb: 2 }}>Invoice</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                       
                        <Typography variant="subtitle2">
                          Business: <b>
                            { profileBusinessName }
                          </b>
                        </Typography>
                        <Typography variant="subtitle2">Phone: <b>{profilePhone}</b></Typography>
>>>>>>> 388b6d2 (deploy)
                        <Typography variant="subtitle2">Email: <b>{user?.email || '-'}</b></Typography>
                        <Typography variant="subtitle2">Invoice ID: <b>{selectedInvoiceForView.invoiceId}</b></Typography>
                        <Typography variant="subtitle2">Date: <b>{selectedInvoiceForView.date}</b></Typography>
                        <Typography variant="subtitle2">Customer: <b>{selectedInvoiceForView.customerName}</b></Typography>
                        <Typography variant="subtitle2">Customer Phone: <b>{selectedInvoiceForView.customerPhone}</b></Typography>
<<<<<<< HEAD
                        {selectedInvoiceForView.customerDetails && <Typography variant="subtitle2">Details: <b>{selectedInvoiceForView.customerDetails}</b></Typography>}
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="subtitle2">GST: <b>{selectedInvoiceForView.gst || 0}%</b></Typography>
                        <Typography variant="subtitle2">Discount: <b>₹{selectedInvoiceForView.discount || 0}</b></Typography>
                        <Typography variant="subtitle2">Paid: <b>₹{selectedInvoiceForView.paid || 0}</b></Typography>
                        <Typography variant="subtitle2">Due: <b>₹{(() => {
=======
                        {selectedInvoiceForView.customerDetails && (
                          <Typography variant="subtitle2">
                            Details: <b>{selectedInvoiceForView.customerDetails}</b>
                          </Typography>
                        )}
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="subtitle2">GST: <b>{selectedInvoiceForView.gst || 0}%</b></Typography>
                          <Typography variant="subtitle2">Discount: <b>₹{selectedInvoiceForView.discount || 0}</b></Typography>
                          <Typography variant="subtitle2">Paid: <b>₹{selectedInvoiceForView.paid || 0}</b></Typography>
                          <Typography variant="subtitle2">Due: <b>{(() => {
>>>>>>> 388b6d2 (deploy)
                          const subtotal = selectedInvoiceForView.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                          const gst = selectedInvoiceForView.gst ? (subtotal * selectedInvoiceForView.gst / 100) : 0;
                          const discount = selectedInvoiceForView.discount || 0;
                          const paid = selectedInvoiceForView.paid || 0;
                          return Math.max(0, subtotal + gst - discount - paid).toFixed(2);
                        })()}</b></Typography>
                      </Box>
                    </Box>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', mt: 2, mb: 2 }}>
                      <Box component="thead">
                        <Box component="tr">
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight: 600 }}>#</Box>
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight:  600 }}>Item/Service</Box>
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight: 600 }}>Qty</Box>
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight: 600 }}>Price</Box>
                          <Box component="th" sx={{ border: 1, borderColor: '#e0e0e0', p: 1, fontWeight: 600 }}>Total</Box>
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {selectedInvoiceForView.items.map((item, idx) => (
                          <Box component="tr" key={item.id}>
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>{idx + 1}</Box>
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>{item.name}</Box>
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>{item.quantity}</Box>
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>₹{item.sellPrice}</Box>
                            <Box component="td" sx={{ border: 1, borderColor: '#e0e0e0', p: 1 }}>₹{item.quantity * item.sellPrice}</Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, mt: 2 }}>
                      <Box>
                        <Typography variant="subtitle2">Subtotal: <b>₹{selectedInvoiceForView.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0).toFixed(2)}</b></Typography>
                        <Typography variant="subtitle2">GST: <b>₹{(() => {
                          const subtotal = selectedInvoiceForView.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                          return selectedInvoiceForView.gst ? (subtotal * selectedInvoiceForView.gst / 100).toFixed(2) : '0.00';
                        })()}</b></Typography>
                        <Typography variant="subtitle2">Discount: <b>₹{selectedInvoiceForView.discount || 0}</b></Typography>
                        <Typography variant="subtitle2">Total: <b>₹{(() => {
                          const subtotal = selectedInvoiceForView.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                          const gst = selectedInvoiceForView.gst ? (subtotal * selectedInvoiceForView.gst / 100) : 0;
                          const discount = selectedInvoiceForView.discount || 0;
                          return Math.max(0, subtotal + gst - discount).toFixed(2);
                        })()}</b></Typography>
                        <Typography variant="subtitle2">Paid: <b>₹{selectedInvoiceForView.paid || 0}</b></Typography>
                        <Typography variant="subtitle2">Due: <b>₹{(() => {
                          const subtotal = selectedInvoiceForView.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
                          const gst = selectedInvoiceForView.gst ? (subtotal * selectedInvoiceForView.gst / 100) : 0;
                          const discount = selectedInvoiceForView.discount || 0;
                          const paid = selectedInvoiceForView.paid || 0;
                          return Math.max(0, subtotal + gst - discount - paid).toFixed(2);
                        })()}</b></Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                    <Button variant="contained" color="primary" onClick={() => {
                      const printContents = document.getElementById('invoice-receipt-print').innerHTML;
                      const printWindow = window.open('', '', 'height=700,width=900');
                      printWindow.document.write('<html><head><title>'+ selectedInvoiceForView.invoiceId +'</title>');
                      printWindow.document.write('<style>body{font-family:sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #e0e0e0;padding:8px;} th{background:#f0f0f0;}</style>');
                      printWindow.document.write('</head><body >');
                      printWindow.document.write(printContents);
                      printWindow.document.write('</body></html>');
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }}>
                      Print / PDF
                    </Button>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setInvoiceViewOpen(false)} color="inherit">Close</Button>
                </DialogActions>
              </Dialog>
            )}
          </Box>
        ) : value === 3 ? (
<<<<<<< HEAD
          <Box sx={{ width: '100%', maxWidth: 500, p: { xs: 2, sm: 4 }, bgcolor: 'white', borderRadius: 2, boxShadow: 2, m: { xs: 1, sm: 3 } }}>
=======
          <Box sx={{ width: '100%',  maxWidth: 500, p: { xs: 2, sm: 4 }, bgcolor: 'white', borderRadius: 2, boxShadow: 2, m: { xs: 1, sm: 3 } }}>
>>>>>>> 388b6d2 (deploy)
            <Typography variant="h5" fontWeight={600} align="center" sx={{ mb: 2 }}>Profile</Typography>
            {/* Fetch and show saved business name and phone from DB on tab open */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setProfileError('');
              setProfileSuccess('');
              // Check for duplicate business name or phone
              const q = query(collection(db, 'users'), where('businessName', '==', profileBusinessName));
              const q2 = query(collection(db, 'users'), where('phone', '==', profilePhone));
              const [snap1, snap2] = await Promise.all([getDocs(q), getDocs(q2)]);
              let duplicate = false;
              snap1.forEach(docu => { if (docu.id !== user.uid) duplicate = true; });
              snap2.forEach(docu => { if (docu.id !== user.uid) duplicate = true; });
              if (duplicate) {
                setProfileError('Business name or phone already exists.');
                return;
              }
              try {
                await updateDoc(doc(db, 'users', user.uid), { businessName: profileBusinessName, phone: profilePhone });
                setExtraData(prev => ({ ...prev, businessName: profileBusinessName, phone: profilePhone }));
                setProfileSuccess('Profile updated successfully!');
              } catch (err) {
                setProfileError('Error updating profile.');
              }
            }}>
<<<<<<< HEAD
=======
           
>>>>>>> 388b6d2 (deploy)
              <TextField
                margin="dense"
                label="Email"
                name="email"
                fullWidth
                value={user?.email || ''}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Full Name"
                name="fullName"
                fullWidth
                value={user?.displayName || ''}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Business Name"
                name="businessName"
                fullWidth
                value={profileBusinessName}
                onChange={e => setProfileBusinessName(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Phone"
                name="phone"
                fullWidth
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              {profileError && <Typography color="error" sx={{ mt: 1 }}>{profileError}</Typography>}
              {profileSuccess && <Typography color="primary" sx={{ mt: 1 }}>{profileSuccess}</Typography>}
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Update Profile</Button>
            </form>
            {value === 3 && (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                sx={{ mt: 3 }}
                onClick={async () => {
                  const auth = getAuth();
                  await signOut(auth);
                  setIsSignedIn(false);
<<<<<<< HEAD
=======
   
>>>>>>> 388b6d2 (deploy)
                  setUser(null);
                  setExtraData({ phone: '', businessName: '' });
                }}
              >
                Logout
              </Button>
            )}
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: '100%', md: 900 },
              p: { xs: 1, sm: 2, md: 4 },
              bgcolor: 'white',
              borderRadius: 2,
              boxShadow: 2,
              m: { xs: 0.5, sm: 1, md: 3 },
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, md: 3 },
            }}
          >
            <Typography variant="h4" fontWeight={700} align="center" sx={{ mb: 3, letterSpacing: 1 }}>
              Dashboard
            </Typography>
            {/* Responsive Cards Row */}
            <Box
              sx={{
                mb: 3,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: { xs: 2, sm: 3 },
                alignItems: 'stretch',
              }}
            >
              {/* Total Stock Units Card */}
              <Box sx={{ minWidth: 260, bgcolor: '#e3f2fd', borderRadius: 2, boxShadow: 1, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Inventory2Icon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total Stock Units</Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {inventoryList.reduce((sum, item) => sum + Number(item.quantity), 0)}
                  </Typography>
                </Box>
              </Box>
              {/* Total Buy Price Card */}
              <Box sx={{ minWidth: 260, bgcolor: '#fff3e0', borderRadius: 2, boxShadow: 1, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="h4" sx={{ color: 'orange' }}>₹</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total Buy Price</Typography>
                  <Typography variant="h5" fontWeight={700} color="orange">
                    {inventoryList.reduce((sum, item) => sum + Number(item.buyPrice) * Number(item.quantity), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>
              {/* Product Count Card */}
              <Box sx={{ minWidth: 260, bgcolor: '#e8f5e9', borderRadius: 2, boxShadow: 1, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="h4" sx={{ color: 'green' }}><Inventory2Icon sx={{ fontSize: 32, color: 'green' }} /></Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Products in Inventory</Typography>
                  <Typography variant="h5" fontWeight={700} color="green">
                    {inventoryList.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(() => {
                      const outOfStock = inventoryList.filter(item => Number(item.quantity) === 0).length;
                      return `${outOfStock} out of stock`;
                    })()}
                  </Typography>
                </Box>
              </Box>
            { /* Total Invoices Card */}
              <Box sx={{ minWidth: 260, bgcolor: '#ede7f6', borderRadius: 2, boxShadow: 1, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="h4" sx={{ color: '#673ab7' }}><ReceiptLongIcon sx={{ fontSize: 32, color: '#673ab7' }} /></Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total Orders</Typography>
                  <Typography variant="h5" fontWeight={700} color="#673ab7">
                    {invoiceList.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {invoiceList.length > 0
                      ? invoiceList.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }) + ' total amount'
                      : '0 total amount'}
                  </Typography>
                </Box>
              </Box>
              {/* Total Profit/Loss Card */}
              <Box sx={{ minWidth: 260, bgcolor: '#f3e5f5', borderRadius: 2, boxShadow: 1, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="h4" sx={{ color: '#8e24aa' }}>₹</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {(() => {
                      // Calculate total profit
                      let totalProfit = 0;
                      invoiceList.forEach(inv => {
                        if (Array.isArray(inv.items)) {
                          inv.items.forEach(item => {
                            let buyPrice = 0;
                            if (item.id && inventoryList.length > 0) {
                              const invItem = inventoryList.find(i => i.id === item.id);
                              if (invItem) buyPrice = Number(invItem.buyPrice) || 0;
                            }
                            totalProfit += ((Number(item.sellPrice) - buyPrice) * Number(item.quantity));
                          });
                        }
                      });
                      return totalProfit < 0 ? 'Total Loss (Invoices)' : 'Total Profit (Invoices)';
                    })()}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="#8e24aa">
                    {(() => {
                      let totalProfit = 0;
                      invoiceList.forEach(inv => {
                        if (Array.isArray(inv.items)) {
                          inv.items.forEach(item => {
                            let buyPrice = 0;
                            if (item.id && inventoryList.length > 0) {
                              const invItem = inventoryList.find(i => i.id === item.id);
                              if (invItem) buyPrice = Number(invItem.buyPrice) || 0;
                            }
                            totalProfit += ((Number(item.sellPrice) - buyPrice) * Number(item.quantity));
                          });
                        }
                      });
                      const absProfit = Math.abs(totalProfit);
                      return absProfit.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
                    })()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (excluding GST/discount)
                  </Typography>
                </Box>
              </Box>
              {/* Dues Card */}
              <Box sx={{ minWidth: 260, bgcolor: '#ffebee', borderRadius: 2, boxShadow: 1, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="h4" sx={{ color: '#d32f2f' }}><AccountBalanceWalletIcon sx={{ fontSize: 32, color: '#d32f2f' }} /></Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Invoices with Due</Typography>
                 <Typography variant="h5" fontWeight={700} color="#d32f2f">
  {invoiceList.filter(inv => Number(inv.totalAmount - inv.paid) > 0).length}
</Typography>
<Typography variant="caption" color="text.secondary">
  {(() => {
    const sumDue = invoiceList.reduce((sum, inv) => sum + (Number(inv.totalAmount - inv.paid) || 0), 0);
    return sumDue > 0
      ? sumDue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }) + ' total due'
      : '0 total due';
  })()}
</Typography>
                </Box>
              </Box>
              
            </Box>
            {/* Responsive Sales Graph */}
            <Box
              sx={{
                minWidth: { xs: '100%', md: 0 },
                width: '100%',
                flex: 1,
                bgcolor: '#f5f5f5',
                borderRadius: 2,
                boxShadow: 1,
                p: { xs: 1, sm: 2, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                overflowX: 'auto',
                mt: 3,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">Sales Graph</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {['today', 'week', 'month', 'year', 'all'].map(r => (
                  <Button
                    key={r}
                    size="small"
                    variant={salesRange === r ? 'contained' : 'outlined'}
                    onClick={() => setSalesRange(r)}
                  >
                    {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : r === 'year' ? 'This Year' : 'All Time'}
                  </Button>
                ))}
              </Box>
              <Box sx={{ width: '100%', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={250} minWidth={200}>
                  <LineChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={d => dayjs(d).format(salesRange === 'today' ? 'HH:mm' : 'DD MMM')} />
                    <YAxis tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={v => `₹${v}`} labelFormatter={d => dayjs(d).format('DD MMM YYYY')} />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#1976d2" name="Total Sales" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
            {/* Responsive Profit & Loss Graph */}
            <Box
              sx={{
                minWidth: { xs: '100%', md: 0 },
                width: '100%',
                flex: 1,
                bgcolor: '#f5f5f5',
                borderRadius: 2,
                boxShadow: 1,
                p: { xs: 1, sm: 2, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                mt: 3,
                overflowX: 'auto',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">Profit & Loss Graph</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {['today', 'week', 'month', 'year', 'all'].map(r => (
                  <Button
                    key={r}
                    size="small"
                    variant={profitLossRange === r ? 'contained' : 'outlined'}
                    onClick={() => setProfitLossRange(r)}
                  >
                    {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : r === 'year' ? 'This Year' : 'All Time'}
                  </Button>
                ))}
              </Box>
              <Box sx={{ width: '100%', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={250} minWidth={200}>
                  <LineChart data={profitLossData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={d => dayjs(d).format(profitLossRange === 'today' ? 'HH:mm' : 'DD MMM')} />
                    <YAxis tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={v => `₹${v}`} labelFormatter={d => dayjs(d).format('DD MMM YYYY')} />
                    <Legend />
                    <Line type="monotone" dataKey="profit" stroke="#388e3c" name="Profit" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="loss" stroke="#d32f2f" name="Loss" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
            <Box sx={{ height: 24 }} /> {/* Add bottom margin after graphs */}
          </Box>
        )}
      </Container>
      {isSignedIn && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: '#fff', borderTop: '1px solid #e0e0e0', boxShadow: '0 -2px 4px rgba(0,0,0,0.1)' }}>
          <BottomNavigation
            value={value}
            onChange={(event, newValue) => {
              setValue(newValue);
            }}
            showLabels
          >
            <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Inventory" icon={<Inventory2Icon />} />
            <BottomNavigationAction label="Invoices" icon={<ReceiptLongIcon />} />
            <BottomNavigationAction label="Account" icon={<AccountCircleIcon />} />
          </BottomNavigation>
        </Paper>
      )}
      {/* Confirm Payment Dialog */}
      {confirmPaymentOpen && pendingPayment && (
        <Dialog open={confirmPaymentOpen} onClose={() => setConfirmPaymentOpen(false)}>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to add a payment of ₹{pendingPayment.addVal} to this invoice?</Typography>
            <Typography sx={{ mt: 1 }}>Previous Paid: ₹{pendingPayment.prevPaid}</Typography>
            <Typography>New Paid: ₹{pendingPayment.prevPaid + pendingPayment.addVal}</Typography>
            <Typography>Previous Due: ₹{(pendingPayment.subtotal + pendingPayment.gst - pendingPayment.discount - pendingPayment.prevPaid).toFixed(2)}</Typography>
            <Typography>New Due: ₹{Math.max(0, pendingPayment.subtotal + pendingPayment.gst - pendingPayment.discount - pendingPayment.prevPaid - pendingPayment.addVal).toFixed(2)}</Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Add Payment (₹)"
              type="number"
              fullWidth
              value={pendingPayment.addVal}
              onChange={e => {
                let val = Number(e.target.value);
                if (isNaN(val) || val < 0) val = 0;
                // Clamp to max due
                const maxDue = pendingPayment.subtotal + pendingPayment.gst - pendingPayment.discount - pendingPayment.prevPaid;
                if (val > maxDue) val = maxDue;
                setPendingPayment(prev => ({ ...prev, addVal: val }));
              }}
              inputProps={{ min: 0, max: pendingPayment.subtotal + pendingPayment.gst - pendingPayment.discount - pendingPayment.prevPaid, step: 1 }}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmPaymentOpen(false)} color="inherit">Cancel</Button>
            <Button color="primary" variant="contained" onClick={async () => {
              const newPaid = pendingPayment.prevPaid + pendingPayment.addVal;
              const newDue = Math.max(0, pendingPayment.subtotal + pendingPayment.gst - pendingPayment.discount - newPaid);
              await updateDoc(doc(db, 'invoices', pendingPayment.invoiceId), {
                paid: newPaid,
                due: newDue
              });
              setSelectedInvoiceForView(prev => ({ ...prev, paid: newPaid, due: newDue, _addPaymentValue: '' }));
              setInvoiceList(prev => prev.map(inv => inv.invoiceId === pendingPayment.invoiceId ? { ...inv, paid: newPaid, due: newDue } : inv));
              setConfirmPaymentOpen(false);
              setPendingPayment(null);
            }}>Confirm</Button>
          </DialogActions>
        </Dialog>
      )}
      {/* Confirmation Dialog for Deleting Inventory Item */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this inventory item?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => {
            if (deleteTargetId) {
              await deleteDoc(doc(db, 'inventory', deleteTargetId));
              setInventorySuccess('Item deleted!');
              setDeleteTargetId(null);
              setDeleteConfirmOpen(false);
              // Optionally refresh inventory list
              const q = query(collection(db, 'inventory'), where('userId', '==', user.uid));
              const snapshot = await getDocs(q);
              const items = snapshot.docs.map((doc, idx) => ({ id: doc.id, slno: idx + 1, ...doc.data() }));
              setInventoryList(items);
            }
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
      {/* Confirmation Dialog for Deleting Invoice */}
      <Dialog open={deleteInvoiceConfirmOpen} onClose={() => setDeleteInvoiceConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this invoice?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteInvoiceConfirmOpen(false)} color="inherit">Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => {
            if (deleteInvoiceTargetId) {
              await deleteDoc(doc(db, 'invoices', deleteInvoiceTargetId));
              setInvoiceSuccess('Invoice deleted!');
              setDeleteInvoiceTargetId(null);
              setDeleteInvoiceConfirmOpen(false);
              // Optionally refresh invoice list
              const q = query(collection(db, 'invoices'), where('userId', '==', user.uid));
              const snapshot = await getDocs(q);
              const invoices = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
              setInvoiceList(invoices);
            }
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  
    
  );

  
}

export default App;