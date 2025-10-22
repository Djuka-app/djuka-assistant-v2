// App.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';

// Ako postoje tvoji servisi (ako ih nema, app i dalje radi)
import GeminiService from './services/GeminiService';
import ActionService from './services/ActionService';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [assistantActive, setAssistantActive] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    checkOnboarding();
    loadMessages();
    // initialize external services safely
    try {
      GeminiService?.initialize?.();
    } catch (e) {
      console.log('GeminiService init error (ok if missing):', e.message);
    }

    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []);

  const checkOnboarding = async () => {
    try {
      const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
      if (!hasSeen) {
        // default: mark seen immediately (or show UI if you want)
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const loadMessages = async () => {
    try {
      const saved = await AsyncStorage.getItem('messages');
      if (saved) setMessages(JSON.parse(saved));
    } catch (e) {
      console.error('Error loading messages:', e);
    }
  };

  const saveMessages = async (newMessages) => {
    try {
      await AsyncStorage.setItem('messages', JSON.stringify(newMessages));
    } catch (e) {
      console.error('Error saving messages:', e);
    }
  };

  const onSpeechStart = () => {
    setIsListening(true);
  };

  const onSpeechEnd = () => {
    setIsListening(false);
  };

  const onSpeechResults = (event) => {
    const text = Array.isArray(event.value) ? event.value[0] : event.value;
    if (text) {
      setInputText(text);
      handleSend(text);
    }
  };

  const onSpeechError = (error) => {
    console.error('Speech error:', error);
    setIsListening(false);
    Alert.alert('Greška', 'Problem s prepoznavanjem glasa. Pokušaj ponovno.');
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      // sr-RS je primjer; ovisno o uređaju podrška jezika varira
      await Voice.start('sr-RS');
    } catch (e) {
      console.error('Voice.start error:', e);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (e) {
      console.error('Voice.stop error:', e);
    }
  };

  const handleSpeak = (text) => {
    try {
      Speech.speak(text, { language: 'sr-RS', pitch: 1.0, rate: 0.9 });
    } catch (e) {
      console.warn('TTS error', e);
    }
  };

  const addBotMessage = (text) => {
    const botMessage = {
      id: Date.now().toString(),
      text,
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };
    const newMessages = [...messages, botMessage];
    setMessages(newMessages);
    saveMessages(newMessages);
    flatListRef.current?.scrollToEnd?.();
  };

  const handleSend = async (text = inputText) => {
    if (!text || !text.trim()) return;
    const userMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveMessages(newMessages);
    setInputText('');

    const lower = text.toLowerCase();

    // activation phrases
    if (lower.includes('gdje si djuka') || lower.includes('gdje si đuka')) {
      setAssistantActive(true);
      const r = 'Tu sam! Kako mogu da ti pomognem?';
      addBotMessage(r);
      handleSpeak(r);
      return;
    }
    if (lower.includes('hvala djuka') || lower.includes('hvala đuka')) {
      setAssistantActive(false);
      const r = 'Nema na čemu! Pozovi me kad ti zatrebam.';
      addBotMessage(r);
      handleSpeak(r);
      return;
    }

    if (assistantActive) {
      await processCommand(text.trim());
    } else {
      // if assistant not active, optionally ask to activate
      addBotMessage('Reci "Gdje si Djuka" da aktiviraš asistenta.');
    }
  };

  const processCommand = async (command) => {
    const lower = command.toLowerCase();

    if (lower.includes('pozovi') || lower.includes('nazovi')) {
      const contact = extractContact(command);
      if (contact) {
        setPendingAction({ type: 'call', contact });
        setShowServiceModal(true);
      } else {
        const r = 'Koga želiš da pozovem?';
        addBotMessage(r);
        handleSpeak(r);
      }
      return;
    }

    if (lower.includes('pošalji poruku') || lower.includes('posalji poruku')) {
      const contact = extractContact(command);
      const message = extractMessage(command);
      if (contact && message) {
        setPendingAction({ type: 'sms', contact, message });
        setShowServiceModal(true);
      } else {
        const r = 'Kome i šta želiš da pošaljem?';
        addBotMessage(r);
        handleSpeak(r);
      }
      return;
    }

    if (lower.includes('navigiraj') || lower.includes('vodi me')) {
      const dest = extractDestination(command);
      if (dest) {
        ActionService?.openMaps?.(dest);
        const r = `Otvaram Google Maps za ${dest}`;
        addBotMessage(r);
        handleSpeak(r);
      } else {
        const r = 'Gdje želiš da ideš?';
        addBotMessage(r);
        handleSpeak(r);
      }
      return;
    }

    if (lower.includes('pretraži') || lower.includes('traži')) {
      const q = extractSearchQuery(command);
      if (q) {
        ActionService?.searchWeb?.(q);
        const r = `Pretražujem ${q}`;
        addBotMessage(r);
        handleSpeak(r);
      } else {
        const r = 'Šta želiš da pretražim?';
        addBotMessage(r);
        handleSpeak(r);
      }
      return;
    }

    // fallback: ask Gemini
    setIsTyping(true);
    try {
      const resp = (await GeminiService?.askQuestion?.(command)) || 'Evo odgovora (demo).';
      addBotMessage(resp);
      handleSpeak(resp);
    } catch (e) {
      console.error('Gemini ask error', e);
      const r = 'Izvini, imam problem sa odgovorom. Pokušaj ponovo.';
      addBotMessage(r);
      handleSpeak(r);
    } finally {
      setIsTyping(false);
    }
  };

  // Simple extractors (rudimentarne)
  const extractContact = (text) => {
    const words = text.split(' ').filter(Boolean);
    const idx = words.findIndex((w) =>
      ['pozovi', 'nazovi', 'pošalji', 'posalji'].includes(w.toLowerCase())
    );
    return idx !== -1 && words[idx + 1] ? words[idx + 1] : null;
  };

  const extractMessage = (text) => {
    const m = text.match(/poruku\s+(.+)/i);
    return m ? m[1] : null;
  };

  const extractDestination = (text) => {
    const words = text.split(' ');
    const idx = words.findIndex((w) => ['navigiraj', 'vodi'].includes(w.toLowerCase()));
    return idx !== -1 ? words.slice(idx + 1).join(' ') : null;
  };

  const extractSearchQuery = (text) => {
    const words = text.split(' ');
    const idx = words.findIndex((w) => ['pretraži', 'pretrazi', 'traži', 'trazi'].includes(w.toLowerCase()));
    return idx !== -1 ? words.slice(idx + 1).join(' ') : null;
  };

  const handleServiceSelection = (service) => {
    setShowServiceModal(false);
    if (!pendingAction) return;
    const { type, contact, message } = pendingAction;
    if (type === 'call') {
      ActionService?.makeCall?.(contact, service);
      const r = `Pozivam ${contact} preko ${service}`;
      addBotMessage(r);
      handleSpeak(r);
    } else if (type === 'sms') {
      ActionService?.sendSMS?.(contact, message, service);
      const r = `Šaljem poruku za ${contact} preko ${service}`;
      addBotMessage(r);
      handleSpeak(r);
    }
    setPendingAction(null);
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Djuka Asistent {assistantActive ? '🎤' : ''}</Text>
        <TouchableOpacity onPress={() => {
          setAssistantActive((s) => !s);
          addBotMessage(assistantActive ? 'Asistent deaktiviran.' : 'Asistent aktiviran.');
        }}>
          <Ionicons name="mic-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd?.()}
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" />
          <Text style={styles.typingText}>Djuka piše...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.micButton}
          onPress={() => (isListening ? stopListening() : startListening())}
        >
          <Ionicons name={isListening ? 'mic-off' : 'mic'} size={24} color="#007AFF" />
        </TouchableOpacity>

        <TextInput
          value={inputText}
          placeholder="Napiši poruku..."
          onChangeText={setInputText}
          style={styles.input}
          multiline
        />

        <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
          <Ionicons name="send" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Service selection modal */}
      <Modal visible={showServiceModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Izaberi servis</Text>

            <TouchableOpacity style={styles.serviceOption} onPress={() => handleServiceSelection('phone')}>
              <Text style={styles.serviceText}>Telefon</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceOption} onPress={() => handleServiceSelection('whatsapp')}>
              <Text style={styles.serviceText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceOption} onPress={() => handleServiceSelection('viber')}>
              <Text style={styles.serviceText}>Viber</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowServiceModal(false)}>
              <Text style={styles.cancelButtonText}>Otkaži</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 30 : 50,
    paddingBottom: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  messagesList: { paddingHorizontal: 15, paddingBottom: 20 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginVertical: 6 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#E5E5EA' },
  messageText: { fontSize: 16 },
  userText: { color: '#fff' },
  botText: { color: '#000' },
  typingContainer: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  typingText: { marginLeft: 8, color: '#8E8E93' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  micButton: { padding: 8 },
  input: { flex: 1, marginHorizontal: 8, maxHeight: 120, fontSize: 16 },
  sendButton: { padding: 8 },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  serviceOption: { padding: 14, backgroundColor: '#F2F2F7', borderRadius: 8, marginBottom: 10 },
  serviceText: { fontSize: 16, fontWeight: '600' },
  cancelButton: { padding: 12, borderRadius: 8, backgroundColor: '#FF3B30', marginTop: 8 },
  cancelButtonText: { color: '#fff', fontSize: 16, textAlign: 'center' },
});
