import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Pure-JS Calendar Date Picker
 * Props:
 *   visible (bool)       - show/hide the modal
 *   onClose ()           - called when dismissed
 *   onSelect (dateStr)   - called with 'YYYY-MM-DD' string
 *   selectedDate (str)   - current selected date as 'YYYY-MM-DD'
 */
export default function DatePickerModal({ visible, onClose, onSelect, selectedDate }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const initial = selectedDate ? new Date(selectedDate) : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // Reset view when modal opens with a different date
  React.useEffect(() => {
    if (visible) {
      const d = selectedDate ? new Date(selectedDate) : new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible, selectedDate]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) cells.push(null);
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return cells;
  }, [viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayPress = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onSelect(`${viewYear}-${m}-${d}`);
    onClose();
  };

  const cellSize = (Dimensions.get('window').width - 80) / 7;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{
          backgroundColor: 'white',
          borderRadius: 24,
          paddingVertical: 20,
          paddingHorizontal: 16,
          width: Dimensions.get('window').width - 48,
          maxWidth: 400,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 12,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 8, borderRadius: 12, backgroundColor: '#f1f5f9' }}>
              <MaterialIcons name="chevron-left" size={24} color="#262A56" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#262A56', letterSpacing: 0.5 }}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={{ padding: 8, borderRadius: 12, backgroundColor: '#f1f5f9' }}>
              <MaterialIcons name="chevron-right" size={24} color="#262A56" />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {DAYS.map(d => (
              <View key={d} style={{ width: cellSize, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={{ width: cellSize, height: cellSize }} />;
              }

              const m = String(viewMonth + 1).padStart(2, '0');
              const d = String(day).padStart(2, '0');
              const dateStr = `${viewYear}-${m}-${d}`;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  onPress={() => handleDayPress(day)}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? '#262A56' : isToday ? '#e0e7ff' : 'transparent',
                  }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: isSelected || isToday ? '800' : '500',
                      color: isSelected ? '#ffffff' : isToday ? '#4338ca' : '#334155',
                    }}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today button */}
          <TouchableOpacity
            onPress={() => { handleDayPress(today.getDate()); setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}
            style={{
              marginTop: 12,
              alignSelf: 'center',
              paddingHorizontal: 20,
              paddingVertical: 8,
              backgroundColor: '#f1f5f9',
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6366f1' }}>Today</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
