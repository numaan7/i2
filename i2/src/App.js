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
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { addInventoryItem } from './inventory';
import { getDocs, collection, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase'; // Import db from firebase.js

function App() {
  const [value, setValue] = React.useState(0); // 0: Sign In, 1: Sign Up
  const [open, setOpen] = React.useState(false);
  const [extraData, setExtraData] = React.useState({ phone: '', businessName: '' });
  const [loading, setLoading] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [user, setUser] = React.useState(null);
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
      if (user && value === 1) {
        const q = query(collection(db, 'inventory'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((doc, idx) => ({ id: doc.id, slno: idx + 1, ...doc.data() }));
        setInventoryList(items);
      } else if (value !== 1) {
        setInventoryList([]);
      }
    };
    fetchInventory();
  }, [user, value, inventorySuccess]);

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

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      <Container sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!isSignedIn ? (
          <Box sx={{ width: '100%', maxWidth: 400, p: 3, bgcolor: 'white', borderRadius: 2, boxShadow: 2 }}>
            <Stack spacing={3} alignItems="center">
              <Typography variant="h5" fontWeight={600}>
                {value === 0 ? 'Sign In' : 'Sign Up'}
              </Typography>
              {value === 0 ? (
                <Button
                  variant="contained"
                  startIcon={<LoginIcon />}
                  onClick={handleSignIn}
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5, fontSize: 16 }}
                >
                  Sign in with Google
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={handleSignUp}
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5, fontSize: 16 }}
                >
                  Sign up with Google
                </Button>
              )}
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
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ width: '100%', maxWidth: 400, p: 3, bgcolor: 'white', borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h5" fontWeight={600} align="center">Welcome to the Dashboard!</Typography>
            {/* You can add dashboard content here */}
          </Box>
        )}
      </Container>
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        {isSignedIn ? (
          <BottomNavigation showLabels value={value} onChange={(e, newValue) => setValue(newValue)}>
            <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Inventory" icon={<Inventory2Icon />} />
            <BottomNavigationAction label="Invoice" icon={<ReceiptLongIcon />} />
            <BottomNavigationAction label="Profile" icon={<AccountCircleIcon />} />
          </BottomNavigation>
        ) : (
          <BottomNavigation
            showLabels
            value={value}
            onChange={(event, newValue) => {
              setValue(newValue);
            }}
          >
            <BottomNavigationAction label="Sign In" icon={<LoginIcon />} />
            <BottomNavigationAction label="Sign Up" icon={<PersonAddIcon />} />
          </BottomNavigation>
        )}
      </Paper>
      {/* Only show the dialog if not signed in */}
      {!isSignedIn && (
        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>Complete Signup</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Phone (optional)"
              type="tel"
              fullWidth
              variant="standard"
              value={extraData.phone}
              onChange={e => setExtraData({ ...extraData, phone: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Business Name (optional)"
              type="text"
              fullWidth
              variant="standard"
              value={extraData.businessName}
              onChange={e => setExtraData({ ...extraData, businessName: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSignupSubmit} disabled={loading}>Submit</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

export default App;
