import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
import GeminiService from './services/GeminiService';
import ActionService from './services/ActionService';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [assistantActive, setAssistantActive] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
  const flatListRef = useRef(null);
  const fabAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkOnboarding();
    loadMessages();
    GeminiService.initialize();
    
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const checkOnboarding = async () => {
    const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding) {
      setShowOnboarding(false);
    }
  };

  const loadMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const saveMessages = async (newMessages) => {
    try {
      await AsyncStorage.setItem('messages', JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const onSpeechStart = () => {
    console.log('Speech started');
  };

  const onSpeechEnd = () => {
    setIsListening(false);
  };

  const onSpeechResults = (event) => {
    const text = event.value[0];
    console.log('Speech results:', text);
    setInputText(text);
    handleSend(text);
  };

  const onSpeechError = (error) => {
    console.error('Speech error:', error);
    setIsListening(false);
    Alert.alert('Greška', 'Nisam mogao da čujem. Pokušaj ponovo.');
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      await Voice.start('sr-RS');
    } catch (error) {
      console.error('Error starting voice:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice:', error);
    }
  };

  const handleSpeak = (text) => {
    Speech.speak(text, {
      language: 'sr-RS',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const handleSend = async (text = inputText) => {
    if (!text.trim()) return;

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

    // Check if activating assistant
    if (text.toLowerCase().includes('gdje si djuka') || 
        text.toLowerCase().includes('gdje si đuka')) {
      setAssistantActive(true);
      const response = 'Tu sam! Kako mogu da ti pomognem?';
      addBotMessage(response);
      handleSpeak(response);
      return;
    }

    // Check if deactivating assistant
    if (text.toLowerCase().includes('hvala djuka') || 
        text.toLowerCase().includes('hvala đuka')) {
      setAssistantActive(false);
      const response = 'Nema na čemu! Pozovi me kad ti zatrebam.';
      addBotMessage(response);
      handleSpeak(response);
      return;
    }

    // Process command if assistant is active
    if (assistantActive) {
      await processCommand(text.trim());
    }
  };

  const processCommand = async (command) => {
    const lowerCommand = command.toLowerCase();

    // Call commands
    if (lowerCommand.includes('pozovi') || lowerCommand.includes('nazovi')) {
      const contact = extractContact(command);
      if (contact) {
        setPendingAction({ type: 'call', contact });
        setShowServiceModal(true);
      } else {
        const response = 'Koga želiš da pozoveš?';
        addBotMessage(response);
        handleSpeak(response);
      }
      return;
    }

    // SMS commands
    if (lowerCommand.includes('pošalji poruku') || lowerCommand.includes('posalji poruku')) {
      const contact = extractContact(command);
      const message = extractMessage(command);
      if (contact && message) {
        setPendingAction({ type: 'sms', contact, message });
        setShowServiceModal(true);
      } else {
        const response = 'Kome i šta želiš da pošalješ?';
        addBotMessage(response);
        handleSpeak(response);
      }
      return;
    }

    // Navigation commands
    if (lowerCommand.includes('navigiraj') || lowerCommand.includes('vodi me')) {
      const destination = extractDestination(command);
      if (destination) {
        ActionService.openMaps(destination);
        const response = `Otvaram Google Maps za ${destination}`;
        addBotMessage(response);
        handleSpeak(response);
      } else {
        const response = 'Gdje želiš da ideš?';
        addBotMessage(response);
        handleSpeak(response);
      }
      return;
    }

    // Web search commands
    if (lowerCommand.includes('pretraži') || lowerCommand.includes('traži')) {
      const query = extractSearchQuery(command);
      if (query) {
        ActionService.searchWeb(query);
        const response = `Pretražujem ${query}`;
        addBotMessage(response);
        handleSpeak(response);
      } else {
        const response = 'Šta želiš da pretražim?';
        addBotMessage(response);
        handleSpeak(response);
      }
      return;
    }

    // General question - use Gemini AI
    await handleQuestion(command);
  };

  const handleQuestion = async (question) => {
    setIsTyping(true);
    try {
      const response = await GeminiService.askQuestion(question);
      addBotMessage(response);
      handleSpeak(response);
    } catch (error) {
      console.error('Error asking Gemini:', error);
      const errorResponse = 'Izvini, imam problem sa odgovorom. Pokušaj ponovo.';
      addBotMessage(errorResponse);
      handleSpeak(errorResponse);
    } finally {
      setIsTyping(false);
    }
  };

  const handleServiceSelection = (service) => {
    setShowServiceModal(false);
    
    if (!pendingAction) return;

    const { type, contact, message } = pendingAction;

    if (type === 'call') {
      ActionService.makeCall(contact, service);
      const response = `Pozivam ${contact} preko ${service}`;
      addBotMessage(response);
      handleSpeak(response);
    } else if (type === 'sms') {
      ActionService.sendSMS(contact, message, service);
      const response = `Šaljem poruku za ${contact} preko ${service}`;
      addBotMessage(response);
      handleSpeak(response);
    }

    setPendingAction(null);
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
  };

  const extractContact = (text) => {
    const words = text.split(' ');
    const contactIndex = words.findIndex(w => 
      w.toLowerCase() === 'pozovi' || 
      w.toLowerCase() === 'nazovi' ||
      w.toLowerCase() === 'poruku'
    );
    return contactIndex !== -1 && words[contactIndex + 1] 
      ? words[contactIndex + 1] 
      : null;
  };

  const extractMessage = (text) => {
    const match = text.match(/poruku\s+(.+?)\s+da\s+(.+)/i);
    return match ? match[2] : null;
  };

  const extractDestination = (text) => {
    const words = text.split(' ');
    const navIndex = words.findIndex(w => 
      w.toLowerCase() === 'navigiraj' || 
      w.toLowerCase() === 'vodi'
    );
    return navIndex !== -1 
      ? words.slice(navIndex + 1).join(' ') 
      : null;
  };

  const extractSearchQuery = (text) => {
    const words = text.split(' ');
    const searchIndex = words.findIndex(w => 
      w.toLowerCase() === 'pretraži' || 
      w.toLowerCase() === 'traži'
    );
    return searchIndex !== -1 
      ? words.slice(searchIndex + 1).join(' ') 
      : null;
  };

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnimation, {
      toValue,
      useNativeDriver: true,
    }).start();
    setFabOpen(!fabOpen);
  };

  const renderOnboarding = () => {
    const steps = [
      {
        title: 'Dobrodošao u Djuka Asistent',
        description: 'Tvoj lični AI asistent za svakodnevne zadatke',
        icon: 'rocket-outline',
      },
      {
        title: 'Glasovne komande',
        description: 'Koristi glas za pozive, poruke i navigaciju',
        icon: 'mic-outline',
      },
      {
        title: 'Pametna pomoć',
        description: 'Postavljaj pitanja i dobij odgovore',
        icon: 'bulb-outline',
      },
    ];

    const currentStep = steps[onboardingStep];

    return (
      <View style={styles.onboardingContainer}>
        <Ionicons name={currentStep.icon} size={100} color="#007AFF" />
        <Text style={styles.onboardingTitle}>{currentStep.title}</Text>
        <Text style={styles.onboardingDescription}>{currentStep.description}</Text>
        
        <View style={styles.onboardingButtons}>
          {onboardingStep < steps.length - 1 ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setOnboardingStep(onboardingStep + 1)}
            >
              <Text style={styles.nextButtonText}>Dalje</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={completeOnboarding}
            >
              <Text style={styles.nextButtonText}>Počni</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.pagination}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === onboardingStep && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.sender === 'user' ? styles.userText : styles.botText,
        ]}
      >
        {item.text}
      </Text>
    </View>
  );

  if (showOnboarding) {
    return renderOnboarding();
  }

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Djuka Asistent {assistantActive && '🎤'}
        </Text>
        <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)}>
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Typing indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.typingText}>Djuka piše...</Text>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
          <TouchableOpacity
            style={styles.micButton}
            onPress={isListening ? stopListening : startListening}
          >
            <Ionicons
              name={isListening ? 'stop-circle' : 'mic'}
              size={24}
              color={isListening ? '#FF3B30' : '#007AFF'}
            />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Napiši poruku..."
            placeholderTextColor={theme.placeholder}
            multiline
          />

          <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
            <Ionicons name="send" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        {fabOpen && (
          <>
            <TouchableOpacity
              style={[styles.fabOption, { backgroundColor: '#34C759' }]}
              onPress={() => {
                ActionService.makeCall('', 'phone');
                toggleFab();
              }}
            >
              <Ionicons name="call" size={24} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fabOption, { backgroundColor: '#25D366' }]}
              onPress={() => {
                ActionService.openApp('whatsapp');
                toggleFab();
              }}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fabOption, { backgroundColor: '#7360F2' }]}
              onPress={() => {
                ActionService.openApp('viber');
                toggleFab();
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#FFF" />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#007AFF' }]}
          onPress={toggleFab}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: fabAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="add" size={32} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Service Selection Modal */}
      <Modal
        visible={showServiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Izaberi servis</Text>
            
            <TouchableOpacity
              style={styles.serviceOption}
              onPress={() => handleServiceSelection('phone')}
            >
              <Ionicons name="call" size={24} color="#34C759" />
              <Text style={styles.serviceText}>Telefon</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceOption}
              onPress={() => handleServiceSelection('whatsapp')}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.serviceText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceOption}
              onPress={() => handleServiceSelection('viber')}
            >
              <Ionicons name="chatbubbles" size={24} color="#7360F2" />
              <Text style={styles.serviceText}>Viber</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceOption}
              onPress={() => handleServiceSelection('telegram')}
            >
              <Ionicons name="paper-plane" size={24} color="#0088CC" />
              <Text style={styles.serviceText}>Telegram</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceOption}
              onPress={() => handleServiceSelection('messenger')}
            >
              <Ionicons name="chatbox" size={24} color="#0084FF" />
              <Text style={styles.serviceText}>Messenger</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowServiceModal(false)}
            >
              <Text style={styles.cancelButtonText}>Otkaži</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const lightTheme = {
  background: '#F2F2F7',
  headerBg: '#FFFFFF',
  text: '#000000',
  inputBg: '#FFFFFF',
  placeholder: '#8E8E93',
};

const darkTheme = {
  background: '#000000',
  headerBg: '#1C1C1E',
  text: '#FFFFFF',
  inputBg: '#1C1C1E',
  placeholder: '#8E8E93',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginVertical: 5,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#000000',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  typingText: {
    marginLeft: 10,
    color: '#8E8E93',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  micButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    marginBottom: 10,
  },
  serviceText: {
    fontSize: 18,
    marginLeft: 15,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 15,
    textAlign: 'center',
  },
  onboardingDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 40,
  },
  onboardingButtons: {
    width: '100%',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    marginTop: 30,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 5,
  },
  paginationDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
});
