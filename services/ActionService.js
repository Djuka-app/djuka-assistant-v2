import { Linking, Alert } from 'react-native';

class ActionService {
  makeCall(contact, service = 'phone') {
    const phoneNumber = this.getContactNumber(contact);
    
    let url;
    switch (service) {
      case 'phone':
        url = `tel:${phoneNumber}`;
        break;
      case 'whatsapp':
        url = `whatsapp://send?phone=${phoneNumber}`;
        break;
      case 'viber':
        url = `viber://contact?number=${phoneNumber}`;
        break;
      case 'telegram':
        url = `tg://resolve?phone=${phoneNumber}`;
        break;
      case 'messenger':
        url = `fb-messenger://user-thread/${phoneNumber}`;
        break;
      default:
        url = `tel:${phoneNumber}`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Greška', `Ne mogu da otvorim ${service}`);
        }
      })
      .catch((err) => console.error('Error opening URL:', err));
  }

  sendSMS(contact, message, service = 'sms') {
    const phoneNumber = this.getContactNumber(contact);
    
    let url;
    switch (service) {
      case 'sms':
        url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
        break;
      case 'whatsapp':
        url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
        break;
      case 'viber':
        url = `viber://forward?text=${encodeURIComponent(message)}`;
        break;
      case 'telegram':
        url = `tg://msg?text=${encodeURIComponent(message)}`;
        break;
      case 'messenger':
        url = `fb-messenger://share?link=${encodeURIComponent(message)}`;
        break;
      default:
        url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    }

    Linking.openURL(url).catch((err) => console.error('Error sending SMS:', err));
  }

  openMaps(destination) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    Linking.openURL(url).catch((err) => console.error('Error opening maps:', err));
  }

  searchWeb(query) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch((err) => console.error('Error searching web:', err));
  }

  openApp(appName) {
    let url;
    switch (appName) {
      case 'whatsapp':
        url = 'whatsapp://';
        break;
      case 'viber':
        url = 'viber://';
        break;
      case 'telegram':
        url = 'tg://';
        break;
      case 'messenger':
        url = 'fb-messenger://';
        break;
      default:
        Alert.alert('Greška', 'Nepoznata aplikacija');
        return;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Greška', `${appName} nije instaliran`);
        }
      })
      .catch((err) => console.error('Error opening app:', err));
  }

  getContactNumber(contact) {
    return contact;
  }
}

export default new ActionService();
