import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useStore } from '../store/useStore';
import * as DbServices from '../database/services';
import { shareInvoiceAsPdf, printInvoice } from '../utils/invoicePdf';
import { buildInvoiceHtml } from '../utils/invoicePdf';

export default function InvoicePreviewScreen({ navigation, route }) {
  const { invoice } = route.params || {};
  const profile = useStore(state => state.profile);
  const payments = useStore(state => state.payments);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadItems();
  }, [invoice?.id]);

  const loadItems = async () => {
    try {
      const items = await DbServices.getInvoiceItems(invoice.id);
      setLineItems(items || []);
    } catch (e) {
      console.error('Error loading invoice items:', e);
    } finally {
      setLoading(false);
    }
  };

  const documentType = invoice?.type || 'invoice';

  // Wrap the A4 HTML so it scales to fit the phone screen
  const wrapHtmlForMobile = (rawHtml) => {
    // Replace the viewport meta and inject scaling JS
    return rawHtml
      .replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=10.0, user-scalable=yes"/>'
      )
      .replace(
        '</style>',
        `
        .canvas {
          width: 793px !important;
          min-height: auto !important;
          transform-origin: top left;
          margin: 0 auto;
        }
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: white;
        }
        </style>`
      )
      .replace(
        '</body>',
        `<script>
          (function() {
            var canvas = document.querySelector('.canvas');
            if (!canvas) return;
            function fitToScreen() {
              var screenW = window.innerWidth;
              var canvasW = 793;
              var scale = screenW / canvasW;
              canvas.style.transform = 'scale(' + scale + ')';
              canvas.style.transformOrigin = 'top left';
              canvas.style.width = canvasW + 'px';
              document.body.style.width = screenW + 'px';
              document.body.style.overflowX = 'hidden';
            }
            fitToScreen();
            window.addEventListener('resize', fitToScreen);
          })();
        </script></body>`
      );
  };

  const html = !loading
    ? wrapHtmlForMobile(buildInvoiceHtml({ invoice, lineItems, profile, documentType, payments }))
    : '<html><body><p style="text-align:center;padding:40px;font-family:sans-serif;color:#94a3b8;">Loading...</p></body></html>';

  const handleShare = async () => {
    setActionLoading(true);
    try {
      await shareInvoiceAsPdf({ invoice, lineItems, profile, documentType, payments });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to share.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = async () => {
    setActionLoading(true);
    try {
      await printInvoice({ invoice, lineItems, profile, documentType, payments });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to print.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#121642',
          paddingHorizontal: 16,
          paddingVertical: 14,
          paddingTop: Platform.OS === 'android' ? 44 : 14,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <MaterialIcons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>
            Invoice Preview
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
            {invoice?.invoice_number || invoice?.invoiceNumber || ''}
          </Text>
        </View>
      </View>

      {/* WebView Preview */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#121642" />
          <Text style={{ marginTop: 12, color: '#94a3b8', fontWeight: '600' }}>Loading preview…</Text>
        </View>
      ) : (
        <View style={{ flex: 1, margin: 10, borderRadius: 16, overflow: 'hidden', backgroundColor: 'white', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            style={{ flex: 1, backgroundColor: 'white' }}
            javaScriptEnabled={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
          />
        </View>
      )}

      {/* Footer Actions */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 16,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
        }}
      >
        <TouchableOpacity
          onPress={handlePrint}
          disabled={actionLoading}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, height: 48, backgroundColor: '#f1f5f9', borderRadius: 14,
          }}
        >
          <MaterialIcons name="print" size={18} color="#475569" />
          <Text style={{ color: '#475569', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Print</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          disabled={actionLoading}
          style={{
            flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, height: 48, backgroundColor: '#121642', borderRadius: 14,
          }}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <MaterialIcons name="share" size={18} color="white" />
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Share PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, height: 48, backgroundColor: '#f1f5f9', borderRadius: 14,
          }}
        >
          <MaterialIcons name="close" size={18} color="#475569" />
          <Text style={{ color: '#475569', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Close</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
