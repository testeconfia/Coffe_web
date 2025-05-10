import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface ButtonOption {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CoffeeModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'info' | 'warning';
  buttons?: ButtonOption[];
}

export const CoffeeModal: React.FC<CoffeeModalProps> = ({
  visible,
  message,
  onClose,
  type = 'info',
  buttons,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FFC107';
      default:
        return '#2196F3';
    }
  };

  const getButtonStyle = (style?: ButtonOption['style']) => {
    switch (style) {
      case 'destructive':
        return { backgroundColor: '#F44336' };
      case 'cancel':
        return { backgroundColor: '#9E9E9E' };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const handleButtonPress = (button: ButtonOption) => {
    button.onPress();
    onClose();
  };

  const renderButtons = () => {
    if (!buttons || buttons.length === 0) {
      return (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
      );
    }

    return buttons.map((button, index) => (
      <TouchableOpacity
        key={index}
        style={[styles.button, getButtonStyle(button.style)]}
        onPress={() => handleButtonPress(button)}
      >
        <Text style={styles.buttonText}>{button.text}</Text>
      </TouchableOpacity>
    ));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.iconContainer}>
            <Ionicons name={getIconName()} size={40} color={getIconColor()} />
          </View>
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
          <View style={styles.buttonContainer}>
            {renderButtons()}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Dimensions.get('window').width * 0.8,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Hook to use the modal
export const useCoffeeModal = () => {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [type, setType] = React.useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [buttons, setButtons] = React.useState<ButtonOption[] | undefined>(undefined);

  const showModal = (
    msg: string,
    modalType: 'success' | 'error' | 'info' | 'warning' = 'info',
    modalButtons?: ButtonOption[]
  ) => {
    setMessage(msg);
    setType(modalType);
    setButtons(modalButtons);
    setVisible(true);
  };

  const hideModal = () => {
    setVisible(false);
    setButtons(undefined);
  };

  return {
    visible,
    message,
    type,
    buttons,
    showModal,
    hideModal,
  };
}; 