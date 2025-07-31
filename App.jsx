import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { createPdf } from 'react-native-images-to-pdf';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { width: screenWidth } = Dimensions.get('window');

const CashMemoApp = () => {
  const viewShotRef = useRef(null);
  const [customerName, setCustomerName] = useState('');
  const [billDate, setBillDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [items, setItems] = useState([
    { description: '', quantity: '', rate: '', amount: 0 }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    requestStoragePermission();
  }, []);

  // Request storage permissions
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          // Android 13+ doesn't need storage permissions for app-specific directories
          return true;
        } else {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ]);
          
          return (
            granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
          );
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS doesn't need explicit storage permissions for Documents directory
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return total + (quantity * rate);
    }, 0);
    return subtotal;
  };

  // Update item
  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'rate') {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const rate = parseFloat(updatedItems[index].rate) || 0;
      updatedItems[index].amount = quantity * rate;
    }
    
    setItems(updatedItems);
  };

  // Add new item
  const addNewItem = () => {
    setItems([...items, { description: '', quantity: '', rate: '', amount: 0 }]);
  };

  // Delete item
  const deleteItem = (index) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
    } else {
      Alert.alert('Error', 'At least one item is required.');
    }
  };

  // Clear form
  const clearForm = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setCustomerName('');
            setBillDate('');
            setPaymentMode('');
            setItems([{ description: '', quantity: '', rate: '', amount: 0 }]);
          }
        }
      ]
    );
  };

  // Validate form
  const validateForm = () => {
    if (!customerName.trim() || !billDate || !paymentMode) {
      return false;
    }
    
    const hasValidItems = items.some(item => 
      item.description.trim() && 
      parseFloat(item.quantity) > 0 && 
      parseFloat(item.rate) > 0
    );
    
    return hasValidItems;
  };

  // Show error message
  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3000);
  };

  // Generate filename
  const generateFileName = (extension) => {
    const cleanName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'Customer';
    const date = billDate || new Date().toISOString().split('T')[0];
    const formattedDate = date.replace(/-/g, '-');
    return `${cleanName}_${formattedDate}_Cash_Memo.${extension}`;
  };

  // Get current date for signature
  const getCurrentDate = () => {
    if (billDate) {
      return new Date(billDate).toLocaleDateString('en-GB');
    }
    return new Date().toLocaleDateString('en-GB');
  };

  // Save as PDF
  const saveAsPDF = async () => {
    if (!validateForm()) {
      showError('Please fill in all required fields before saving!');
      return;
    }

    setIsLoading(true);
    
    try {
      // Check permissions
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save files.');
        return;
      }

      // Capture the view as image
      const imageUri = await viewShotRef.current.capture();
      
      // Define output path
      const documentsPath = Platform.OS === 'ios' 
        ? RNFS.DocumentDirectoryPath 
        : RNFS.DownloadDirectoryPath;
      
      const fileName = generateFileName('pdf');
      const outputPath = `${documentsPath}/${fileName}`;

      // Create PDF from image
      await createPdf({
        pages: [{ imagePath: imageUri }],
        outputPath: `file://${outputPath}`,
      });

      Alert.alert(
        'Success',
        `PDF saved successfully!\nLocation: ${outputPath}`,
        [
          { text: 'OK' }
        ]
      );

    } catch (error) {
      console.error('Error saving PDF:', error);
      Alert.alert('Error', 'Failed to save PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save as JPG
  const saveAsJPG = async () => {
    if (!validateForm()) {
      showError('Please fill in all required fields before saving!');
      return;
    }

    setIsLoading(true);
    
    try {
      // Check permissions
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save files.');
        return;
      }

      // Capture the view as image
      const imageUri = await viewShotRef.current.capture();
      
      // Define output path
      const documentsPath = Platform.OS === 'ios' 
        ? RNFS.DocumentDirectoryPath 
        : RNFS.DownloadDirectoryPath;
      
      const fileName = generateFileName('jpg');
      const outputPath = `${documentsPath}/${fileName}`;

      // Copy image to desired location
      await RNFS.copyFile(imageUri, outputPath);

      Alert.alert(
        'Success',
        `Image saved successfully!\nLocation: ${outputPath}`,
        [
          { text: 'OK' }
        ]
      );

    } catch (error) {
      console.error('Error saving JPG:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const subtotal = calculateTotals();

  return (
    <ScrollView style={styles.container}>
      <ViewShot 
        ref={viewShotRef} 
        options={{ 
          format: 'jpg', 
          quality: 0.9,
          result: 'tmpfile'
        }}
        style={styles.viewShotContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>Neetu Tiffin Service</Text>
          <Text style={styles.companyDetails}>
            Phone: +91-999-918-3175, +91-701-178-6085{'\n'}
            Email: neetutiffinservice@gmail.com
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Customer and Bill Info */}
          <View style={styles.infoGrid}>
            <View style={styles.infoGroup}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <Text style={styles.label}>Customer Name:</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Enter customer name"
              />
            </View>

            <View style={styles.infoGroup}>
              <Text style={styles.sectionTitle}>Bill Details</Text>
              <Text style={styles.label}>Date:</Text>
              <TextInput
                style={styles.input}
                value={billDate}
                onChangeText={setBillDate}
                placeholder="YYYY-MM-DD"
              />
              <Text style={styles.label}>Payment Mode:</Text>
              <View style={styles.pickerContainer}>
                {['Cash', 'UPI', 'Card', 'Bank Transfer'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.pickerOption,
                      paymentMode === mode && styles.pickerOptionSelected
                    ]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <Text style={[
                      styles.pickerText,
                      paymentMode === mode && styles.pickerTextSelected
                    ]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Description</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Qty</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Rate (₹)</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Amount (₹)</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Action</Text>
              </View>

              {/* Table Rows */}
              {items.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <TextInput
                    style={[styles.tableInput, { flex: 2 }]}
                    value={item.description}
                    onChangeText={(value) => updateItem(index, 'description', value)}
                    placeholder="Item description"
                  />
                  <TextInput
                    style={[styles.tableInput, { flex: 1 }]}
                    value={item.quantity}
                    onChangeText={(value) => updateItem(index, 'quantity', value)}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.tableInput, { flex: 1 }]}
                    value={item.rate}
                    onChangeText={(value) => updateItem(index, 'rate', value)}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <Text style={[styles.amountText, { flex: 1 }]}>
                    ₹{item.amount.toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    style={[styles.deleteButton, { flex: 1 }]}
                    onPress={() => deleteItem(index)}
                    disabled={items.length === 1}
                  >
                    <Text style={styles.deleteButtonText}>
                      {items.length > 1 ? 'Delete' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Total Section */}
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>₹{subtotal.toLocaleString()}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total Amount:</Text>
              <Text style={styles.grandTotalValue}>₹{subtotal.toLocaleString()}</Text>
            </View>
          </View>

          {/* Signature Section */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureText}>Neetu</Text>
              <Text style={styles.signatureDate}>{getCurrentDate()}</Text>
            </View>
          </View>
        </View>
      </ViewShot>

      {/* Error Message */}
      {errorMessage ? (
        <View style={styles.errorMessage}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.buttonSection}>
        <Text style={styles.buttonSectionTitle}>📋 Actions</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={addNewItem}
          >
            <Text style={styles.buttonText}>Add Item</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={clearForm}
          >
            <Text style={styles.buttonText}>Clear All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button, 
              styles.infoButton,
              !validateForm() && styles.disabledButton
            ]}
            onPress={saveAsPDF}
            disabled={!validateForm() || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Saving...' : 'Save PDF'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button, 
              styles.warningButton,
              !validateForm() && styles.disabledButton
            ]}
            onPress={saveAsJPG}
            disabled={!validateForm() || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Saving...' : 'Save JPG'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Thank you for your business!</Text>
        <Text style={styles.footerSubtitle}>Cash Memo - All transactions are subject to terms and conditions</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  viewShotContainer: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FF6B35',
    padding: 25,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  companyDetails: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
  },
  content: {
    padding: 25,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 30,
  },
  infoGroup: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5D6D7E',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E8EAED',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8EAED',
    backgroundColor: '#FFFFFF',
  },
  pickerOptionSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  pickerText: {
    fontSize: 12,
    color: '#2C3E50',
  },
  pickerTextSelected: {
    color: '#FFFFFF',
  },
  itemsSection: {
    marginBottom: 30,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FF6B35',
    padding: 15,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
    alignItems: 'center',
  },
  tableInput: {
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
    marginHorizontal: 2,
  },
  amountText: {
    fontWeight: '600',
    color: '#2E8B57',
    fontSize: 12,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 6,
    padding: 6,
    marginHorizontal: 2,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  totalSection: {
    backgroundColor: '#FFE5DC',
    padding: 25,
    borderRadius: 16,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderLeftWidth: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#FF6B35',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  signatureSection: {
    alignItems: 'flex-end',
    padding: 25,
    borderTopWidth: 2,
    borderTopColor: '#FF6B35',
    backgroundColor: '#F8F9FA',
  },
  signatureBox: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signatureText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '700',
    marginBottom: 5,
  },
  signatureDate: {
    fontSize: 13,
    color: '#5D6D7E',
    fontWeight: '500',
    backgroundColor: '#FFE5DC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  errorMessage: {
    backgroundColor: '#FFE5E5',
    padding: 15,
    margin: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E74C3C',
    borderLeftWidth: 4,
  },
  errorText: {
    color: '#E74C3C',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonSection: {
    backgroundColor: '#F8F9FA',
    borderTopWidth: 3,
    borderTopColor: '#FF6B35',
    padding: 30,
    marginTop: 0,
  },
  buttonSectionTitle: {
    textAlign: 'center',
    color: '#2C3E50',
    fontSize: 18,
    marginBottom: 20,
    fontWeight: '600',
  },
  buttonGroup: {
    gap: 15,
  },
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
  },
  secondaryButton: {
    backgroundColor: '#5D6D7E',
  },
  infoButton: {
    backgroundColor: '#3498DB',
  },
  warningButton: {
    backgroundColor: '#F39C12',
  },
  disabledButton: {
    backgroundColor: '#BDC3C7',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 6,
    textAlign: 'center',
  },
  footerSubtitle: {
    fontSize: 14,
    color: '#5D6D7E',
    textAlign: 'center',
  },
});

export default CashMemoApp;
