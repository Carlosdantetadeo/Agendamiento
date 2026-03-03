import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = {
  bone: '#FDFBF9',
  graphite: '#2C2C2C',
  beige: '#F3EFEC',
  gold: '#C5A059',
  white: '#FFFFFF',
  error: '#FF5252',
  success: '#4CAF50',
};

const TREATMENTS = [
  'Limpieza Facial Profunda',
  'Peeling Químico',
  'HydraFacial Luxury',
  'Radiofrecuencia Facial',
  'Tratamiento Antimanchas',
  'Masaje Facial Kobido',
];

export default function App() {
  const [clientName, setClientName] = useState('');
  const [treatment, setTreatment] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleBook = async () => {
    if (!clientName || !treatment) {
      setMessage({ text: 'Por favor, completa todos los campos.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // Reemplaza con la URL de tu servidor desplegado
      const response = await fetch('https://tu-servidor.com/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          treatment,
          dateTime: date.toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: '¡Cita confirmada con éxito!', type: 'success' });
        setClientName('');
        setTreatment('');
      } else {
        throw new Error(data.error || 'Error al reservar');
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const currentDate = new Date(date);
      currentDate.setFullYear(selectedDate.getFullYear());
      currentDate.setMonth(selectedDate.getMonth());
      currentDate.setDate(selectedDate.getDate());
      setDate(currentDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentDate = new Date(date);
      currentDate.setHours(selectedTime.getHours());
      currentDate.setMinutes(selectedTime.getMinutes());
      setDate(currentDate);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Lumière</Text>
          <Text style={styles.subtitle}>SKIN STUDIO</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NOMBRE DE LA CLIENTA</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Isabella García"
              placeholderTextColor="#ccc"
              value={clientName}
              onChangeText={setClientName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>TRATAMIENTO</Text>
            <View style={styles.treatmentList}>
              {TREATMENTS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.treatmentItem,
                    treatment === t && styles.treatmentItemSelected,
                  ]}
                  onPress={() => setTreatment(t)}
                >
                  <Text style={[
                    styles.treatmentText,
                    treatment === t && styles.treatmentTextSelected
                  ]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.dateTimeContainer}>
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.label}>FECHA</Text>
              <Text style={styles.dateValue}>{date.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.label}>HORA</Text>
              <Text style={styles.dateValue}>
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          {message.text ? (
            <Text style={[
              styles.message, 
              message.type === 'error' ? styles.errorText : styles.successText
            ]}>
              {message.text}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleBook}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.bone} />
            ) : (
              <Text style={styles.buttonText}>CONFIRMAR CITA</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ALTA GAMA • CUIDADO EXPERTO</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bone,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    color: COLORS.graphite,
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 4,
    color: COLORS.graphite,
    opacity: 0.6,
    marginTop: 4,
  },
  divider: {
    height: 1,
    width: 40,
    backgroundColor: COLORS.graphite,
    opacity: 0.2,
    marginTop: 20,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: COLORS.graphite,
    opacity: 0.4,
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.graphite,
  },
  treatmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  treatmentItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.beige,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  treatmentItemSelected: {
    borderColor: COLORS.graphite,
    backgroundColor: COLORS.white,
  },
  treatmentText: {
    fontSize: 12,
    color: COLORS.graphite,
    opacity: 0.7,
  },
  treatmentTextSelected: {
    opacity: 1,
    fontWeight: '600',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  dateButton: {
    flex: 0.45,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingVertical: 8,
  },
  dateValue: {
    fontSize: 16,
    color: COLORS.graphite,
    marginTop: 4,
  },
  button: {
    backgroundColor: COLORS.graphite,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.bone,
    fontWeight: '600',
    letterSpacing: 1,
    fontSize: 14,
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 13,
  },
  errorText: {
    color: COLORS.error,
  },
  successText: {
    color: COLORS.success,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    letterSpacing: 2,
    color: COLORS.graphite,
    opacity: 0.3,
  },
});
