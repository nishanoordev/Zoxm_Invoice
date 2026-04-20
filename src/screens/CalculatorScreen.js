import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar,
  Modal, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useColorScheme } from 'nativewind';

const { width: W, height: H } = Dimensions.get('window');

// ── Palette ───────────────────────────────────────────────────────────────────────
const P = {
  bg:       '#ffffff',
  dispBg:   '#f5f7ff',
  dispBdr:  '#e0e4f4',
  num:      '#1e2445',
  op:       '#2e3672',
  cashOut:  '#d95b50',
  ac:       '#f97316',
  gstBg:    '#f0f2ff',
  gstText:  '#4b5280',
  utilBg:   '#eef0fb',
  utilText: '#3a4080',
  exprClr:  '#aab0d0',
  dispClr:  '#1e2445',
  divider:  '#e4e7f5',
  sentBtn:  '#0d9488',  // teal (was cashIn)
  emiBtn:   '#7c3aed',  // violet
  histBtn:  '#0284c7',  // sky blue
};

// ── Helpers ───────────────────────────────────────────────────────────────────────
const fmt = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toPrecision(10).replace(/\.?0+$/, '');
};
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);

const calcExpr = (expr) => {
  try {
    const clean = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    // eslint-disable-next-line no-new-func
    const r = Function('"use strict"; return (' + clean + ')')();
    return isFinite(r) ? fmt(String(r)) : 'Error';
  } catch { return 'Error'; }
};

// ── EMI formula: M = P × r(1+r)^n / ((1+r)^n − 1)
const calcEMI = (principal, annualRate, months) => {
  const P = parseFloat(principal);
  const r = parseFloat(annualRate) / 100 / 12;
  const n = parseInt(months, 10);
  if (!P || !r || !n || isNaN(P) || isNaN(r) || isNaN(n)) return null;
  const emi = r === 0
    ? P / n
    : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return { emi, total: emi * n, interest: emi * n - P };
};

// ────────────────────────────────────────────────────────────────────────────────
export default function CalculatorScreen({ onClose, onSendToInvoice }) {
  const theme = useTheme();
  const { colorScheme } = useColorScheme();
  const ins   = useSafeAreaInsets();

  // ── Core state
  const [disp,   setDisp]   = useState('0');
  const [expr,   setExpr]   = useState('');
  const [op,     setOp]     = useState(null);
  const [prev,   setPrev]   = useState(null);
  const [wait,   setWait]   = useState(false);
  const [evaled, setEvaled] = useState(false);

  // ── Business
  const [gt,  setGt]  = useState(0);
  const [mem, setMem] = useState(null);

  // ── Tape (ref avoids stale closure)
  const tapeRef = useRef([]);
  const [tape,  setTape]  = useState([]);
  const [tIdx,  setTIdx]  = useState(-1);

  // ── UI Sheet states
  const [histVisible, setHistVisible] = useState(false);
  const [emiVisible,  setEmiVisible]  = useState(false);

  // ── EMI inputs
  const [emiP, setEmiP] = useState('');
  const [emiR, setEmiR] = useState('');
  const [emiN, setEmiN] = useState('');
  const [emiRes, setEmiRes] = useState(null);

  const pushTape = (entry) => {
    tapeRef.current = [...tapeRef.current, entry];
    setTape([...tapeRef.current]);
  };

  // ─── Calculator logic ──────────────────────────────────────────────────────────
  const digit = useCallback((d) => {
    if (wait || evaled) { setDisp(d === '.' ? '0.' : d); setWait(false); setEvaled(false); return; }
    if (d === '.' && disp.includes('.')) return;
    if (disp === '0' && d !== '.') { setDisp(d); return; }
    if (disp.replace(/[-.]/g, '').length >= 12) return;
    setDisp(disp + d);
  }, [disp, wait, evaled]);

  const d00 = useCallback(() => {
    if (wait || evaled) { setDisp('0'); setWait(false); setEvaled(false); return; }
    if (disp === '0' || disp.replace(/[-.]/g, '').length >= 11) return;
    setDisp(disp + '00');
  }, [disp, wait, evaled]);

  const oper = useCallback((o) => {
    const cur = parseFloat(disp);
    if (prev !== null && !wait && !evaled) {
      const r = calcExpr(`${prev}${op}${cur}`);
      setDisp(r); setPrev(parseFloat(r)); setExpr(`${r} ${o}`);
    } else { setPrev(cur); setExpr(`${disp} ${o}`); }
    setOp(o); setWait(true); setEvaled(false);
  }, [disp, op, prev, wait, evaled]);

  const equals = useCallback(() => {
    if (!op || wait) return;
    const cur = parseFloat(disp);
    const r   = calcExpr(`${prev}${op}${cur}`);
    const e   = `${prev} ${op} ${disp} =`;
    setExpr(e); setDisp(r);
    pushTape({ expr: e, result: r, time: new Date() });
    setTIdx(-1); setPrev(null); setOp(null); setWait(false); setEvaled(true);
  }, [disp, op, prev, wait]);

  const pct = useCallback(() => {
    const v = parseFloat(disp); if (isNaN(v)) return;
    setDisp(fmt(String(v / 100))); setExpr(`${disp}%`); setEvaled(true);
  }, [disp]);

  const ac = useCallback(() => {
    setDisp('0'); setExpr(''); setOp(null); setPrev(null);
    setWait(false); setEvaled(false); setTIdx(-1);
  }, []);

  const bksp = useCallback(() => {
    if (wait || evaled) { setDisp('0'); setWait(false); setEvaled(false); return; }
    setDisp(p => (p.length <= 1 || (p.length === 2 && p[0] === '-')) ? '0' : p.slice(0, -1));
  }, [wait, evaled]);

  const correct = useCallback(() => { setDisp('0'); setWait(false); setEvaled(false); }, []);

  const gst = useCallback((rate, add) => {
    const v = parseFloat(disp); if (isNaN(v)) return;
    const r = add ? v + v * (rate / 100) : v - v * (rate / 100);
    setExpr(`${disp} ${add ? '+' : '-'}${rate}%`);
    setDisp(fmt(String(r))); setEvaled(true);
  }, [disp]);

  const gtPress = useCallback(() => {
    setDisp(fmt(String(gt))); setExpr('Grand Total'); setEvaled(true);
  }, [gt]);

  const muPress = useCallback(() => {
    if (mem === null) { setMem(parseFloat(disp)); setExpr(`MU Stored: ${disp}`); }
    else { setDisp(fmt(String(mem))); setExpr(`MU Recalled`); setMem(null); setEvaled(true); }
  }, [disp, mem]);

  // ── Send to Invoice
  const handleSendToInvoice = useCallback(() => {
    const val = parseFloat(disp);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid amount first.'); return;
    }
    if (onSendToInvoice) onSendToInvoice(val);
    else onClose?.();
  }, [disp, onSendToInvoice, onClose]);

  // ── Cash OUT
  const cashOut = useCallback(() => {
    const v = parseFloat(disp); if (isNaN(v)) return;
    setGt(g => g - v); setExpr(`Cash OUT: ${disp}`); setEvaled(true);
  }, [disp]);

  // ── History helpers
  const recallEntry = useCallback((entry) => {
    setDisp(entry.result); setExpr(entry.expr); setEvaled(true); setHistVisible(false);
  }, []);

  const clearHistory = useCallback(() => {
    tapeRef.current = []; setTape([]); setTIdx(-1); setHistVisible(false);
  }, []);

  // ── EMI
  const handleCalcEMI = useCallback(() => {
    const res = calcEMI(emiP, emiR, emiN);
    if (!res) { Alert.alert('Invalid Input', 'Enter valid Principal, Rate and Months.'); return; }
    setEmiRes(res);
  }, [emiP, emiR, emiN]);

  const useEMIResult = useCallback(() => {
    if (!emiRes) return;
    setDisp(fmt(String(emiRes.emi)));
    setExpr(`EMI (₹${fmtINR(parseFloat(emiP))} @ ${emiR}% × ${emiN}mo)`);
    setEvaled(true); setEmiVisible(false);
  }, [emiRes, emiP, emiR, emiN]);

  // ── Display font size
  const fs = disp.length > 12 ? 28 : disp.length > 9 ? 36 : disp.length > 6 ? 46 : 56;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: ins.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} translucent={false} />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={onClose} style={s.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.hCenter}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={17} color="rgba(255,255,255,0.75)" />
          <Text style={s.hTitle}>Calculator</Text>
        </View>
        {gt !== 0 ? (
          <View style={s.gtBadge}>
            <Text style={s.gtBadgeTxt} numberOfLines={1}>
              GT {gt >= 0 ? '+' : ''}{fmtINR(gt)}
            </Text>
          </View>
        ) : <View style={{ width: 80 }} />}
      </View>

      {/* ── Display ── */}
      <View style={s.display}>
        <Text style={s.exprTxt} numberOfLines={1} ellipsizeMode="head">
          {expr || '\u00a0'}
        </Text>
        <View style={s.dispRow}>
          <Text style={[s.dispNum, { fontSize: fs }]} numberOfLines={1} adjustsFontSizeToFit>
            {disp}
          </Text>
          <TouchableOpacity onPress={bksp} style={s.bsBtn} activeOpacity={0.6}>
            <MaterialCommunityIcons name="backspace-outline" size={26} color={P.exprClr} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Button Grid ── */}
      <View style={s.grid}>

        {/* S1: EMI Calc | MU | Cash OUT | Send to Invoice */}
        <View style={[s.row, { flex: 1.1 }]}>
          {/* EMI Calc — replaces GT position */}
          <B
            bg={P.emiBtn + '1a'}
            tc={P.emiBtn}
            label={'EMI\nCalc'}
            onPress={() => setEmiVisible(true)}
            ts={12} fw="800" lh={15}
          />
          {/* MU — memory unit */}
          <B
            bg={P.utilBg}
            tc={mem ? P.sentBtn : P.utilText}
            label={mem ? 'MU ●' : 'MU'}
            onPress={muPress}
            ts={14} fw="800"
          />
          {/* Cash OUT — moved from last to 3rd */}
          <B
            bg={P.cashOut + '18'}
            tc={P.cashOut}
            label={'Cash\nOUT'}
            onPress={cashOut}
            ts={12} fw="800" flex={1.2} lh={15}
          />
          {/* Send to Invoice — moved to Cash OUT position */}
          <B
            bg={P.sentBtn}
            tc="#fff"
            label={'Send to\nInvoice'}
            onPress={handleSendToInvoice}
            ts={11} fw="800" flex={1.4} lh={15}
          />
        </View>

        {/* S2: +GST row */}
        <View style={[s.row, { flex: 0.82 }]}>
          {[3,5,18,40].map(r => (
            <B key={`+${r}`} bg={P.gstBg} tc={P.gstText} label={`+${r}%`}
               onPress={() => gst(r, true)} ts={11} fw="700" />
          ))}
          <B bg={theme.primary + '22'} tc={theme.primary} label="+GST"
             onPress={() => gst(18, true)} ts={11} fw="800" />
        </View>

        {/* S3: -GST row */}
        <View style={[s.row, { flex: 0.82 }]}>
          {[3,5,18,40].map(r => (
            <B key={`-${r}`} bg={P.gstBg} tc={P.gstText} label={`-${r}%`}
               onPress={() => gst(r, false)} ts={11} fw="700" />
          ))}
          <B bg="#ffe8e8" tc={P.cashOut} label="-GST"
             onPress={() => gst(18, false)} ts={11} fw="800" />
        </View>

        <View style={s.sep} />

        {/* Utility: CORRECT | HISTORY | GT */}
        <View style={[s.row, { flex: 1.05 }]}>
          <B bg={P.utilBg} tc={P.utilText} label={'CORRECT\n00 → 0'}
             onPress={correct} ts={11} fw="800" lh={15} />
          <B
            bg={tape.length > 0 ? P.histBtn + '22' : P.utilBg}
            tc={tape.length > 0 ? P.histBtn : P.utilText}
            label={tape.length > 0 ? `HISTORY\n(${tape.length})` : 'HISTORY'}
            onPress={() => setHistVisible(true)} ts={11} fw="800" lh={15}
          />
          <B bg={P.utilBg} tc={P.utilText} label="GT" onPress={gtPress} ts={14} fw="800" />
        </View>

        <View style={s.sep} />

        {/* Row 1: 7 8 9 % AC */}
        <View style={[s.row, { flex: 1.3 }]}>
          <N label="7"  onPress={() => digit('7')} />
          <N label="8"  onPress={() => digit('8')} />
          <N label="9"  onPress={() => digit('9')} />
          <O label="%"  onPress={pct} />
          <B bg={P.ac} tc="#fff" label="AC" onPress={ac} ts={17} fw="900" />
        </View>

        {/* Row 2: 4 5 6 − ÷ */}
        <View style={[s.row, { flex: 1.3 }]}>
          <N label="4" onPress={() => digit('4')} />
          <N label="5" onPress={() => digit('5')} />
          <N label="6" onPress={() => digit('6')} />
          <O label="−" onPress={() => oper('−')} />
          <O label="÷" onPress={() => oper('÷')} />
        </View>

        {/* Rows 3+4 combined: + is double-height */}
        <View style={[s.row, { flex: 2.66 }]}>
          <View style={{ flex: 3, gap: GAP }}>
            <View style={[s.row, { flex: 1 }]}>
              <N label="1" onPress={() => digit('1')} />
              <N label="2" onPress={() => digit('2')} />
              <N label="3" onPress={() => digit('3')} />
            </View>
            <View style={[s.row, { flex: 1 }]}>
              <N label="0"  onPress={() => digit('0')} />
              <N label="00" onPress={d00} />
              <N label="."  onPress={() => digit('.')} />
            </View>
          </View>
          {/* Tall + */}
          <B bg={P.op} tc="#c8d0ff" label="+" onPress={() => oper('+')} ts={36} fw="800" />
          {/* × top, = bottom */}
          <View style={{ flex: 1, gap: GAP }}>
            <O label="×" onPress={() => oper('×')} />
            <B bg={theme.primary} tc="#fff" label="=" onPress={equals} ts={36} fw="700" />
          </View>
        </View>

      </View>

      {/* ── HISTORY MODAL ── */}
      <Modal
        visible={histVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHistVisible(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setHistVisible(false)} />
          <View style={[s.bottomSheet, { paddingBottom: ins.bottom + 12 }]}>
            <View style={s.sheetHandle} />
            {/* Sheet Header */}
            <View style={s.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="history" size={20} color={P.histBtn} />
                <Text style={s.sheetTitle}>Calculation History</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {tape.length > 0 && (
                  <TouchableOpacity onPress={clearHistory} style={s.clearBtn}>
                    <Text style={s.clearBtnTxt}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setHistVisible(false)}>
                  <MaterialIcons name="close" size={22} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {tape.length === 0 ? (
              <View style={s.emptyState}>
                <MaterialCommunityIcons name="calculator-variant-outline" size={48} color="#d1d5db" />
                <Text style={s.emptyTxt}>No calculations yet</Text>
                <Text style={s.emptySubTxt}>Press = to save calculations here</Text>
              </View>
            ) : (
              <FlatList
                data={[...tape].reverse()}
                keyExtractor={(_, i) => String(i)}
                style={{ maxHeight: H * 0.5 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={s.histItem}
                    onPress={() => recallEntry(item)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.histExpr} numberOfLines={1}>{item.expr}</Text>
                      <Text style={s.histTime}>
                        {item.time
                          ? item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </Text>
                    </View>
                    <Text style={s.histResult}>{item.result}</Text>
                    <MaterialIcons name="chevron-right" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 }} />}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── EMI CALCULATOR MODAL ── */}
      <Modal
        visible={emiVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmiVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setEmiVisible(false)} />
          <View style={[s.bottomSheet, { paddingBottom: ins.bottom + 12 }]}>
            <View style={s.sheetHandle} />
            {/* EMI Header */}
            <View style={s.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="percent" size={20} color={P.emiBtn} />
                <Text style={s.sheetTitle}>EMI Calculator</Text>
              </View>
              <TouchableOpacity onPress={() => setEmiVisible(false)}>
                <MaterialIcons name="close" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View style={s.emiBody}>
              {/* Inputs */}
              <View style={s.emiInputRow}>
                <Text style={s.emiLabel}>Principal (₹)</Text>
                <TextInput
                  style={s.emiInput}
                  value={emiP}
                  onChangeText={setEmiP}
                  keyboardType="numeric"
                  placeholder="e.g. 100000"
                  placeholderTextColor="#c4c9e2"
                />
              </View>
              <View style={s.emiInputRow}>
                <Text style={s.emiLabel}>Annual Interest Rate (%)</Text>
                <TextInput
                  style={s.emiInput}
                  value={emiR}
                  onChangeText={setEmiR}
                  keyboardType="numeric"
                  placeholder="e.g. 12"
                  placeholderTextColor="#c4c9e2"
                />
              </View>
              <View style={s.emiInputRow}>
                <Text style={s.emiLabel}>Tenure (Months)</Text>
                <TextInput
                  style={s.emiInput}
                  value={emiN}
                  onChangeText={setEmiN}
                  keyboardType="numeric"
                  placeholder="e.g. 24"
                  placeholderTextColor="#c4c9e2"
                />
              </View>

              <TouchableOpacity style={[s.emiCalcBtn, { backgroundColor: P.emiBtn }]} onPress={handleCalcEMI} activeOpacity={0.8}>
                <Text style={s.emiCalcBtnTxt}>Calculate EMI</Text>
              </TouchableOpacity>

              {/* Results */}
              {emiRes && (
                <View style={s.emiResults}>
                  <EmiRow label="Monthly EMI" value={`₹ ${fmtINR(emiRes.emi)}`} accent={P.emiBtn} bold />
                  <EmiRow label="Total Payment" value={`₹ ${fmtINR(emiRes.total)}`} />
                  <EmiRow label="Total Interest" value={`₹ ${fmtINR(emiRes.interest)}`} accent={P.cashOut} />

                  <TouchableOpacity
                    style={[s.useEmiBtn, { borderColor: P.emiBtn }]}
                    onPress={useEMIResult}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="calculator-variant" size={16} color={P.emiBtn} />
                    <Text style={[s.useEmiBtnTxt, { color: P.emiBtn }]}>Use EMI in Calculator</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────────
const EmiRow = ({ label, value, accent, bold }) => (
  <View style={s.emiResultRow}>
    <Text style={s.emiResultLabel}>{label}</Text>
    <Text style={[s.emiResultValue, bold && { fontWeight: '900', fontSize: 18 }, accent && { color: accent }]}>
      {value}
    </Text>
  </View>
);

function B({ label, onPress, bg, tc, ts = 16, fw = '700', flex = 1, lh }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72}
      style={[s.btn, { backgroundColor: bg, flex }]}>
      <Text style={[s.btnT, { color: tc, fontSize: ts, fontWeight: fw, lineHeight: lh }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
function N({ label, onPress }) {
  return <B label={label} onPress={onPress} bg={P.num} tc="#f0f4ff" ts={22} fw="700" />;
}
function O({ label, onPress }) {
  return <B label={label} onPress={onPress} bg={P.op} tc="#c8d0ff" ts={28} fw="800" />;
}

// ── Constants ─────────────────────────────────────────────────────────────────────
const GAP = 6;

// ── Styles ────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  // Header
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  hCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hTitle:  { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  gtBadge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, maxWidth: 120 },
  gtBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  // Display
  display: { backgroundColor: P.dispBg, borderBottomWidth: 1.5, borderColor: P.dispBdr, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  exprTxt: { color: P.exprClr, fontSize: 13, fontWeight: '500', textAlign: 'right', marginBottom: 4 },
  dispRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dispNum: { flex: 1, color: P.dispClr, fontWeight: '900', textAlign: 'right', letterSpacing: -1.5 },
  bsBtn:   { padding: 4 },
  // Grid
  grid: { flex: 1, padding: GAP, gap: GAP },
  row:  { flexDirection: 'row', gap: GAP },
  btn:  { flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnT: { textAlign: 'center' },
  sep:  { height: 1.5, backgroundColor: P.divider, marginHorizontal: 2 },
  // Modal overlay
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 10,
    elevation: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16,
  },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#1e2445', letterSpacing: 0.2 },
  clearBtn: { backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  clearBtnTxt: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  // History
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 15, fontWeight: '700', color: '#9ca3af' },
  emptySubTxt: { fontSize: 12, color: '#d1d5db', fontWeight: '500' },
  histItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 10, backgroundColor: '#fff' },
  histExpr: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginBottom: 2 },
  histTime: { fontSize: 10, color: '#d1d5db', fontWeight: '500' },
  histResult: { fontSize: 20, fontWeight: '900', color: '#1e2445', letterSpacing: -0.5 },
  // EMI
  emiBody: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  emiInputRow: { gap: 4 },
  emiLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', letterSpacing: 0.3 },
  emiInput: {
    backgroundColor: '#f5f7ff', borderWidth: 1.5, borderColor: '#e0e4f4',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, fontWeight: '700', color: '#1e2445',
  },
  emiCalcBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  emiCalcBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  emiResults: { backgroundColor: '#f8f9ff', borderRadius: 18, padding: 16, gap: 10, marginBottom: 4 },
  emiResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emiResultLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  emiResultValue: { fontSize: 15, fontWeight: '700', color: '#1e2445' },
  useEmiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, marginTop: 4 },
  useEmiBtnTxt: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});
