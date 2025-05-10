import { CoffeeModal, useCoffeeModal } from '@/components/CoffeeModal';
import React from 'react';

interface ButtonOption {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

let modalRef: {
  showModal: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    buttons?: ButtonOption[]
  ) => void;
  hideModal: () => void;
} | null = null;

export const setModalRef = (ref: typeof modalRef) => {
  modalRef = ref;
};

export const coffeeAlert = (
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  buttons?: ButtonOption[]
) => {
  if (modalRef) {
    modalRef.showModal(message, type, buttons);
  }
};

// Hook para usar no componente raiz da aplicação
export const useCoffeeAlertProvider = () => {
  const modal = useCoffeeModal();

  React.useEffect(() => {
    setModalRef({
      showModal: modal.showModal,
      hideModal: modal.hideModal,
    });

    return () => {
      setModalRef(null);
    };
  }, []);

  return modal;
}; 